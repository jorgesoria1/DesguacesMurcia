/* 
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * Este controlador ha sido reemplazado por metasync-optimized-routes.ts
 * Mantenido solo para referencia histórica
 * Fecha de obsolescencia: 30 Julio 2025
 * Usar en su lugar: metasync-optimized-routes.ts + metasync-optimized-import-service.ts
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { apiConfig, importHistory, parts, vehicles } from '@shared/schema';
import axios from 'axios';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';

// Servicios de la API MetaSync
const metasyncControllerFixed = {
  /**
   * Verifica la conexión con la API de MetaSync
   * POST /api/metasync-simple/verify-connection
   */
  async verifyConnection(req: Request, res: Response) {
    try {
      // Obtener la configuración de la API
      const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
      
      if (!config) {
        return res.status(400).json({
          success: false,
          message: 'No hay configuración de API activa'
        });
      }
      
      // Verificar la conexión con la API
      const response = await axios.get('https://apis.metasync.com/Almacen/Ping', {
        headers: {
          'apikey': config.apiKey
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Conexión exitosa con la API',
        data: response.data
      });
    } catch (error) {
      console.error('Error verificando conexión:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar la conexión con la API',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Inicia la importación de vehículos
   * POST /api/metasync-simple/import/vehicles
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
        message: 'Error al iniciar la importación de vehículos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Procesa la importación de vehículos en segundo plano
   */
  async processVehiclesImport(importId: number) {
    // Configuración
    const BATCH_SIZE = 100;
    const API_URL = 'https://apis.metasync.com/Almacen/RecuperarCambiosVehiculosCanal';
    
    try {
      // Obtener configuración de la API
      const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
      
      if (!config) {
        await db
          .update(importHistory)
          .set({
            status: 'failed',
            endTime: new Date(),
            errors: ['No hay configuración de API activa']
          })
          .where(eq(importHistory.id, importId));
        return;
      }
      
      // Configuración para paginación
      let lastId = 0;
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let hasMore = true;
      let errors: string[] = [];
      
      // Fecha desde la cual importar (última actualización o hace 1 año por defecto)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const dateStr = this.formatDate(oneYearAgo);
      
      // Iniciar importación
      while (hasMore) {
        try {
          // Actualizar estado
          await db
            .update(importHistory)
            .set({
              status: 'in_progress',
              processingItem: `Importando vehículos desde lastId: ${lastId}`
            })
            .where(eq(importHistory.id, importId));
          
          // Obtener datos de la API
          const response = await axios.get(API_URL, {
            headers: {
              'apikey': config.apiKey,
              'fecha': dateStr,
              'lastid': lastId.toString(),
              'offset': BATCH_SIZE.toString()
            }
          });
          
          const result = response.data.data;
          
          if (!result || !result.vehiculos || !Array.isArray(result.vehiculos)) {
            errors.push('Formato de respuesta inválido - no hay array de vehículos');
            break;
          }
          
          if (result.vehiculos.length === 0) {
            hasMore = false;
            break;
          }
          
          // Procesar los vehículos
          for (const vehicleData of result.vehiculos) {
            try {
              // Comprobar si el vehículo ya existe
              const existingVehicles = await db
                .select({ id: vehicles.id })
                .from(vehicles)
                .where(eq(vehicles.idLocal, vehicleData.idLocal));
              
              if (existingVehicles.length > 0) {
                // Actualizar vehículo existente
                await db
                  .update(vehicles)
                  .set({
                    idEmpresa: vehicleData.idEmpresa || 0,
                    descripcion: vehicleData.descripcion || 'Sin descripción',
                    marca: vehicleData.nombreMarca || 'Desconocida',
                    modelo: vehicleData.nombreModelo || 'Desconocido',
                    version: vehicleData.nombreVersion || '',
                    anyo: vehicleData.anyoVehiculo || 0,
                    combustible: vehicleData.combustible || '',
                    bastidor: vehicleData.bastidor || '',
                    matricula: vehicleData.matricula || '',
                    color: vehicleData.color || '',
                    kilometraje: vehicleData.kilometraje || 0,
                    potencia: vehicleData.potenciaCV || 0,
                    puertas: vehicleData.puertas || null,
                    ultimaSincronizacion: new Date(),
                    
                  })
                  .where(eq(vehicles.idLocal, vehicleData.idLocal));
                
                totalUpdated++;
              } else {
                // Insertar nuevo vehículo
                await db.insert(vehicles).values({
                  idLocal: vehicleData.idLocal,
                  idEmpresa: vehicleData.idEmpresa || 0,
                  descripcion: vehicleData.descripcion || 'Sin descripción',
                  marca: vehicleData.nombreMarca || 'Desconocida',
                  modelo: vehicleData.nombreModelo || 'Desconocido',
                  version: vehicleData.nombreVersion || '',
                  anyo: vehicleData.anyoVehiculo || 0,
                  combustible: vehicleData.combustible || '',
                  bastidor: vehicleData.bastidor || '',
                  matricula: vehicleData.matricula || '',
                  color: vehicleData.color || '',
                  kilometraje: vehicleData.kilometraje || 0,
                  potencia: vehicleData.potenciaCV || 0,
                  puertas: vehicleData.puertas || null,
                  imagenes: ['https://via.placeholder.com/300x200?text=No+Image'],
                  activo: true,
                  sincronizado: true,
                  ultimaSincronizacion: new Date(),
                  fechaCreacion: new Date(),
                  
                });
                
                totalInserted++;
              }
            } catch (vehicleError) {
              console.error(`Error procesando vehículo ${vehicleData.idLocal}:`, vehicleError);
              errors.push(`Error en vehículo ${vehicleData.idLocal}: ${vehicleError instanceof Error ? vehicleError.message : 'Error desconocido'}`);
            }
          }
          
          // Actualizar estadísticas
          totalProcessed += result.vehiculos.length;
          await db
            .update(importHistory)
            .set({
              processedItems: totalProcessed,
              newItems: totalInserted,
              updatedItems: totalUpdated,
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
          errors: errors.slice(0, 100)
        })
        .where(eq(importHistory.id, importId));
      
    } catch (error) {
      console.error('Error en importación de vehículos:', error);
      
      // Actualizar estado de la importación a fallido
      await db
        .update(importHistory)
        .set({
          status: 'failed',
          endTime: new Date(),
          errors: [error instanceof Error ? error.message : 'Error desconocido']
        })
        .where(eq(importHistory.id, importId));
    }
  },
  
  /**
   * Inicia la importación de piezas
   * POST /api/metasync-simple/import/parts
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
        message: 'Error al iniciar la importación de piezas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Procesa la importación de piezas en segundo plano
   */
  async processPartsImport(importId: number) {
    // Configuración
    const BATCH_SIZE = 100;
    const API_URL = 'https://apis.metasync.com/Almacen/RecuperarCambiosCanal';
    
    try {
      // Obtener configuración de la API
      const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
      
      if (!config) {
        await db
          .update(importHistory)
          .set({
            status: 'failed',
            endTime: new Date(),
            errors: ['No hay configuración de API activa']
          })
          .where(eq(importHistory.id, importId));
        return;
      }
      
      // Configuración para paginación
      let lastId = 0;
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let hasMore = true;
      let errors: string[] = [];
      
      // Relaciones pieza-vehículo a procesar
      let partVehicleRelations: { partId: number; vehicleId: number }[] = [];
      
      // Fecha desde la cual importar (última actualización o hace 1 año por defecto)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const dateStr = this.formatDate(oneYearAgo);
      
      // Iniciar importación
      while (hasMore) {
        try {
          // Actualizar estado
          await db
            .update(importHistory)
            .set({
              status: 'in_progress',
              processingItem: `Importando piezas desde lastId: ${lastId}`
            })
            .where(eq(importHistory.id, importId));
          
          // Obtener datos de la API
          const response = await axios.get(API_URL, {
            headers: {
              'apikey': config.apiKey,
              'fecha': dateStr,
              'lastid': lastId.toString(),
              'offset': BATCH_SIZE.toString()
            }
          });
          
          const result = response.data.data;
          
          if (!result || !result.piezas || !Array.isArray(result.piezas)) {
            errors.push('Formato de respuesta inválido - no hay array de piezas');
            break;
          }
          
          if (result.piezas.length === 0) {
            hasMore = false;
            break;
          }
          
          // Procesar las piezas
          for (const partData of result.piezas) {
            try {
              // Comprobar si la pieza ya existe
              const [existingPart] = await db
                .select({ id: parts.id })
                .from(parts)
                .where(eq(parts.refLocal, partData.refLocal));
              
              // Extraer datos (evitando valores null)
              const partInfo = {
                refLocal: partData.refLocal,
                idEmpresa: partData.idEmpresa || 0,
                codFamilia: partData.codFamilia || '',
                descripcionFamilia: partData.descripcionFamilia || '',
                codArticulo: partData.codArticulo || '',
                descripcionArticulo: partData.descripcionArticulo || 'Sin descripción',
                codVersion: partData.codVersion || '',
                refPrincipal: partData.refPrincipal || '',
                anyoInicio: partData.anyoInicio || null,
                anyoFin: partData.anyoFin || null,
                precio: partData.precio || 0,
                
              };
              
              if (existingPart) {
                // Actualizar pieza existente
                await db
                  .update(parts)
                  .set(partInfo)
                  .where(eq(parts.id, existingPart.id));
                
                totalUpdated++;
                
                // Relacionar con vehículo si existe el idVehiculo
                if (partData.idVehiculo) {
                  partVehicleRelations.push({
                    partId: existingPart.id,
                    vehicleId: partData.idVehiculo
                  });
                }
              } else {
                // Insertar nueva pieza (añadiendo campos extra)
                const [newPart] = await db
                  .insert(parts)
                  .values({
                    ...partInfo,
                    estado: 'disponible',
                    reservada: false,
                    fechaCreacion: new Date(),
                    imagenes: ['https://via.placeholder.com/300x200?text=No+Image'],
                    activo: true
                  })
                  .returning({ id: parts.id });
                
                totalInserted++;
                
                // Relacionar con vehículo si existe el idVehiculo
                if (partData.idVehiculo && newPart) {
                  partVehicleRelations.push({
                    partId: newPart.id,
                    vehicleId: partData.idVehiculo
                  });
                }
              }
            } catch (partError) {
              console.error(`Error procesando pieza ${partData.refLocal}:`, partError);
              errors.push(`Error en pieza ${partData.refLocal}: ${partError instanceof Error ? partError.message : 'Error desconocido'}`);
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
          errors: errors.slice(0, 100)
        })
        .where(eq(importHistory.id, importId));
      
    } catch (error) {
      console.error('Error en importación de piezas:', error);
      
      // Actualizar estado de la importación a fallido
      await db
        .update(importHistory)
        .set({
          status: 'failed',
          endTime: new Date(),
          errors: [error instanceof Error ? error.message : 'Error desconocido']
        })
        .where(eq(importHistory.id, importId));
    }
  },
  
  /**
   * Procesa las relaciones entre piezas y vehículos
   */
  async processPartVehicleRelations(relations: { partId: number; vehicleId: number }[]) {
    try {
      // Agrupar por partId para optimizar las consultas
      const partIdToVehicleIds = new Map<number, number[]>();
      for (const rel of relations) {
        if (!partIdToVehicleIds.has(rel.partId)) {
          partIdToVehicleIds.set(rel.partId, []);
        }
        partIdToVehicleIds.get(rel.partId)?.push(rel.vehicleId);
      }
      
      // Procesar cada pieza por separado
      for (const [partId, vehicleIds] of partIdToVehicleIds.entries()) {
        // Buscar vehículos que existan en nuestra base de datos
        const existingVehicles = await db
          .select({ id: vehicles.id, idLocal: vehicles.idLocal })
          .from(vehicles)
          .where(inArray(vehicles.idLocal, vehicleIds));
        
        // Mapear idLocal a id interna
        const vehicleLocalIdToId = new Map<number, number>();
        for (const v of existingVehicles) {
          vehicleLocalIdToId.set(v.idLocal, v.id);
        }
        
        // Verificar relaciones existentes para esta pieza
        const existingRelations = await db
          .select({ vehicleId: vehicleParts.vehicleId })
          .from(vehicleParts)
          .where(eq(vehicleParts.partId, partId));
        
        const existingVehicleIds = new Set(existingRelations.map(r => r.vehicleId));
        
        // Procesar cada vehículo
        for (const vehicleLocalId of vehicleIds) {
          const vehicleId = vehicleLocalIdToId.get(vehicleLocalId);
          
          if (vehicleId && !existingVehicleIds.has(vehicleId)) {
            // Crear relación
            try {
              await db.insert(vehicleParts).values({
                vehicleId,
                partId,
                active: true,
                compatibility: 100, // Compatibilidad perfecta ya que viene de la API
                isPending: false
              });
              
              console.log(`Relación creada: pieza ${partId} con vehículo ${vehicleId}`);
            } catch (relError) {
              console.error(`Error creando relación: pieza ${partId} con vehículo ${vehicleId}`, relError);
            }
          } else if (!vehicleId) {
            // Vehículo no encontrado, crear relación pendiente
            try {
              await db.insert(vehicleParts).values({
                vehicleId: 0, // Valor temporal que indica pendiente
                partId,
                active: false,
                compatibility: 0,
                isPending: true,
                pendingVehicleLocalId: vehicleLocalId // Guardar ID local para procesar después
              });
              
              console.log(`Relación pendiente creada: pieza ${partId} con vehículo local ${vehicleLocalId}`);
            } catch (pendingError) {
              console.error(`Error creando relación pendiente: pieza ${partId} con vehículo local ${vehicleLocalId}`, pendingError);
            }
          }
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
        .select()
        .from(vehicleParts)
        .where(eq(vehicleParts.isPending, true));
      
      if (pendingRelations.length === 0) {
        console.log('No hay relaciones pendientes que procesar.');
        return { updated: 0 };
      }
      
      console.log(`Encontradas ${pendingRelations.length} relaciones pendientes.`);
      
      let updated = 0;
      
      // Agrupar por vehicleLocalId para optimizar las consultas
      const pendingByVehicleLocalId = new Map<number, typeof vehicleParts.$inferSelect[]>();
      for (const relation of pendingRelations) {
        if (!relation.pendingVehicleLocalId) continue;
        
        if (!pendingByVehicleLocalId.has(relation.pendingVehicleLocalId)) {
          pendingByVehicleLocalId.set(relation.pendingVehicleLocalId, []);
        }
        pendingByVehicleLocalId.get(relation.pendingVehicleLocalId)?.push(relation);
      }
      
      // Procesar cada grupo por vehicleLocalId
      for (const [vehicleLocalId, relations] of pendingByVehicleLocalId.entries()) {
        // Buscar si ahora existe el vehículo
        const [vehicle] = await db
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.idLocal, vehicleLocalId));
        
        if (!vehicle) continue; // El vehículo aún no existe
        
        // Actualizar todas las relaciones pendientes para este vehículo
        for (const relation of relations) {
          try {
            await db
              .update(vehicleParts)
              .set({
                vehicleId: vehicle.id,
                active: true,
                compatibility: 100,
                isPending: false
              })
              .where(and(
                eq(vehicleParts.id, relation.id),
                eq(vehicleParts.isPending, true)
              ));
            
            console.log(`Relación actualizada: ${vehicle.id} - ${relation.partId}`);
            
            updated++;
          } catch (updateError) {
            console.error(`Error actualizando relación pendiente:`, updateError);
          }
        }
      }
      
      console.log(`Procesamiento de relaciones pendientes completado: ${updated} actualizadas`);
      return { updated };
    } catch (error) {
      console.error('Error procesando relaciones pendientes:', error);
      return { updated: 0 };
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
        message: 'Error al iniciar la importación completa',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Obtiene el estado de una importación
   * GET /api/metasync-simple/import/:id
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
      
      const [importRecord] = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.id, importId));
      
      if (!importRecord) {
        return res.status(404).json({
          success: false,
          message: 'Importación no encontrada'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: importRecord
      });
    } catch (error) {
      console.error('Error obteniendo estado de importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el estado de la importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Elimina todos los vehículos
   * DELETE /api/metasync-simple/vehicles/all
   */
  async deleteAllVehicles(req: Request, res: Response) {
    try {
      // Eliminar primero las relaciones
      await db.delete(vehicleParts);
      
      // Eliminar los vehículos
      const result = await db.delete(vehicles).returning({ id: vehicles.id });
      
      return res.status(200).json({
        success: true,
        message: `Se han eliminado ${result.length} vehículos y todas sus relaciones`
      });
    } catch (error) {
      console.error('Error eliminando vehículos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar los vehículos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Elimina todas las piezas
   * DELETE /api/metasync-simple/parts/all
   */
  async deleteAllParts(req: Request, res: Response) {
    try {
      // Eliminar primero las relaciones
      await db.delete(vehicleParts);
      
      // Eliminar las piezas
      const result = await db.delete(parts).returning({ id: parts.id });
      
      return res.status(200).json({
        success: true,
        message: `Se han eliminado ${result.length} piezas y todas sus relaciones`
      });
    } catch (error) {
      console.error('Error eliminando piezas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar las piezas',
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

export { metasyncControllerFixed };