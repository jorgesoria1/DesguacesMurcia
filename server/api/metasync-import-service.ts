/* 
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * Este servicio ha sido reemplazado por metasync-optimized-import-service.ts
 * Mantenido solo para referencia histórica
 * Fecha de obsolescencia: 30 Julio 2025
 * Usar en su lugar: metasync-optimized-import-service.ts
 */

import axios from 'axios';
import { db } from '../db';
import { apiConfig, importHistory, parts, vehicles } from '@shared/schema';
import { eq, and, sql, or } from 'drizzle-orm';

/**
 * Servicio para gestionar la importación de datos de MetaSync
 * Implementa el patrón de relaciones vehículo-pieza según la documentación:
 * - Cada pieza tiene un campo idVehiculo que coincide con idLocal del vehículo correspondiente
 * - Se procesan primero los vehículos y luego las piezas
 * - Las piezas sin vehículo se guardan para reintentar después
 */
export class MetasyncImportService {
  private apiUrl = 'https://apis.metasync.com/Almacen';
  private apiKey: string = '';
  private companyId: number = 0;
  private channel: string = '';
  
  // Formatear una fecha al formato requerido por la API (DD/MM/YYYY HH:MM:SS)
  formatDate(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  }
  
  // Configurar el servicio de importación
  async configure() {
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    
    if (!config) {
      throw new Error('No hay configuración de API activa');
    }
    
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    this.channel = config.channel;
    
    console.log(`MetasyncImportService configurado con companyId: ${this.companyId}`);
  }
  
  /**
   * Inicia una nueva importación 
   */
  async startImport(type: 'vehicles' | 'parts', fromDate?: Date, fullImport?: boolean): Promise<number> {
    try {
      await this.configure();
      
      // Crear registro de importación
      const [importRecord] = await db.insert(importHistory)
        .values({
          type,
          status: 'in_progress',
          progress: 0,
          processingItem: `Importando ${type === 'vehicles' ? 'vehículos' : 'piezas'} desde MetaSync`,
          startTime: new Date(),
          errors: [],
          errorCount: 0,
          details: {},
          options: { fromDate: fromDate?.toISOString(), fullImport: fullImport || false }
        })
        .returning();
      
      console.log(`Importación iniciada con ID: ${importRecord.id}, fullImport: ${fullImport}`);
      
      // Iniciar proceso en segundo plano
      if (type === 'vehicles') {
        this.processVehiclesImport(importRecord.id, fromDate, fullImport).catch(error => {
          console.error(`Error en proceso de importación de vehículos:`, error);
        });
      } else {
        this.processPartsImport(importRecord.id, fromDate, fullImport).catch(error => {
          console.error(`Error en proceso de importación de piezas:`, error);
        });
      }
      
      return importRecord.id;
    } catch (error) {
      console.error(`Error al iniciar importación de ${type}:`, error);
      throw error;
    }
  }
  
