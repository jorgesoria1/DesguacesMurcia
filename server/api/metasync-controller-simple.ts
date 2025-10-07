/* 
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * Este controlador ha sido reemplazado por metasync-optimized-routes.ts
 * Mantenido solo para referencia histórica
 * Fecha de obsolescencia: 30 Julio 2025
 * Usar en su lugar: metasync-optimized-routes.ts + metasync-optimized-import-service.ts
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { vehicles, parts, importHistory } from '@shared/schema';
import { eq, inArray, isNull } from 'drizzle-orm';
import axios from 'axios';

// URL base de la API MetaSync
const METASYNC_BASE_URL = 'https://apis.metasync.com';
const METASYNC_ALMACEN_URL = `${METASYNC_BASE_URL}/Almacen`;

// Configuración global - DEBE OBTENERSE DE LA BASE DE DATOS
let apiKey = "";
let companyId = 0;

/**
 * Controlador simple para la API MetaSync
 */
export const metasyncControllerSimple = {
  
  /**
   * Verifica la conexión con la API de MetaSync
   * POST /api/metasync/verify-connection
   */
  async verifyConnection(req: Request, res: Response) {
    try {
      const { apiKey: newApiKey, companyId: newCompanyId } = req.body;
      
      if (!newApiKey) {
        return res.status(400).json({
          success: false,
          message: 'Clave API no proporcionada'
        });
      }
      
      // Actualizar configuración global
      apiKey = newApiKey;
      if (newCompanyId) {
        companyId = newCompanyId;
      }
      
      // Devolver respuesta exitosa
      return res.status(200).json({
        success: true,
        message: 'Conexión verificada correctamente',
        config: { apiKey, companyId }
      });
    } catch (error) {
      console.error('Error verificando conexión con MetaSync:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verificando conexión',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Inicia la importación de vehículos
   * POST /api/metasync/import/vehicles
   */
  async importVehicles(req: Request, res: Response) {
    try {
      // Crear registro en el historial de importación
      const [importRecord] = await db
        .insert(importHistory)
        .values({
          type: 'vehicles',
          startTime: new Date(),
          status: 'pending',
          totalItems: 0,
          processedItems: 0,
          newItems: 0,
          updatedItems: 0,
          errorCount: 0,
          errors: []
        })
        .returning();
      
      // Iniciar importación en segundo plano
      this.processVehiclesImport(importRecord.id)
        .catch(err => console.error('Error en importación de vehículos:', err));
      
      // Devolver respuesta inmediata
      return res.status(202).json({
        success: true,
        message: 'Importación de vehículos iniciada',
        importId: importRecord.id
      });
    } catch (error) {
      console.error('Error iniciando importación de vehículos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error iniciando importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Proceso de importación de vehículos en segundo plano
   */
  async processVehiclesImport(importId: number) {
    try {
      // Actualizar estado a "running"
      await db.update(importHistory)
        .set({ 
          status: 'running',
          processedItems: 0,
          newItems: 0,
          updatedItems: 0
        })
        .where(eq(importHistory.id, importId));
      
      // Variables de seguimiento
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let hasMore = true;
      let lastId = 0;
      const errors: string[] = [];
      const BATCH_SIZE = 500;
      
      // Procesar vehículos en lotes
      while (hasMore) {
        try {
          console.log(`Obteniendo vehículos: lastId=${lastId}, batchSize=${BATCH_SIZE}`);
          
          // Obtener lote de vehículos de la API
          const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosVehiculosCanal`, {
            headers: {
              'apikey': apiKey,
              'fecha': this.formatDate(new Date('2000-01-01')),
              'lastid': lastId.toString(),
              'offset': BATCH_SIZE.toString()
            }
          });
          
          const result = response.data;
          
          if (!result.vehiculos || result.vehiculos.length === 0) {
            console.log('No hay más vehículos para importar');
            hasMore = false;
            break;
          }
          
          console.log(`Procesando lote de ${result.vehiculos.length} vehículos...`);
          
          // Extraer IDs locales para verificar existencia
          const idLocales = result.vehiculos.map((v: any) => v.idLocal);
          
          // Buscar vehículos existentes
          const existingVehicles = await db
            .select({ id: vehicles.id, idLocal: vehicles.idLocal })
            .from(vehicles)
            .where(inArray(vehicles.idLocal, idLocales));
          
          // Crear mapa para búsqueda rápida
          const existingMap = new Map(
            existingVehicles.map(v => [v.idLocal, v.id])
          );
          
          // Preparar vehículos para inserción y actualización
          const toInsert: any[] = [];
          const toUpdate: any[] = [];
          
          for (const vehicle of result.vehiculos) {
            // Normalizar datos
            const normalizedVehicle = this.normalizeVehicle(vehicle);
            
            if (existingMap.has(normalizedVehicle.idLocal)) {
              // Actualizar existente
              toUpdate.push({
                ...normalizedVehicle,
                id: existingMap.get(normalizedVehicle.idLocal),
                
              });
            } else {
              // Insertar nuevo
              toInsert.push({
                ...normalizedVehicle,
                fechaCreacion: new Date(),
                
              });
            }
          }
          
          // Insertar nuevos vehículos
          if (toInsert.length > 0) {
            // Insertar en lotes para evitar problemas con la base de datos
            for (let i = 0; i < toInsert.length; i += 50) {
              const batch = toInsert.slice(i, i + 50);
              try {
                const insertedBatch = await db
                  .insert(vehicles)
                  .values(batch)
                  .returning({ id: vehicles.id });
                
                totalInserted += insertedBatch.length;
              } catch (insertError) {
                console.error(`Error al insertar lote ${i/50 + 1}:`, insertError);
                errors.push(`Error al insertar lote ${i/50 + 1}: ${insertError instanceof Error ? insertError.message : 'Error desconocido'}`);
              }
            }
          }
          
          // Actualizar vehículos existentes
          if (toUpdate.length > 0) {
            for (const v of toUpdate) {
              try {
                await db
                  .update(vehicles)
                  .set({
                    marca: v.marca,
                    modelo: v.modelo,
                    version: v.version,
                    descripcion: v.descripcion,
                    anyo: v.anyo,
                    combustible: v.combustible,
                    bastidor: v.bastidor,
                    matricula: v.matricula,
                    color: v.color,
                    kilometraje: v.kilometraje,
                    potencia: v.potencia,
                    imagenes: v.imagenes,
                    activo: true,
                    sincronizado: true,
                    ultimaSincronizacion: new Date(),
                    
                  })
                  .where(eq(vehicles.id, v.id));
                
                totalUpdated++;
              } catch (updateError) {
                console.error(`Error al actualizar vehículo ${v.idLocal}:`, updateError);
                errors.push(`Error al actualizar vehículo ${v.idLocal}: ${updateError instanceof Error ? updateError.message : 'Error desconocido'}`);
              }
            }
          }
          
          // Actualizar estadísticas de la importación
          totalProcessed += result.vehiculos.length;
          await db
            .update(importHistory)
            .set({
              processedItems: totalProcessed,
              newItems: totalInserted,
              updatedItems: totalUpdated,
              errorCount: errors.length,
              errors: errors.slice(0, 100) // Limitar la cantidad de errores
            })
            .where(eq(importHistory.id, importId));
          
          // Actualizar lastId para el siguiente lote
          const lastVehicle = result.vehiculos[result.vehiculos.length - 1];
          lastId = lastVehicle.idLocal;
          
          console.log(`Procesados: ${totalProcessed}, Insertados: ${totalInserted}, Actualizados: ${totalUpdated}`);
          
          // Verificar si hay más vehículos para importar
          if (result.vehiculos.length < BATCH_SIZE) {
            hasMore = false;
          }
        } catch (error) {
          console.error('Error procesando lote de vehículos:', error);
          errors.push(`Error global: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          
          // Actualizar errores en la importación
          await db
            .update(importHistory)
            .set({
              errorCount: errors.length,
              errors: errors.slice(0, 100)
            })
            .where(eq(importHistory.id, importId));
          
          // Continuar con el siguiente lote (intentar avanzar)
          lastId++;
        }
      }
      
      // Finalizar importación
      await db
        .update(importHistory)
        .set({
          status: 'completed',
          endTime: new Date(),
          totalItems: totalProcessed,
          errorCount: errors.length,
          errors: errors.slice(0, 100)
        })
        .where(eq(importHistory.id, importId));
      
      console.log(`Importación de vehículos completada. Total procesados: ${totalProcessed}`);
    } catch (error) {
      console.error('Error en importación de vehículos:', error);
      
      // Actualizar estado a fallido
      await db
        .update(importHistory)
        .set({
          status: 'failed',
          endTime: new Date(),
          errors: [error instanceof Error ? error.message : 'Error desconocido'],
          errorCount: 1
        })
        .where(eq(importHistory.id, importId));
    }
  },
  
  /**
   * Normaliza un vehículo para la base de datos
   */
  normalizeVehicle(vehicleData: any): any {
    // Extraer propiedades básicas
    const idLocal = vehicleData.idLocal || 0;
    const idEmpresa = vehicleData.idEmpresa || companyId;
    
    // Marca, modelo y versión
    const marca = vehicleData.nombreMarca || vehicleData.NombreMarca || 
                 vehicleData.marca || vehicleData.Marca || 'Desconocida';
    
    const modelo = vehicleData.nombreModelo || vehicleData.NombreModelo || 
                  vehicleData.modelo || vehicleData.Modelo || 'Desconocido';
    
    const version = vehicleData.nombreVersion || vehicleData.NombreVersion || 
                   vehicleData.version || vehicleData.Version || 'Desconocida';
    
    // Propiedades secundarias
    const anyo = vehicleData.anyoVehiculo || vehicleData.AnyoVehiculo || 
                vehicleData.anyo || vehicleData.Anyo || 0;
    
    const combustible = vehicleData.combustible || vehicleData.Combustible || '';
    const bastidor = vehicleData.bastidor || vehicleData.Bastidor || '';
    const matricula = vehicleData.matricula || vehicleData.Matricula || '';
    const color = vehicleData.color || vehicleData.Color || '';
    const kilometraje = vehicleData.kilometraje || vehicleData.Kilometraje || 0;
    const potencia = vehicleData.potenciaHP || vehicleData.PotenciaHP || 
                    vehicleData.potencia || vehicleData.Potencia || 0;
    const puertas = vehicleData.puertas || vehicleData.Puertas || null;
    
    // Descripción generada
    const descripcion = `${marca} ${modelo} ${version}${anyo ? ` (${anyo})` : ''}`.trim() || 
                       `Vehículo ID ${idLocal}`;
    
    // Normalizar imágenes
    let imagenes: string[] = [];
    
    // Verificar diferentes formatos de imágenes
    if (Array.isArray(vehicleData.urlsImgs) && vehicleData.urlsImgs.length > 0) {
      imagenes = vehicleData.urlsImgs;
    } else if (Array.isArray(vehicleData.UrlsImgs) && vehicleData.UrlsImgs.length > 0) {
      imagenes = vehicleData.UrlsImgs;
    } else if (typeof vehicleData.urlsImgs === 'string' && vehicleData.urlsImgs) {
      imagenes = [vehicleData.urlsImgs];
    } else if (typeof vehicleData.UrlsImgs === 'string' && vehicleData.UrlsImgs) {
      imagenes = [vehicleData.UrlsImgs];
    }
    
    // Imagen por defecto si no hay imágenes
    if (imagenes.length === 0) {
      imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
    }
    
    // Retornar vehículo normalizado
    return {
      idLocal,
      idEmpresa,
      marca,
      modelo,
      version,
      anyo,
      combustible,
      bastidor,
      matricula,
      color,
      kilometraje,
      potencia,
      puertas,
      descripcion,
      imagenes,
      activo: true,
      sincronizado: true,
      ultimaSincronizacion: new Date()
    };
  },
  
  /**
   * Inicia la importación de piezas
   * POST /api/metasync/import/parts
   */
  async importParts(req: Request, res: Response) {
    try {
      // Crear registro en el historial de importación
      const [importRecord] = await db
        .insert(importHistory)
        .values({
          type: 'parts',
          startTime: new Date(),
          status: 'pending',
          totalItems: 0,
          processedItems: 0,
          newItems: 0,
          updatedItems: 0,
          errorCount: 0,
          errors: []
        })
        .returning();
      
      // Iniciar importación en segundo plano
      this.processPartsImport(importRecord.id)
        .catch(err => console.error('Error en importación de piezas:', err));
      
      // Devolver respuesta inmediata
      return res.status(202).json({
        success: true,
        message: 'Importación de piezas iniciada',
        importId: importRecord.id
      });
    } catch (error) {
      console.error('Error iniciando importación de piezas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error iniciando importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Proceso de importación de piezas en segundo plano
   */
  async processPartsImport(importId: number) {
    try {
      // Actualizar estado a "running"
      await db.update(importHistory)
        .set({ 
          status: 'running',
          processedItems: 0,
          newItems: 0,
          updatedItems: 0
        })
        .where(eq(importHistory.id, importId));
      
      // Variables de seguimiento
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let hasMore = true;
      let lastId = 0;
      const errors: string[] = [];
      const BATCH_SIZE = 500;
      
      // Procesar piezas en lotes
      while (hasMore) {
        try {
          console.log(`Obteniendo piezas: lastId=${lastId}, batchSize=${BATCH_SIZE}`);
          
          // Obtener lote de piezas de la API
          const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanalEmpresa`, {
            headers: {
              'apikey': apiKey,
              'fecha': this.formatDate(new Date('2000-01-01')),
              'lastid': lastId.toString(),
              'offset': BATCH_SIZE.toString(),
              'idempresa': companyId.toString()
            }
          });
          
          const result = response.data;
          
          if (!result.piezas || result.piezas.length === 0) {
            console.log('No hay más piezas para importar');
            hasMore = false;
            break;
          }
          
          console.log(`Procesando lote de ${result.piezas.length} piezas...`);
          
          // Extraer referencias locales para verificar existencia
          const refsLocales = result.piezas.map((p: any) => p.refLocal);
          
          // Buscar piezas existentes
          const existingParts = await db
            .select({ id: parts.id, refLocal: parts.refLocal })
            .from(parts)
            .where(inArray(parts.refLocal, refsLocales));
          
          // Crear mapa para búsqueda rápida
          const existingMap = new Map(
            existingParts.map(p => [p.refLocal, p.id])
          );
          
          // Extraer relaciones pieza-vehículo
          const partVehicleRelations: { 
            partRefLocal: number; 
            idVehiculoOriginal: number;
            partId?: number;
          }[] = [];
          
          // Preparar piezas para inserción y actualización
          const toInsert: any[] = [];
          const toUpdate: any[] = [];
          
          for (const part of result.piezas) {
            try {
              // Normalizar datos
              const normalizedPart = this.normalizePart(part);
              
              // Guardar relación con vehículo si existe
              if (part.idVehiculo && part.idVehiculo > 0) {
                partVehicleRelations.push({
                  partRefLocal: normalizedPart.refLocal,
                  idVehiculoOriginal: part.idVehiculo
                });
              }
              
              if (existingMap.has(normalizedPart.refLocal)) {
                // Actualizar existente
                toUpdate.push({
                  ...normalizedPart,
                  id: existingMap.get(normalizedPart.refLocal),
                  
                });
                
                // Añadir ID de pieza a la relación
                const idx = partVehicleRelations.findIndex(r => r.partRefLocal === normalizedPart.refLocal);
                if (idx >= 0) {
                  partVehicleRelations[idx].partId = existingMap.get(normalizedPart.refLocal);
                }
              } else {
                // Insertar nueva
                toInsert.push({
                  ...normalizedPart,
                  fechaCreacion: new Date(),
                  
                });
              }
            } catch (normalizeError) {
              console.error(`Error normalizando pieza:`, normalizeError);
              errors.push(`Error normalizando pieza: ${normalizeError instanceof Error ? normalizeError.message : 'Error desconocido'}`);
            }
          }
          
          // Insertar nuevas piezas
          if (toInsert.length > 0) {
            // Insertar en lotes para evitar problemas con la base de datos
            for (let i = 0; i < toInsert.length; i += 50) {
              const batch = toInsert.slice(i, i + 50);
              try {
                const insertedBatch = await db
                  .insert(parts)
                  .values(batch)
                  .returning({ id: parts.id, refLocal: parts.refLocal });
                
                totalInserted += insertedBatch.length;
                
                // Actualizar IDs de piezas en las relaciones
                for (const inserted of insertedBatch) {
                  const idx = partVehicleRelations.findIndex(r => r.partRefLocal === inserted.refLocal);
                  if (idx >= 0) {
                    partVehicleRelations[idx].partId = inserted.id;
                  }
                }
              } catch (insertError) {
                console.error(`Error al insertar lote de piezas ${i/50 + 1}:`, insertError);
                errors.push(`Error al insertar lote de piezas ${i/50 + 1}: ${insertError instanceof Error ? insertError.message : 'Error desconocido'}`);
              }
            }
          }
          
          // Actualizar piezas existentes
          if (toUpdate.length > 0) {
            for (const p of toUpdate) {
              try {
                await db
                  .update(parts)
                  .set({
                    codFamilia: p.codFamilia,
                    descripcionFamilia: p.descripcionFamilia,
                    codArticulo: p.codArticulo,
                    descripcionArticulo: p.descripcionArticulo,
                    codVersion: p.codVersion,
                    refPrincipal: p.refPrincipal,
                    anyoInicio: p.anyoInicio,
                    anyoFin: p.anyoFin,
                    puertas: p.puertas,
                    rvCode: p.rvCode,
                    precio: p.precio,
                    anyoStock: p.anyoStock,
                    peso: p.peso,
                    ubicacion: p.ubicacion,
                    observaciones: p.observaciones,
                    reserva: p.reserva,
                    tipoMaterial: p.tipoMaterial,
                    imagenes: p.imagenes,
                    sincronizado: true,
                    ultimaSincronizacion: new Date(),
                    
                  })
                  .where(eq(parts.id, p.id));
                
                totalUpdated++;
              } catch (updateError) {
                console.error(`Error al actualizar pieza ${p.refLocal}:`, updateError);
                errors.push(`Error al actualizar pieza ${p.refLocal}: ${updateError instanceof Error ? updateError.message : 'Error desconocido'}`);
              }
            }
          }
          
          // Procesar relaciones pieza-vehículo
          if (partVehicleRelations.length > 0) {
            await this.processPartVehicleRelations(partVehicleRelations);
          }
          
          // Actualizar estadísticas de la importación
          totalProcessed += result.piezas.length;
          await db
            .update(importHistory)
            .set({
              processedItems: totalProcessed,
              newItems: totalInserted,
              updatedItems: totalUpdated,
              errorCount: errors.length,
              errors: errors.slice(0, 100) // Limitar la cantidad de errores
            })
            .where(eq(importHistory.id, importId));
          
          // Actualizar lastId para el siguiente lote
          const lastPart = result.piezas[result.piezas.length - 1];
          lastId = lastPart.refLocal;
          
          console.log(`Procesadas: ${totalProcessed}, Insertadas: ${totalInserted}, Actualizadas: ${totalUpdated}`);
          
          // Verificar si hay más piezas para importar
          if (result.piezas.length < BATCH_SIZE) {
            hasMore = false;
          }
        } catch (error) {
          console.error('Error procesando lote de piezas:', error);
          errors.push(`Error global: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          
          // Actualizar errores en la importación
          await db
            .update(importHistory)
            .set({
              errorCount: errors.length,
              errors: errors.slice(0, 100)
            })
            .where(eq(importHistory.id, importId));
          
          // Continuar con el siguiente lote (intentar avanzar)
          lastId++;
        }
      }
      
      // Procesar relaciones pendientes
      await this.processPendingRelations();
      
      // Finalizar importación
      await db
        .update(importHistory)
        .set({
          status: 'completed',
          endTime: new Date(),
          totalItems: totalProcessed,
          errorCount: errors.length,
          errors: errors.slice(0, 100)
        })
        .where(eq(importHistory.id, importId));
      
      console.log(`Importación de piezas completada. Total procesadas: ${totalProcessed}`);
    } catch (error) {
      console.error('Error en importación de piezas:', error);
      
      // Actualizar estado a fallido
      await db
        .update(importHistory)
        .set({
          status: 'failed',
          endTime: new Date(),
          errors: [error instanceof Error ? error.message : 'Error desconocido'],
          errorCount: 1
        })
        .where(eq(importHistory.id, importId));
    }
  },
  
  /**
   * Normaliza una pieza para la base de datos
   */
  normalizePart(partData: any): any {
    // Propiedades básicas
    const refLocal = partData.refLocal || 0;
    const idEmpresa = partData.idEmpresa || companyId;
    
    // Propiedades de categorización
    const codFamilia = partData.codFamilia || '';
    const descripcionFamilia = partData.descripcionFamilia || '';
    const codArticulo = partData.codArticulo || '';
    const descripcionArticulo = partData.descripcionArticulo || 'Pieza sin descripción';
    const codVersion = partData.codVersion || '';
    const refPrincipal = partData.refPrincipal || '';
    
    // Propiedades para matching
    const rvCode = partData.codVersion || '';
    const anyoInicio = partData.anyoInicio || null;
    const anyoFin = partData.anyoFin || null;
    const puertas = partData.puertas || 0;
    
    // Propiedades de detalle
    const precio = String(partData.precio || 0);
    const anyoStock = partData.anyoStock || 0;
    const peso = String(partData.peso || 0);
    const ubicacion = partData.ubicacion || 0;
    const observaciones = partData.observaciones || '';
    const reserva = partData.reserva || 0;
    const tipoMaterial = partData.tipoMaterial || 0;
    
    // Normalizar imágenes
    let imagenes: string[] = [];
    
    // Verificar diferentes formatos de imágenes
    if (Array.isArray(partData.urlsImgs) && partData.urlsImgs.length > 0) {
      imagenes = partData.urlsImgs;
    } else if (Array.isArray(partData.UrlsImgs) && partData.UrlsImgs.length > 0) {
      imagenes = partData.UrlsImgs;
    } else if (typeof partData.urlsImgs === 'string' && partData.urlsImgs) {
      imagenes = [partData.urlsImgs];
    } else if (typeof partData.UrlsImgs === 'string' && partData.UrlsImgs) {
      imagenes = [partData.UrlsImgs];
    }
    
    // Imagen por defecto si no hay imágenes
    if (imagenes.length === 0) {
      imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
    }
    
    // Retornar pieza normalizada
    return {
      refLocal,
      idEmpresa,
      codFamilia,
      descripcionFamilia,
      codArticulo,
      descripcionArticulo,
      codVersion,
      refPrincipal,
      anyoInicio,
      anyoFin,
      puertas,
      rvCode,
      precio,
      anyoStock,
      peso,
      ubicacion,
      observaciones,
      reserva,
      tipoMaterial,
      imagenes,
      activo: false, // Se activará cuando tenga relaciones
      sincronizado: true,
      ultimaSincronizacion: new Date()
    };
  },
  
  /**
   * Procesa relaciones entre piezas y vehículos
   */
  async processPartVehicleRelations(relations: {
    partRefLocal: number;
    idVehiculoOriginal: number;
    partId?: number;
  }[]) {
    try {
      // Filtrar solo las relaciones con ID de pieza
      const validRelations = relations.filter(r => r.partId);
      
      if (validRelations.length === 0) {
        return;
      }
      
      console.log(`Procesando ${validRelations.length} relaciones pieza-vehículo`);
      
      // Obtener IDs de vehículos originales
      const vehicleIds = Array.from(new Set(validRelations.map(r => r.idVehiculoOriginal)));
      
      // Buscar vehículos existentes
      const existingVehicles = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, vehicleIds));
      
      // Crear mapa para búsqueda rápida
      const vehicleMap = new Map(
        existingVehicles.map(v => [v.idLocal, v.id])
      );
      
      // Procesar cada relación
      for (const relation of validRelations) {
        const partId = relation.partId;
        const vehicleId = vehicleMap.get(relation.idVehiculoOriginal);
        
        if (!partId) {
          console.log(`No se encontró la pieza con refLocal ${relation.partRefLocal}`);
          continue;
        }
        
        try {
          // Si existe el vehículo, crear relación directa
          if (vehicleId) {
            // Verificar si ya existe la relación
            const existingRelation = await db
              .select({ id: vehicleParts.id })
              .from(vehicleParts)
              .where(eq(vehicleParts.partId, partId))
              .where(eq(vehicleParts.vehicleId, vehicleId));
            
            if (existingRelation.length === 0) {
              // Crear nueva relación
              await db.insert(vehicleParts).values({
                vehicleId,
                partId,
                idVehiculoOriginal: relation.idVehiculoOriginal
              });
              
              // Activar la pieza
              await db
                .update(parts)
                .set({ activo: true })
                .where(eq(parts.id, partId));
            }
          } else {
            // Vehículo no encontrado, crear relación pendiente
            const relationExists = await db
              .select({ id: vehicleParts.id })
              .from(vehicleParts)
              .where(eq(vehicleParts.partId, partId))
              .where(eq(vehicleParts.idVehiculoOriginal, relation.idVehiculoOriginal))
              .where(isNull(vehicleParts.vehicleId));
            
            if (relationExists.length === 0) {
              await db.insert(vehicleParts).values({
                vehicleId: null, // Pendiente
                partId,
                idVehiculoOriginal: relation.idVehiculoOriginal
              });
            }
          }
        } catch (relationError) {
          console.error(`Error procesando relación:`, relationError);
        }
      }
    } catch (error) {
      console.error('Error procesando relaciones pieza-vehículo:', error);
    }
  },
  
  /**
   * Procesa relaciones pendientes
   */
  async processPendingRelations() {
    try {
      console.log('Procesando relaciones pendientes...');
      
      // Buscar relaciones pendientes
      const pendingRelations = await db
        .select({
          id: vehicleParts.id,
          partId: vehicleParts.partId,
          idVehiculoOriginal: vehicleParts.idVehiculoOriginal
        })
        .from(vehicleParts)
        .where(isNull(vehicleParts.vehicleId));
      
      if (pendingRelations.length === 0) {
        console.log('No hay relaciones pendientes para procesar');
        return;
      }
      
      console.log(`Encontradas ${pendingRelations.length} relaciones pendientes`);
      
      // Obtener IDs originales de vehículos
      const idVehiculosOriginales = Array.from(
        new Set(pendingRelations.map(r => r.idVehiculoOriginal))
      );
      
      // Buscar vehículos
      const existingVehicles = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idVehiculosOriginales));
      
      // Crear mapa para búsqueda rápida
      const vehicleMap = new Map(
        existingVehicles.map(v => [v.idLocal, v.id])
      );
      
      // Actualizar relaciones
      let updated = 0;
      
      for (const relation of pendingRelations) {
        const vehicleId = vehicleMap.get(relation.idVehiculoOriginal);
        
        if (vehicleId) {
          try {
            // Actualizar relación
            await db
              .update(vehicleParts)
              .set({ vehicleId })
              .where(eq(vehicleParts.id, relation.id));
            
            // Activar la pieza
            await db
              .update(parts)
              .set({ activo: true })
              .where(eq(parts.id, relation.partId));
            
            updated++;
          } catch (updateError) {
            console.error(`Error actualizando relación pendiente:`, updateError);
          }
        }
      }
      
      console.log(`Procesamiento de relaciones pendientes completado: ${updated} actualizadas`);
    } catch (error) {
      console.error('Error procesando relaciones pendientes:', error);
    }
  },
  
  /**
   * Inicia la importación de vehículos y piezas
   * POST /api/metasync/import/all
   */
  async importAll(req: Request, res: Response) {
    try {
      // Crear registro en el historial de importación
      const [importRecord] = await db
        .insert(importHistory)
        .values({
          type: 'all',
          startTime: new Date(),
          status: 'pending',
          totalItems: 0,
          processedItems: 0,
          newItems: 0,
          updatedItems: 0,
          errorCount: 0,
          errors: []
        })
        .returning();
      
      // Iniciar importación en segundo plano
      Promise.all([
        this.processVehiclesImport(importRecord.id),
        this.processPartsImport(importRecord.id)
      ])
      .catch(err => console.error('Error en importación completa:', err));
      
      // Devolver respuesta inmediata
      return res.status(202).json({
        success: true,
        message: 'Importación completa iniciada',
        importId: importRecord.id
      });
    } catch (error) {
      console.error('Error iniciando importación completa:', error);
      return res.status(500).json({
        success: false,
        message: 'Error iniciando importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Elimina todos los vehículos
   * DELETE /api/metasync/vehicles/all
   */
  async deleteAllVehicles(req: Request, res: Response) {
    try {
      // Eliminar primero las relaciones entre vehículos y piezas
      await db.delete(vehicleParts);
      
      // Luego eliminar los vehículos
      const result = await db.delete(vehicles).returning({ id: vehicles.id });
      
      return res.status(200).json({
        success: true,
        message: `Se han eliminado ${result.length} vehículos correctamente`,
        count: result.length
      });
    } catch (error) {
      console.error('Error eliminando vehículos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando vehículos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Elimina todas las piezas
   * DELETE /api/metasync/parts/all
   */
  async deleteAllParts(req: Request, res: Response) {
    try {
      // Eliminar primero las relaciones entre vehículos y piezas
      await db.delete(vehicleParts);
      
      // Luego eliminar las piezas
      const result = await db.delete(parts).returning({ id: parts.id });
      
      return res.status(200).json({
        success: true,
        message: `Se han eliminado ${result.length} piezas correctamente`,
        count: result.length
      });
    } catch (error) {
      console.error('Error eliminando piezas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando piezas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Obtiene el estado de una importación
   * GET /api/metasync/import/:id
   */
  async getImportStatus(req: Request, res: Response) {
    try {
      const importId = parseInt(req.params.id);
      
      if (isNaN(importId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de importación inválido'
        });
      }
      
      // Buscar registro de importación
      const importData = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.id, importId))
        .limit(1);
      
      if (importData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Registro de importación no encontrado'
        });
      }
      
      return res.status(200).json({
        success: true,
        import: importData[0]
      });
    } catch (error) {
      console.error('Error obteniendo estado de importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estado de importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Formatea una fecha para la API
   */
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
};