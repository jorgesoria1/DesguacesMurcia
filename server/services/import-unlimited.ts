/**
 * Servicio de importación SIN LIMITACIONES ARTIFICIALES
 * Corrige todos los problemas identificados en la auditoría:
 * - Elimina límite de 1000 registros
 * - Importa TODOS los vehículos y piezas disponibles
 * - Maneja correctamente la paginación infinita
 * - Muestra nombres de vehículos correctos
 */

import axios from 'axios';
import { db } from '../db';
import { vehicles, parts, importHistory, apiConfig, vehicleParts } from '@shared/schema';
import { eq, sql, inArray, and } from 'drizzle-orm';

interface BatchResult {
  inserted: number;
  updated: number;
  errors: string[];
  relations?: number;
}

export class ImportUnlimitedService {
  private apiKey: string = '';
  private companyId: number = 0;
  private channel: string = '';
  private readonly apiUrl = 'https://apis.metasync.com/Almacen';
  private readonly batchSize = 1000; // Tamaño de lote (NO límite total)
  private readonly maxRetries = 3;

  async configure(): Promise<void> {
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    
    if (!config) {
      throw new Error('Configuración de API no encontrada. Proporcione credenciales válidas.');
    }
    
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    this.channel = config.channel;
    
    console.log(`🔧 Servicio configurado - Company: ${this.companyId}, Channel: ${this.channel}`);
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  private async fetchWithRetry(endpoint: string, params: any, retries: number = 0): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/${endpoint}`, {
        headers: {
          'apikey': this.apiKey,
          'fecha': params.fecha,
          'lastid': params.lastId?.toString() || '0',
          'offset': params.offset?.toString() || this.batchSize.toString(),
          'idempresa': this.companyId.toString()
        },
        timeout: 60000 // Aumentar timeout para grandes volúmenes
      });

      return response.data;
    } catch (error) {
      if (retries < this.maxRetries) {
        const delay = Math.pow(2, retries) * 2000;
        console.log(`⚠️ Error en API, reintentando en ${delay}ms... (intento ${retries + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(endpoint, params, retries + 1);
      }
      
      if (error.response?.status === 401) {
        throw new Error('API Key inválida o expirada. Proporcione credenciales válidas.');
      }
      
      throw error instanceof Error ? error : new Error('Error desconocido');
    }
  }