  /**
   * Procesa la importación de vehículos
   */
  async processVehiclesImport(importId: number, fromDate?: Date, fullImport?: boolean) {
    const BATCH_SIZE = 100;
    
    try {
      // Fecha desde la cual importar (última actualización o hace 1 año por defecto)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const dateStr = this.formatDate(fromDate || oneYearAgo);
      
      // Iniciar importación
      let lastId = 0;
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let hasMore = true;
      let errors: string[] = [];
      
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
          
          // Obtener datos de la API - Primero intentamos con RecuperarCambiosVehiculosCanal
          const endpoint = `${this.apiUrl}/RecuperarCambiosVehiculosCanal`;
          console.log(`Obteniendo vehículos desde ${endpoint} con lastId=${lastId}, fecha=${dateStr}`);
          
          const response = await axios.get(endpoint, {
            headers: {
              'apikey': this.apiKey,
              'fecha': dateStr,
              'lastid': lastId.toString(),
              'offset': BATCH_SIZE.toString()
            }
          });
          
          const result = response.data;
          
          if (!result || !result.vehiculos || !Array.isArray(result.vehiculos)) {
            console.warn('La respuesta no contiene vehículos o formato incorrecto');
            hasMore = false;
            continue;
          }
          
          const vehicles = result.vehiculos;
          const vehiclesCount = vehicles.length;
          
          console.log(`Recibidos ${vehiclesCount} vehículos de la API`);
          
          if (vehiclesCount === 0) {
            hasMore = false;
            continue;
          }
          
          // Procesamiento por lotes
          const vehiclesToProcess = vehicles;
          const { inserted, updated, errorMessages } = await this.processVehicleBatch(vehiclesToProcess);
          
          // Actualizar contadores
          totalProcessed += vehiclesCount;
          totalInserted += inserted;
          totalUpdated += updated;
          errors = [...errors, ...errorMessages];
          
          // Obtener el último ID procesado
          lastId = result.result_set?.lastId || 0;
          
          // Verificar si hay más registros
          hasMore = result.result_set && vehiclesCount > 0 && totalProcessed < result.result_set.total;
          
          // Actualizar progreso
          const progress = result.result_set?.total ? Math.round((totalProcessed / result.result_set.total) * 100) : 100;
          
          await db
            .update(importHistory)
            .set({
              progress,
              totalItems: result.result_set?.total || totalProcessed,
              processedItems: totalProcessed,
              newItems: totalInserted,
              updatedItems: totalUpdated,
              errors: errors.slice(0, 100), // Limitar cantidad de errores guardados
              errorCount: errors.length,
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importId));
            
          console.log(`Progreso importación vehículos: ${progress}% completado`);
          
        } catch (batchError) {
          console.error('Error procesando lote de vehículos:', batchError);
          errors.push(batchError instanceof Error ? batchError.message : String(batchError));
          
          // Continuar con el siguiente lote a pesar del error
          lastId += BATCH_SIZE;
          
          // Actualizar estado con el error
          await db
            .update(importHistory)
            .set({
              errors: errors.slice(0, 100),
              errorCount: errors.length,
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importId));
        }
      }
      
      // Importación completada
      await db
        .update(importHistory)
        .set({
          status: errors.length > 0 ? 'partial' : 'completed',
          progress: 100,
          processingItem: 'Importación completada',
          endTime: new Date(),
          lastUpdated: new Date()
        })
        .where(eq(importHistory.id, importId));
        
      console.log('Importación de vehículos completada');
      
    } catch (error) {
      console.error('Error en importación de vehículos:', error);
      
      // Marcar como fallida
      await db
        .update(importHistory)
        .set({
          status: 'failed',
          processingItem: 'Error en importación',
          errors: [error instanceof Error ? error.message : String(error)],
          errorCount: 1,
          endTime: new Date(),
          lastUpdated: new Date()
        })
        .where(eq(importHistory.id, importId));
    }
  }
  
  /**
   * Procesa la importación de piezas
   */
  async processPartsImport(importId: number, fromDate?: Date, fullImport?: boolean) {
    const BATCH_SIZE = 100;
    
    try {
      // Fecha desde la cual importar (última actualización o hace 1 año por defecto)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const dateStr = this.formatDate(fromDate || oneYearAgo);
      
      // Iniciar importación
      let lastId = 0;
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let hasMore = true;
      let errors: string[] = [];
      let pendingPartsCount = 0;
      
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
          
          // Obtener datos de la API - Usamos RecuperarCambiosCanal para piezas
          const endpoint = `${this.apiUrl}/RecuperarCambiosCanal`;
          console.log(`Obteniendo piezas desde ${endpoint} con lastId=${lastId}, fecha=${dateStr}`);
          
          const response = await axios.get(endpoint, {
            headers: {
              'apikey': this.apiKey,
              'fecha': dateStr,
              'lastid': lastId.toString(),
              'offset': BATCH_SIZE.toString()
            }
          });
          
          const result = response.data;
          
          if (!result || !result.piezas || !Array.isArray(result.piezas)) {
            console.warn('La respuesta no contiene piezas o formato incorrecto');
            hasMore = false;
            continue;
          }
          
          const partsData = result.piezas;
          const partsCount = partsData.length;
          
          console.log(`Recibidas ${partsCount} piezas de la API`);
          
          if (partsCount === 0) {
            hasMore = false;
            continue;
          }
          
          // Procesamiento por lotes
          const { inserted, updated, pending, errorMessages } = await this.processPartBatch(partsData);
          
          // Actualizar contadores
          totalProcessed += partsCount;
          totalInserted += inserted;
          totalUpdated += updated;
          pendingPartsCount += pending;
          errors = [...errors, ...errorMessages];
          
          // Obtener el último ID procesado
          lastId = result.result_set?.lastId || 0;
          
          // Verificar si hay más registros
          hasMore = result.result_set && partsCount > 0 && totalProcessed < result.result_set.total;
          
          // Actualizar progreso
          const progress = result.result_set?.total ? Math.round((totalProcessed / result.result_set.total) * 100) : 100;
          
          await db
            .update(importHistory)
            .set({
              progress,
              totalItems: result.result_set?.total || totalProcessed,
              processedItems: totalProcessed,
              newItems: totalInserted,
              updatedItems: totalUpdated,
              errors: errors.slice(0, 100), // Limitar cantidad de errores guardados
              errorCount: errors.length,
              details: { pendingParts: pendingPartsCount },
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importId));
            
          console.log(`Progreso importación piezas: ${progress}% completado, ${pendingPartsCount} piezas pendientes`);
          
        } catch (batchError) {
          console.error('Error procesando lote de piezas:', batchError);
          errors.push(batchError instanceof Error ? batchError.message : String(batchError));
          
          // Continuar con el siguiente lote a pesar del error
          lastId += BATCH_SIZE;
          
          // Actualizar estado con el error
          await db
            .update(importHistory)
            .set({
              errors: errors.slice(0, 100),
              errorCount: errors.length,
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importId));
        }
      }
      
      // Procesar relaciones pendientes
      if (pendingPartsCount > 0) {
        console.log(`Intentando resolver ${pendingPartsCount} piezas pendientes`);
        const { resolved } = await this.processPendingRelations();
        console.log(`Resueltas ${resolved} relaciones pendientes`);
      }
      
      // Actualizar estado de todas las piezas (incluyendo desactivar las de precio cero)
      console.log('Actualizando estado activo de todas las piezas...');
      let statusUpdateSuccess = true;
      let zeroPriceDeactivated = 0;
      
      try {
        const { activated, deactivated } = await this.updatePartsActiveStatus();
        console.log(`Estado actualizado: ${activated} piezas activadas, ${deactivated} piezas desactivadas`);
        
        // Desactivar específicamente las piezas con precio cero o negativo
        console.log('Desactivando piezas con precio cero, negativo o inválido...');
        
        const zeroPriceResult = await db.execute(sql`
          UPDATE ${parts}
          SET 
            ${parts.activo} = false,
            ${parts.updatedAt} = NOW()
          WHERE
            ${parts.activo} = true
            AND (
              ${parts.precio} IS NULL
              OR ${parts.precio} = ''
              OR ${parts.precio} = '0'
              OR ${parts.precio} = '0.0' 
              OR ${parts.precio} = '0.00'
              OR ${parts.precio} = '0,00'
              OR ${parts.precio} = '-0.01'
              OR TRIM(${parts.precio}) = ''
              OR TRIM(${parts.precio}) = '0'
              OR TRIM(${parts.precio}) = '0.0'
              OR TRIM(${parts.precio}) = '0.00'
              OR TRIM(${parts.precio}) = '0,00'
              OR TRIM(${parts.precio}) = '-0.01'
              OR (
                ${parts.precio} ~ '^-?[0-9]+([.,][0-9]+)?$' 
                AND CAST(REPLACE(${parts.precio}, ',', '.') AS DECIMAL) <= 0
              )
            )
        `);
        
        zeroPriceDeactivated = Number(zeroPriceResult?.rowCount || 0);
        console.log(`✅ Desactivadas ${zeroPriceDeactivated} piezas con precio cero, negativo o inválido`);
        
      } catch (statusError) {
        console.error('Error al actualizar estado de piezas:', statusError);
        errors.push(`Error actualizando estado de piezas: ${statusError instanceof Error ? statusError.message : String(statusError)}`);
        statusUpdateSuccess = false;
      }
      
      // Asegurar que la importación se marca como completada
      const finalStatus = errors.length > 0 ? 'partial' : 'completed';
      
      try {
        await db
          .update(importHistory)
          .set({
            status: finalStatus,
            progress: 100,
            processingItem: `Importación ${finalStatus === 'completed' ? 'completada exitosamente' : 'completada con errores'}`,
            endTime: new Date(),
            lastUpdated: new Date(),
            details: { 
              pendingParts: pendingPartsCount,
              zeroPriceDeactivated,
              statusUpdateSuccess
            }
          })
          .where(eq(importHistory.id, importId));
          
        console.log(`Importación de piezas ${finalStatus} con estado: ${finalStatus}`);
        
      } catch (finalUpdateError) {
        console.error('Error al marcar importación como completada:', finalUpdateError);
        // Intentar una actualización mínima
        try {
          await db.execute(sql`
            UPDATE ${importHistory}
            SET 
              status = ${finalStatus},
              progress = 100,
              "endTime" = NOW(),
              "lastUpdated" = NOW()
            WHERE id = ${importId}
          `);
          console.log('Importación marcada como completada (actualización mínima)');
        } catch (minimalUpdateError) {
          console.error('Error crítico al actualizar estado final:', minimalUpdateError);
        }
      }
      
    } catch (error) {
      console.error('Error en importación de piezas:', error);
      
      // Marcar como fallida
      await db
        .update(importHistory)
        .set({
          status: 'failed',
          processingItem: 'Error en importación',
          errors: [error instanceof Error ? error.message : String(error)],
          errorCount: 1,
          endTime: new Date(),
          lastUpdated: new Date()
        })
        .where(eq(importHistory.id, importId));
    }
  }
  
  /**
   * Procesa un lote de vehículos
   */
  private async processVehicleBatch(vehicleBatch: any[]): Promise<{
    inserted: number;
    updated: number;
    errorMessages: string[];
  }> {
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    
    try {
      for (const rawVehicle of vehicleBatch) {
        try {
          // Extraer datos del vehículo (manejar formatos antiguos y nuevos)
          const idLocal = rawVehicle.idLocal !== undefined ? rawVehicle.idLocal : rawVehicle.IdLocal;
          
          if (idLocal === undefined) {
            errors.push(`Vehículo sin idLocal válido: ${JSON.stringify(rawVehicle).substring(0, 100)}...`);
            continue;
          }
          
          // Verificar si el vehículo ya existe
          const existingVehicles = await db
            .select()
            .from(vehicles)
            .where(eq(vehicles.idLocal, idLocal));
          
          // Extraer datos para la inserción/actualización
          const vehicleData = {
            idLocal: idLocal,
            idEmpresa: rawVehicle.idEmpresa || this.companyId,
            descripcion: rawVehicle.descripcion || 'Sin descripción',
            marca: rawVehicle.nombreMarca || rawVehicle.marca || 'Desconocida',
            modelo: rawVehicle.nombreModelo || rawVehicle.modelo || 'Desconocido',
            version: rawVehicle.version || '',
            anyo: rawVehicle.anyo || 0,
            combustible: rawVehicle.combustible || '',
            bastidor: rawVehicle.bastidor || '',
            matricula: rawVehicle.matricula || '',
            color: rawVehicle.color || '',
            kilometraje: rawVehicle.kilometraje || 0,
            potencia: rawVehicle.potencia || 0,
            puertas: rawVehicle.puertas || null,
            imagenes: Array.isArray(rawVehicle.imagenes) ? rawVehicle.imagenes : 
                    (rawVehicle.imagenes ? [rawVehicle.imagenes] : ['https://via.placeholder.com/150']),
            activo: true,
            
          };
          
          if (existingVehicles.length > 0) {
            // Actualizar vehículo existente
            await db
              .update(vehicles)
              .set(vehicleData)
              .where(eq(vehicles.idLocal, idLocal));
            updated++;
          } else {
            // Insertar nuevo vehículo
            await db
              .insert(vehicles)
              .values(vehicleData);
            inserted++;
          }
        } catch (vehicleError) {
          const errorMsg = vehicleError instanceof Error ? vehicleError.message : String(vehicleError);
          errors.push(`Error procesando vehículo: ${errorMsg}`);
          console.error('Error procesando vehículo:', vehicleError);
        }
      }
    } catch (batchError) {
      const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
      errors.push(`Error procesando lote de vehículos: ${errorMsg}`);
      console.error('Error procesando lote de vehículos:', batchError);
    }
    
    return { inserted, updated, errorMessages: errors };
  }
  
  /**
   * Verifica si un precio es cero o inválido
   */
  private isZeroPrice(precio: string | number): boolean {
    if (precio === null || precio === undefined) return true;
    
    // Convertir a string y limpiar espacios
    const precioStr = String(precio).trim();
    
    // Verificar casos obvios de precio cero
    if (precioStr === '' || precioStr === '0' || precioStr === '0.0' || 
        precioStr === '0.00' || precioStr === '0,00' || precioStr === '-0' ||
        precioStr === '-0.0' || precioStr === '-0.00') {
      return true;
    }
    
    // Intentar convertir a número
    try {
      const precioNum = parseFloat(precioStr.replace(',', '.'));
      
      // Verificar si es NaN, cero, negativo o muy pequeño (prácticamente cero)
      if (isNaN(precioNum) || precioNum <= 0 || precioNum < 0.01) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`Error al procesar precio: ${precio}`, error);
      return true; // Si no se puede convertir, considerarlo como precio inválido
    }
  }

  /**
   * Procesa un lote de piezas
   */
  private async processPartBatch(partBatch: any[]): Promise<{
    inserted: number;
    updated: number;
    pending: number;
    errorMessages: string[];
  }> {
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    let pending = 0;
    
    try {
      for (const rawPart of partBatch) {
        try {
          // Extraer datos de la pieza
          const refLocal = rawPart.refLocal !== undefined ? rawPart.refLocal : rawPart.RefLocal;
          const idVehiculo = rawPart.idVehiculo !== undefined ? rawPart.idVehiculo : rawPart.IdVehiculo;
          
          if (refLocal === undefined) {
            errors.push(`Pieza sin refLocal válido: ${JSON.stringify(rawPart).substring(0, 100)}...`);
            continue;
          }
          
          if (idVehiculo === undefined) {
            errors.push(`Pieza sin idVehiculo válido: ${JSON.stringify(rawPart).substring(0, 100)}...`);
            continue;
          }
          
          // Verificar si la pieza ya existe
          const existingParts = await db
            .select()
            .from(parts)
            .where(eq(parts.refLocal, refLocal));
          
          // Verificar si el vehículo existe usando múltiples patrones de matching
          const vehicleIdAbs = Math.abs(idVehiculo);
          const vehicleIdMod1M = vehicleIdAbs % 1000000;
          const vehicleIdMod100K = vehicleIdAbs % 100000;
          const vehicleIdMod10K = vehicleIdAbs % 10000;
          
          const existingVehicles = await db
            .select()
            .from(vehicles)
            .where(
              or(
                eq(vehicles.idLocal, vehicleIdAbs),
                eq(vehicles.idLocal, vehicleIdMod1M),
                eq(vehicles.idLocal, vehicleIdMod100K),
                eq(vehicles.idLocal, vehicleIdMod10K)
              )
            );
          
          const vehicleExists = existingVehicles.length > 0;
          const vehicle = vehicleExists ? existingVehicles[0] : null;
          
          // Verificar y formatear precio (dividir por 100 según las instrucciones)
          let precio = rawPart.precio?.toString() || '0';
          if (precio && precio !== '0') {
            const precioNum = parseFloat(precio);
            if (!isNaN(precioNum) && precioNum >= 100) {
              precio = (precioNum / 100).toFixed(2);
            }
          }
          const hasZeroPrice = this.isZeroPrice(precio);
          
          if (hasZeroPrice) {
            console.log(`Pieza con precio cero detectada: refLocal=${refLocal}, precio=${precio} - será desactivada`);
          }
          
          // Extraer datos para la inserción/actualización
          const partData = {
            refLocal,
            idVehiculo, // Guardar la referencia al idLocal del vehículo
            idEmpresa: rawPart.idEmpresa || this.companyId,
            codFamilia: rawPart.codFamilia || '',
            descripcionFamilia: rawPart.descripcionFamilia || '',
            codArticulo: rawPart.codArticulo || '',
            descripcionArticulo: rawPart.descripcionArticulo || '',
            codVersion: rawPart.codVersion || '',
            refPrincipal: rawPart.refPrincipal || '',
            anyoInicio: rawPart.anyoInicio || null,
            anyoFin: rawPart.anyoFin || null,
            puertas: rawPart.puertas || 0,
            rvCode: rawPart.rvCode || '',
            precio: precio,
            anyoStock: rawPart.anyoStock || 0,
            peso: rawPart.peso?.toString() || '0',
            ubicacion: rawPart.ubicacion || 0,
            observaciones: rawPart.observaciones || '',
            reserva: rawPart.reserva || 0,
            tipoMaterial: rawPart.tipoMaterial || 0,
            imagenes: Array.isArray(rawPart.imagenes) ? rawPart.imagenes : 
                    (rawPart.imagenes ? [rawPart.imagenes] : ['https://via.placeholder.com/150']),
            // Información del vehículo asociado (si existe)
            vehicleMarca: vehicle?.marca || '',
            vehicleModelo: vehicle?.modelo || '',
            vehicleVersion: vehicle?.version || '',
            vehicleAnyo: vehicle?.anyo || 0,
            combustible: vehicle?.combustible || '',
            // REGLA CRÍTICA: Una pieza NUNCA puede estar activa si tiene precio cero o negativo
            // Solo puede estar activa si: vehículo existe Y precio válido (> 0)
            activo: vehicleExists && !hasZeroPrice,
            isPendingRelation: !vehicleExists, // Marcar como pendiente si el vehículo no existe
            
          };
          
          if (existingParts.length > 0) {
            // Actualizar pieza existente
            await db
              .update(parts)
              .set(partData)
              .where(eq(parts.refLocal, refLocal));
            updated++;
          } else {
            // Insertar nueva pieza
            await db
              .insert(parts)
              .values(partData);
            inserted++;
          }
          
          // Contabilizar piezas pendientes
          if (!vehicleExists) {
            pending++;
          }
          
        } catch (partError) {
          const errorMsg = partError instanceof Error ? partError.message : String(partError);
          errors.push(`Error procesando pieza: ${errorMsg}`);
          console.error('Error procesando pieza:', partError);
        }
      }
    } catch (batchError) {
      const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
      errors.push(`Error procesando lote de piezas: ${errorMsg}`);
      console.error('Error procesando lote de piezas:', batchError);
    }
    
    return { inserted, updated, pending, errorMessages: errors };
  }
  
  /**
   * Procesa las relaciones pendientes entre piezas y vehículos
   * Busca piezas marcadas como isPendingRelation=true y verifica si sus vehículos ya existen
   */
  async processPendingRelations(): Promise<{ resolved: number }> {
    let resolved = 0;
    
    try {
      // Obtener todas las piezas pendientes
      const pendingParts = await db
        .select()
        .from(parts)
        .where(eq(parts.isPendingRelation, true));
      
      console.log(`Encontradas ${pendingParts.length} piezas pendientes de relación`);
      
      for (const part of pendingParts) {
        // Verificar si el vehículo existe ahora
        const vehicleResults = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.idLocal, part.idVehiculo));
        
        if (vehicleResults.length > 0) {
          const vehicle = vehicleResults[0];
          
          // Verificar si el precio es cero
          const hasZeroPrice = this.isZeroPrice(part.precio || '0');
          
          // El vehículo ahora existe, actualizar la pieza con información del vehículo
          // Solo activar si no tiene precio cero
          await db
            .update(parts)
            .set({
              activo: !hasZeroPrice, // Solo activar si no tiene precio cero
              isPendingRelation: false,
              vehicleMarca: vehicle.marca,
              vehicleModelo: vehicle.modelo,
              vehicleVersion: vehicle.version,
              vehicleAnyo: vehicle.anyo,
              combustible: vehicle.combustible,
              
            })
            .where(eq(parts.id, part.id));
          
          if (hasZeroPrice) {
            console.log(`Pieza ID=${part.id} resuelta pero mantenida inactiva por precio cero (${part.precio})`);
          } else {
            console.log(`Pieza ID=${part.id} resuelta y activada con información de vehículo`);
          }
          
          resolved++;
        }
      }
      
      return { resolved };
    } catch (error) {
      console.error('Error procesando relaciones pendientes:', error);
      throw error;
    }
  }
  
  /**
   * Actualiza el estado activo de todas las piezas basado en la existencia del vehículo asociado
   * Esta función se puede ejecutar después de importar vehículos para activar piezas pendientes
   */
  async updatePartsActiveStatus(): Promise<{ activated: number, deactivated: number }> {
    let activated = 0;
    let deactivated = 0;
    
    try {
      // Activar piezas que tienen vehículo, están marcadas como pendientes Y no tienen precio cero
      const activateResult = await db.execute(sql`
        UPDATE ${parts}
        SET 
          ${parts.activo} = true,
          ${parts.isPendingRelation} = false,
          ${parts.updatedAt} = NOW()
        WHERE
          ${parts.isPendingRelation} = true
          AND EXISTS (
            SELECT 1 FROM ${vehicles}
            WHERE ${vehicles.idLocal} = ${parts.idVehiculo}
          )
          AND CAST(${parts.precio} AS DECIMAL) > 0
      `);
      
      // Desactivar piezas que no tienen vehículo asociado O tienen precio cero
      const deactivateResult = await db.execute(sql`
        UPDATE ${parts}
        SET 
          ${parts.activo} = false,
          ${parts.updatedAt} = NOW()
        WHERE
          (NOT EXISTS (
            SELECT 1 FROM ${vehicles}
            WHERE ${vehicles.idLocal} = ${parts.idVehiculo}
          )
          OR CAST(${parts.precio} AS DECIMAL) <= 0
          OR ${parts.precio} IS NULL
          OR ${parts.precio} = '')
      `);
      
      // Marcar como pendientes solo las que no tienen vehículo (no las de precio cero)
      await db.execute(sql`
        UPDATE ${parts}
        SET 
          ${parts.isPendingRelation} = true,
          ${parts.updatedAt} = NOW()
        WHERE
          NOT EXISTS (
            SELECT 1 FROM ${vehicles}
            WHERE ${vehicles.idLocal} = ${parts.idVehiculo}
          )
      `);
      
      // Obtener recuentos actualizados
      const activatedCount = await db.select({ count: sql`count(*)` }).from(parts)
        .where(eq(parts.activo, true));
      
      const deactivatedCount = await db.select({ count: sql`count(*)` }).from(parts)
        .where(eq(parts.activo, false));
      
      activated = Number(activatedCount[0].count) || 0;
      deactivated = Number(deactivatedCount[0].count) || 0;
      
      console.log(`Estado actualizado: ${activated} piezas activas, ${deactivated} piezas inactivas`);
      
      return { activated, deactivated };
    } catch (error) {
      console.error('Error actualizando estado activo de piezas:', error);
      throw error;
    }
  }
}

// Exportar instancia del servicio
export const metasyncImportService = new MetasyncImportService();