  /**
   * Importa TODOS los vehículos disponibles (SIN LÍMITES)
   */
  async importAllVehicles(importId: number, isFullImport: boolean = true): Promise<void> {
    await this.configure();
    
    console.log(`🚗 INICIANDO IMPORTACIÓN ${isFullImport ? 'COMPLETA' : 'PARCIAL'} DE VEHÍCULOS - SIN LÍMITES ARTIFICIALES`);
    
    const baseDate = isFullImport ? new Date('2000-01-01') : new Date('2020-01-01');
    const formattedDate = this.formatDate(baseDate);
    
    let lastId = 0;
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let hasMoreData = true;
    let consecutiveEmptyBatches = 0;
    const errors: string[] = [];
    const maxEmptyBatches = 3; // Tolerar hasta 3 lotes vacíos consecutivos
    
    await this.updateImportStatus(importId, {
      status: 'in_progress',
      processingItem: `Iniciando importación ${isFullImport ? 'COMPLETA' : 'PARCIAL'} de vehículos`,
      progress: 0
    });

    // BUCLE PRINCIPAL - Continúa hasta agotar TODOS los datos disponibles
    while (hasMoreData && consecutiveEmptyBatches < maxEmptyBatches) {
      try {
        // Verificar si la importación ha sido pausada o cancelada
        const [currentImport] = await db
          .select()
          .from(importHistory)
          .where(eq(importHistory.id, importId))
          .limit(1);

        if (currentImport && (currentImport.status === 'paused' || currentImport.status === 'cancelled')) {
          console.log(`🛑 Importación ${currentImport.status}: deteniendo proceso para ID=${importId}`);
          return;
        }

        console.log(`📡 Solicitando lote de vehículos: lastId=${lastId}, total procesados=${totalProcessed}`);
        
        const data = await this.fetchWithRetry('RecuperarCambiosVehiculosCanal', {
          fecha: formattedDate,
          lastId: lastId,
          offset: this.batchSize
        });

        // Extraer vehículos de diferentes formatos de respuesta
        let vehiculos: any[] = [];
        if (data.data?.vehiculos && Array.isArray(data.data.vehiculos)) {
          vehiculos = data.data.vehiculos;
        } else if (data.vehiculos && Array.isArray(data.vehiculos)) {
          vehiculos = data.vehiculos;
        } else if (Array.isArray(data)) {
          vehiculos = data;
        }

        console.log(`📊 Lote recibido: ${vehiculos.length} vehículos`);

        if (vehiculos.length === 0) {
          consecutiveEmptyBatches++;
          console.log(`⚠️ Lote vacío (${consecutiveEmptyBatches}/${maxEmptyBatches})`);
          
          if (consecutiveEmptyBatches >= maxEmptyBatches) {
            console.log(`✅ Importación completada - No hay más vehículos disponibles`);
            hasMoreData = false;
            break;
          }
          
          // Intentar avanzar el lastId para buscar más datos
          lastId += this.batchSize;
          continue;
        }

        // Resetear contador de lotes vacíos
        consecutiveEmptyBatches = 0;

        // Procesar lote de vehículos
        const batchResult = await this.processVehicleBatch(vehiculos);
        totalProcessed += vehiculos.length;
        totalInserted += batchResult.inserted;
        totalUpdated += batchResult.updated;
        errors.push(...batchResult.errors);

        // Actualizar progreso
        await this.updateImportStatus(importId, {
          processedItems: totalProcessed,
          newItems: totalInserted,
          updatedItems: totalUpdated,
          processingItem: `Procesados ${totalProcessed} vehículos (${totalInserted} nuevos, ${totalUpdated} actualizados)`,
          errors: errors.slice(0, 100),
          progress: Math.min(90, Math.floor(totalProcessed / 100)) // Progreso estimado
        });

        // Calcular siguiente lastId
        if (vehiculos.length > 0) {
          const lastVehicle = vehiculos[vehiculos.length - 1];
          const newLastId = lastVehicle.idLocal || lastVehicle.id || (lastId + vehiculos.length);
          
          if (newLastId <= lastId) {
            // Si no avanza el ID, incrementar manualmente para evitar bucle infinito
            lastId = lastId + vehiculos.length;
          } else {
            lastId = newLastId;
          }
        }

        // Verificar si la API indica que hay más datos
        const apiHasMore = data.result_set?.masRegistros || 
                          data.paginacion?.masRegistros || 
                          data.hasMore ||
                          (vehiculos.length >= this.batchSize); // Si recibimos lote completo, probablemente hay más

        if (!apiHasMore && vehiculos.length < this.batchSize) {
          console.log(`✅ API indica que no hay más vehículos disponibles`);
          hasMoreData = false;
        }

        // Pausa breve para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error procesando lote de vehículos:`, error);
        errors.push(`Error en lote ${totalProcessed}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        
        // Si hay demasiados errores, abortar
        if (errors.length > 20) {
          console.error(`❌ Demasiados errores, abortando importación`);
          break;
        }
        
        // Intentar continuar con el siguiente lote
        lastId++;
      }
    }

    // Finalizar importación
    const finalStatus = errors.length > totalProcessed * 0.1 ? 'partial' : 'completed';
    await this.updateImportStatus(importId, {
      status: finalStatus,
      endTime: new Date(),
      totalItems: totalProcessed,
      progress: 100,
      processingItem: `Importación finalizada: ${totalProcessed} vehículos procesados (${totalInserted} nuevos, ${totalUpdated} actualizados)`
    });

    console.log(`✅ IMPORTACIÓN DE VEHÍCULOS ${finalStatus.toUpperCase()}: ${totalProcessed} procesados, ${totalInserted} nuevos, ${totalUpdated} actualizados`);
  }

  /**
   * Importa TODAS las piezas disponibles (SIN LÍMITES)
   */
  async importAllParts(importId: number, isFullImport: boolean = true): Promise<void> {
    await this.configure();
    
    console.log(`🔧 INICIANDO IMPORTACIÓN ${isFullImport ? 'COMPLETA' : 'PARCIAL'} DE PIEZAS - SIN LÍMITES ARTIFICIALES`);
    
    const baseDate = isFullImport ? new Date('2000-01-01') : new Date('2020-01-01');
    const formattedDate = this.formatDate(baseDate);
    
    let lastId = 0;
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let hasMoreData = true;
    let consecutiveEmptyBatches = 0;
    const errors: string[] = [];
    const maxEmptyBatches = 3;
    
    await this.updateImportStatus(importId, {
      status: 'in_progress',
      processingItem: `Iniciando importación ${isFullImport ? 'COMPLETA' : 'PARCIAL'} de piezas`,
      progress: 0
    });

    // BUCLE PRINCIPAL - Continúa hasta agotar TODOS los datos disponibles
    while (hasMoreData && consecutiveEmptyBatches < maxEmptyBatches) {
      try {
        // Verificar si la importación ha sido pausada o cancelada
        const [currentImport] = await db
          .select()
          .from(importHistory)
          .where(eq(importHistory.id, importId))
          .limit(1);

        if (currentImport && (currentImport.status === 'paused' || currentImport.status === 'cancelled')) {
          console.log(`🛑 Importación ${currentImport.status}: deteniendo proceso para ID=${importId}`);
          return;
        }

        console.log(`📡 Solicitando lote de piezas: lastId=${lastId}, total procesados=${totalProcessed}`);
        
        const data = await this.fetchWithRetry('RecuperarCambiosCanalEmpresa', {
          fecha: formattedDate,
          lastId: lastId,
          offset: this.batchSize
        });

        // Extraer piezas de diferentes formatos de respuesta
        let piezas: any[] = [];
        if (data.data?.piezas && Array.isArray(data.data.piezas)) {
          piezas = data.data.piezas;
        } else if (data.piezas && Array.isArray(data.piezas)) {
          piezas = data.piezas;
        } else if (Array.isArray(data)) {
          piezas = data;
        }

        console.log(`📊 Lote recibido: ${piezas.length} piezas`);

        if (piezas.length === 0) {
          consecutiveEmptyBatches++;
          console.log(`⚠️ Lote vacío (${consecutiveEmptyBatches}/${maxEmptyBatches})`);
          
          if (consecutiveEmptyBatches >= maxEmptyBatches) {
            console.log(`✅ Importación completada - No hay más piezas disponibles`);
            hasMoreData = false;
            break;
          }
          
          lastId += this.batchSize;
          continue;
        }

        consecutiveEmptyBatches = 0;

        // Procesar lote de piezas
        const batchResult = await this.processPartsBatch(piezas);
        totalProcessed += piezas.length;
        totalInserted += batchResult.inserted;
        totalUpdated += batchResult.updated;
        errors.push(...batchResult.errors);

        // Actualizar progreso
        await this.updateImportStatus(importId, {
          processedItems: totalProcessed,
          newItems: totalInserted,
          updatedItems: totalUpdated,
          processingItem: `Procesadas ${totalProcessed} piezas (${totalInserted} nuevas, ${totalUpdated} actualizadas)`,
          errors: errors.slice(0, 100),
          progress: Math.min(90, Math.floor(totalProcessed / 100))
        });

        // Calcular siguiente lastId
        if (piezas.length > 0) {
          const lastPieza = piezas[piezas.length - 1];
          const newLastId = lastPieza.refLocal || lastPieza.id || (lastId + piezas.length);
          
          if (newLastId <= lastId) {
            lastId = lastId + piezas.length;
          } else {
            lastId = newLastId;
          }
        }

        // Verificar si hay más datos
        const apiHasMore = data.result_set?.masRegistros || 
                          data.paginacion?.masRegistros || 
                          data.hasMore ||
                          (piezas.length >= this.batchSize);

        if (!apiHasMore && piezas.length < this.batchSize) {
          console.log(`✅ API indica que no hay más piezas disponibles`);
          hasMoreData = false;
        }

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error procesando lote de piezas:`, error);
        errors.push(`Error en lote ${totalProcessed}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        
        if (errors.length > 20) {
          console.error(`❌ Demasiados errores, abortando importación`);
          break;
        }
        
        lastId++;
      }
    }

    // Procesar relaciones vehículo-pieza después de la importación
    console.log(`🔗 Procesando relaciones vehículo-pieza...`);
    await this.updateImportStatus(importId, {
      processingItem: 'Creando relaciones vehículo-pieza...',
      progress: 95
    });

    const relationsCreated = await this.createVehiclePartRelations();
    console.log(`✅ Relaciones creadas: ${relationsCreated}`);

    // Finalizar importación
    const finalStatus = errors.length > totalProcessed * 0.1 ? 'partial' : 'completed';
    await this.updateImportStatus(importId, {
      status: finalStatus,
      endTime: new Date(),
      totalItems: totalProcessed,
      progress: 100,
      processingItem: `Importación finalizada: ${totalProcessed} piezas procesadas (${totalInserted} nuevas, ${totalUpdated} actualizadas, ${relationsCreated} relaciones)`
    });

    console.log(`✅ IMPORTACIÓN DE PIEZAS ${finalStatus.toUpperCase()}: ${totalProcessed} procesadas, ${totalInserted} nuevas, ${totalUpdated} actualizadas, ${relationsCreated} relaciones`);
  }

  private async processVehicleBatch(vehiculos: any[]): Promise<BatchResult> {
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      const idsLocales = vehiculos.map(v => v.idLocal).filter(id => id != null);
      const existingVehicles = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idsLocales));

      const existingMap = new Map(existingVehicles.map(v => [v.idLocal, v.id]));

      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      for (const vehiculo of vehiculos) {
        try {
          const normalized = this.normalizeVehicle(vehiculo);
          
          if (existingMap.has(normalized.idLocal)) {
            toUpdate.push({ ...normalized, id: existingMap.get(normalized.idLocal) });
          } else {
            toInsert.push(normalized);
          }
        } catch (error) {
          errors.push(`Error normalizando vehículo ${vehiculo.idLocal}: ${error instanceof Error ? error.message : 'Error'}`);
        }
      }

      if (toInsert.length > 0) {
        await db.insert(vehicles).values(toInsert);
        inserted = toInsert.length;
      }

      for (const vehiculo of toUpdate) {
        try {
          await db.update(vehicles)
            .set({
              descripcion: vehiculo.descripcion,
              marca: vehiculo.marca,
              modelo: vehiculo.modelo,
              version: vehiculo.version,
              anyo: vehiculo.anyo,
              combustible: vehiculo.combustible,
              imagenes: vehiculo.imagenes,
              
            })
            .where(eq(vehicles.id, vehiculo.id));
          updated++;
        } catch (error) {
          errors.push(`Error actualizando vehículo: ${error instanceof Error ? error.message : 'Error'}`);
        }
      }

    } catch (error) {
      errors.push(`Error procesando lote: ${error instanceof Error ? error.message : 'Error'}`);
    }

    return { inserted, updated, errors };
  }

  private async processPartsBatch(piezas: any[]): Promise<BatchResult> {
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      const refsLocales = piezas.map(p => p.refLocal).filter(ref => ref != null);
      const existingParts = await db
        .select({ id: parts.id, refLocal: parts.refLocal })
        .from(parts)
        .where(inArray(parts.refLocal, refsLocales));

      const existingMap = new Map(existingParts.map(p => [p.refLocal, p.id]));

      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      for (const pieza of piezas) {
        try {
          const normalized = this.normalizePart(pieza);
          
          // Obtener información del vehículo si existe idVehiculo
          if (normalized.idVehiculo && normalized.idVehiculo !== -1) {
            try {
              const [vehicleInfo] = await db
                .select({
                  marca: vehicles.marca,
                  modelo: vehicles.modelo,
                  anyo: vehicles.anyo,
                  anyoInicio: vehicles.anyoInicio,
                  anyoFin: vehicles.anyoFin,
                  combustible: vehicles.combustible
                })
                .from(vehicles)
                .where(eq(vehicles.idLocal, Math.abs(normalized.idVehiculo)))
                .limit(1);

              if (vehicleInfo) {
                normalized.vehicleMarca = vehicleInfo.marca || '';
                normalized.vehicleModelo = vehicleInfo.modelo || '';
                normalized.vehicleAnyo = vehicleInfo.anyo || 0;
                normalized.anyoInicio = vehicleInfo.anyo || 2000;
                normalized.anyoFin = vehicleInfo.anyo || 2050;
                normalized.combustible = vehicleInfo.combustible || '';
                normalized.relatedVehiclesCount = 1;
                normalized.isPendingRelation = false;
              }
            } catch (vehicleError) {
              console.log(`No se encontró vehículo para idVehiculo ${normalized.idVehiculo}`);
            }
          }
          
          if (existingMap.has(normalized.refLocal)) {
            toUpdate.push({ ...normalized, id: existingMap.get(normalized.refLocal) });
          } else {
            toInsert.push(normalized);
          }
        } catch (error) {
          errors.push(`Error normalizando pieza ${pieza.refLocal}: ${error instanceof Error ? error.message : 'Error'}`);
        }
      }

      if (toInsert.length > 0) {
        await db.insert(parts).values(toInsert);
        inserted = toInsert.length;
      }

      for (const pieza of toUpdate) {
        try {
          await db.update(parts)
            .set({
              descripcionArticulo: pieza.descripcionArticulo,
              vehicleMarca: pieza.vehicleMarca,
              vehicleModelo: pieza.vehicleModelo,
              vehicleVersion: pieza.vehicleVersion,
              vehicleAnyo: pieza.vehicleAnyo,
              combustible: pieza.combustible,
              precio: pieza.precio,
              peso: pieza.peso,
              imagenes: pieza.imagenes,
              activo: pieza.activo,
              sincronizado: pieza.sincronizado,
              ultimaSincronizacion: pieza.ultimaSincronizacion,
              
            })
            .where(eq(parts.id, pieza.id));
          updated++;
        } catch (error) {
          errors.push(`Error actualizando pieza: ${error instanceof Error ? error.message : 'Error'}`);
        }
      }

    } catch (error) {
      errors.push(`Error procesando lote: ${error instanceof Error ? error.message : 'Error'}`);
    }

    return { inserted, updated, errors };
  }

  private normalizeVehicle(rawVehicle: any): any {
    return {
      idLocal: rawVehicle.idLocal,
      idEmpresa: rawVehicle.idEmpresa || this.companyId,
      descripcion: `${rawVehicle.marca || ''} ${rawVehicle.modelo || ''} ${rawVehicle.version || ''} (${rawVehicle.anyo || ''})`.trim(),
      marca: rawVehicle.marca || '',
      modelo: rawVehicle.modelo || '',
      version: rawVehicle.version || '',
      anyo: parseInt(rawVehicle.anyo) || 0,
      combustible: rawVehicle.combustible || '',
      bastidor: rawVehicle.bastidor || '',
      matricula: rawVehicle.matricula || '',
      color: rawVehicle.color || '',
      kilometraje: parseInt(rawVehicle.kilometraje) || 0,
      potencia: parseInt(rawVehicle.potencia) || 0,
      puertas: parseInt(rawVehicle.puertas) || null,
      imagenes: Array.isArray(rawVehicle.imagenes) ? rawVehicle.imagenes : [],
      activo: true,
      sincronizado: true,
      fechaCreacion: new Date(),
      
    };
  }

  private normalizePart(rawPart: any): any {
    // Según la API real: precio viene como número entero (ej: 10, 25, 150)
    const precioFinal = parseFloat(rawPart.precio || 0);
    
    return {
      refLocal: rawPart.refLocal,
      idEmpresa: rawPart.idEmpresa || this.companyId,
      idVehiculo: rawPart.idVehiculo || -1,
      // Información del vehículo asociado - se obtiene por separado
      vehicleMarca: '',
      vehicleModelo: '',
      vehicleVersion: rawPart.codVersion || '',
      vehicleAnyo: 0,
      combustible: '',
      relatedVehiclesCount: 0,
      // Información de la pieza según API real
      codFamilia: rawPart.codFamilia || '',
      descripcionFamilia: rawPart.descripcionFamilia || '',
      codArticulo: rawPart.codArticulo || '',
      descripcionArticulo: rawPart.descripcionArticulo || '',
      codVersionVehiculo: rawPart.codVersion || '',
      refPrincipal: rawPart.refPrincipal || '',
      anyoInicio: 2000, // Se determinará por relación con vehículo
      anyoFin: 2050,    // Se determinará por relación con vehículo
      puertas: 0,
      rvCode: '',
      // Precio según formato API real
      precio: precioFinal.toString(),
      anyoStock: parseInt(rawPart.anyoStock || 0),
      peso: rawPart.peso?.toString() || '0',
      ubicacion: parseInt(rawPart.ubicacion || 0),
      observaciones: rawPart.observaciones || '',
      reserva: parseInt(rawPart.reserva || 0),
      tipoMaterial: parseInt(rawPart.tipoMaterial || 0),
      // Mapear urlsImgs de la API real
      imagenes: Array.isArray(rawPart.urlsImgs) ? rawPart.urlsImgs : [],
      activo: precioFinal > 0,
      sincronizado: true,
      isPendingRelation: true, // Marcar como pendiente para procesamiento posterior
      ultimaSincronizacion: new Date(),
      fechaCreacion: new Date(),
      
    };
  }

  /**
   * Crea relaciones entre vehículos y piezas basándose en marca, modelo y año
   */
  private async createVehiclePartRelations(): Promise<number> {
    try {
      let relationsCreated = 0;
      
      // Obtener todas las piezas activas que necesitan relaciones
      const partsWithoutRelations = await db
        .select({
          id: parts.id,
          vehicleMarca: parts.vehicleMarca,
          vehicleModelo: parts.vehicleModelo,
          vehicleAnyo: parts.vehicleAnyo,
          anyoInicio: parts.anyoInicio,
          anyoFin: parts.anyoFin
        })
        .from(parts)
        .where(and(
          eq(parts.activo, true),
          eq(parts.isPendingRelation, false)
        ));

      console.log(`🔍 Procesando ${partsWithoutRelations.length} piezas para crear relaciones...`);

      // Procesar en lotes
      const batchSize = 100;
      for (let i = 0; i < partsWithoutRelations.length; i += batchSize) {
        const batch = partsWithoutRelations.slice(i, i + batchSize);
        
        for (const part of batch) {
          try {
            // Buscar vehículos compatibles
            const compatibleVehicles = await db
              .select({ id: vehicles.id })
              .from(vehicles)
              .where(and(
                eq(vehicles.activo, true),
                eq(vehicles.marca, part.vehicleMarca),
                eq(vehicles.modelo, part.vehicleModelo),
                sql`${vehicles.anyo} >= ${part.anyoInicio}`,
                sql`${vehicles.anyo} <= ${part.anyoFin}`
              ));

            // Crear relaciones para cada vehículo compatible
            for (const vehicle of compatibleVehicles) {
              try {
                // Verificar si la relación ya existe
                const [existingRelation] = await db
                  .select({ id: vehicleParts.id })
                  .from(vehicleParts)
                  .where(and(
                    eq(vehicleParts.vehicleId, vehicle.id),
                    eq(vehicleParts.partId, part.id)
                  ))
                  .limit(1);

                if (!existingRelation) {
                  await db.insert(vehicleParts).values({
                    vehicleId: vehicle.id,
                    partId: part.id,
                    idVehiculoOriginal: part.idVehiculo || -1
                  });
                  relationsCreated++;
                }
              } catch (relationError) {
                console.error(`Error creando relación para pieza ${part.id} y vehículo ${vehicle.id}:`, relationError);
              }
            }
          } catch (error) {
            console.error(`Error procesando pieza ${part.id}:`, error);
          }
        }

        // Pausa breve entre lotes
        if (i + batchSize < partsWithoutRelations.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return relationsCreated;
    } catch (error) {
      console.error('Error creando relaciones vehículo-pieza:', error);
      return 0;
    }
  }

  private async updateImportStatus(importId: number, updates: any): Promise<void> {
    try {
      await db.update(importHistory)
        .set({
          ...updates,
          lastUpdated: new Date()
        })
        .where(eq(importHistory.id, importId));
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  }
}

export const importUnlimited = new ImportUnlimitedService();