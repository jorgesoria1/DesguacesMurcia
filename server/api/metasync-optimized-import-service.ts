// @ts-nocheck
import axios, { AxiosRequestConfig } from 'axios';
import { db } from '../db';
import { apiConfig, importHistory, parts, syncControl, vehicles, vehicleParts } from '@shared/schema';
import { eq, and, sql, inArray, desc, count as dbCount, isNull, or } from 'drizzle-orm';
import { normalizeImagenesArray } from '../utils/array-normalizer';

/**
 * Servicio optimizado para importaciones masivas desde MetaSync
 * Implementa estrategias de eficiencia para grandes volúmenes de datos:
 * - Procesamiento por lotes
 * - Registros de control de sincronización
 * - Manejo robusto de errores con reintentos
 * - Compresión de datos
 */
export class MetasyncOptimizedImportService {
  private apiUrl = 'https://apis.metasync.com/Almacen';
  private apiKey: string = '';
  private companyId: number = 0;
  public channel: string = '';  // Cambiado a público para acceder desde el controlador
  
  /**
   * Formatea una fecha al formato requerido por la API
   */
  formatDate(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  }
  
  /**
   * Configura el servicio cargando datos de la API
   */
  async configure() {
    console.log('Intentando obtener configuración de API...');
    
    try {
      // Mostrar todas las configuraciones para diagnóstico
      const allConfigs = await db.select().from(apiConfig);
      console.log('Todas las configuraciones disponibles:', JSON.stringify(allConfigs));
      
      // Obtener configuración activa
      const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
      
      console.log('Configuración activa encontrada:', config ? JSON.stringify(config) : 'ninguna');
      
      if (!config) {
        // Crear configuración por defecto si no existe
        console.log('No hay configuración activa, creando configuración por defecto...');
        const [newConfig] = await db.insert(apiConfig).values({
          apiKey: 'API_KEY_PLACEHOLDER',
          companyId: 1,
          channel: 'MURCIA',
          active: true
        }).returning();
        
        this.apiKey = newConfig.apiKey;
        this.companyId = newConfig.companyId;
        this.channel = newConfig.channel;
        
        console.log('⚠️ Configuración por defecto creada. Actualice la configuración de API en el panel de administración.');
      } else {
        // Mapear campos según el esquema de la base de datos
        this.apiKey = config.apiKey;
        this.companyId = config.companyId;
        this.channel = config.channel || 'MURCIA';
      }
      
      console.log(`MetasyncOptimizedImportService configurado con companyId: ${this.companyId}, channel: ${this.channel}, apiKey: ${this.apiKey ? this.apiKey.substring(0, 5) + '***' : 'NO_SET'}`);
    } catch (error) {
      console.error('Error al obtener configuración de API:', error);
      
      // Configuración de emergencia para que el sistema no falle
      this.apiKey = 'API_KEY_PLACEHOLDER';
      this.companyId = 1;
      this.channel = 'MURCIA';
      
      console.log('⚠️ Usando configuración de emergencia. Verifique la configuración de API.');
    }
  }
  
  /**
   * Obtiene o inicializa el control de sincronización
   * ESTRATEGIA: Ambas usan misma fecha base (1900), diferencia está en skipExisting
   */
  private async getSyncControl(type: 'vehicles' | 'parts', forceFullImport = false): Promise<any> {
    // ESTRATEGIA: Ambas importaciones procesan TODAS las piezas desde fecha base
    // Diferencia: COMPLETA actualiza existentes, INCREMENTAL las salta con skipExisting
    
    // Para ambas: usar fecha antigua para procesar TODO el catálogo
    const baseDate = new Date('1900-01-01T00:00:00');
    console.log(`📅 Usando fecha base ${baseDate.toISOString()} para procesar TODAS las ${type}`);
    console.log(`🔄 ${forceFullImport ? 'COMPLETA' : 'INCREMENTAL'}: Procesando catálogo completo`);
    console.log(`💡 Diferencia: ${forceFullImport ? 'actualiza existentes' : 'salta existentes con skipExisting'}`);
    
    // Buscar control existente para mantener lastId si existe
    const [control] = await db
      .select()
      .from(syncControl)
      .where(and(
        eq(syncControl.type, type),
        eq(syncControl.active, true)
      ));
    
    if (control) {
      // Usar fecha base pero mantener lastId del control existente
      return {
        ...control,
        lastSyncDate: baseDate,
        lastId: 0 // Reiniciar para procesar desde el principio
      };
    }
    
    // Si no existe control, crear uno nuevo
    const [newControl] = await db
      .insert(syncControl)
      .values({
        type,
        lastSyncDate: baseDate,
        lastId: 0,
        recordsProcessed: 0
      })
      .returning();
    
    return newControl;
  }
  
  /**
   * Actualiza el control de sincronización
   */
  private async updateSyncControl(id: number, lastSyncDate: Date, lastId: number, recordsProcessed: number) {
    await db
      .update(syncControl)
      .set({
        lastSyncDate,
        lastId,
        recordsProcessed
      })
      .where(eq(syncControl.id, id));
  }
  
  /**
   * Realiza petición a la API con manejo robusto de errores y reintentos
   * @param endpoint URL relativa del endpoint
   * @param params Parámetros de la petición
   * @param maxRetries Número máximo de reintentos
   */
  async fetchWithRetry(endpoint: string, params: any, maxRetries = 3): Promise<any> {
    let retries = 0;
    
    // Validar configuración antes de hacer peticiones
    if (!this.apiKey || this.apiKey === 'API_KEY_PLACEHOLDER') {
      throw new Error('API Key no configurada. Configure la API Key en el panel de administración antes de realizar importaciones.');
    }
    
    while (true) {
      try {
        // Usar fetch nativo para control total (evitar cualquier interceptor de axios)
        const headers: Record<string, string> = {
          'apikey': this.apiKey
        };
        
        // Agregar parámetros a headers exactamente como funciona en la prueba
        if (params.fecha) {
          const fechaValue = params.fecha instanceof Date ? 
            this.formatDate(params.fecha) : params.fecha.toString();
          headers['fecha'] = fechaValue;
          console.log(`🔥 FETCH NATIVO: Usando fecha: ${fechaValue}`);
        }
        
        if (params.lastId !== undefined) {
          headers['lastid'] = params.lastId.toString();
          console.log(`🔥 FETCH NATIVO: Usando lastId: ${params.lastId}`);
        }
        
        if (params.offset !== undefined) {
          headers['offset'] = params.offset.toString();
          console.log(`🔥 FETCH NATIVO: Usando offset: ${params.offset}`);
        }
        
        if (this.channel) {
          headers['canal'] = this.channel;
          console.log(`🔥 FETCH NATIVO: Usando canal: ${this.channel}`);
        }
        
        if (this.companyId) {
          headers['idempresa'] = this.companyId.toString();
          console.log(`🔥 FETCH NATIVO: Usando idempresa: ${this.companyId}`);
        }
        
        const url = `${this.apiUrl}/${endpoint}`;
        
        console.log(`🔥 FETCH NATIVO: GET a ${url}`);
        console.log(`🔥 FETCH NATIVO: Headers:`, headers);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: headers,
          signal: AbortSignal.timeout(20000)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log(`🔥 FETCH NATIVO: Respuesta status=${response.status}`);
        return data;
      } catch (error: any) {
        retries++;
        
        // Manejar errores específicos
        if (error.response) {
          const status = error.response.status;
          
          // Rate limit o servicio no disponible → reintento con backoff exponencial
          if ((status === 429 || status === 503) && retries < maxRetries) {
            const delay = Math.pow(2, retries) * 1000; // Backoff exponencial: 2s, 4s, 8s...
            console.log(`API error ${status}, reintentando en ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Otros errores HTTP
          throw new Error(`Error API ${status}: ${error.response.data?.message || error.message}`);
        }
        
        // Error de red u otro
        if (retries < maxRetries) {
          const delay = Math.pow(2, retries) * 1000;
          console.log(`Error de conexión, reintentando en ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
  }
  
  /**
   * Importa vehículos en modo optimizado para volúmenes grandes
   * @param importId ID del registro de importación
   * @param fullImport Si es importación completa o incremental
   * @param skipExisting Si true, salta elementos que ya existen (optimización para bases pobladas)
   */
  async importVehicles(importId: number, fullImport = false, skipExisting = false): Promise<void> {
    try {
      // Configurar servicio y obtener control de sincronización
      await this.configure();
      const syncData = await this.getSyncControl('vehicles', fullImport);
      
      // ESTRATEGIA DEFINITIVA: Ambas usan la misma fecha, solo difieren en skipExisting
      if (!fullImport) {
        // INCREMENTAL: Misma fecha que completa + skipExisting automático
        const recommendation = await this.shouldSkipExisting('vehicles');
        if (recommendation.recommend) {
          console.log(`🎯 IMPORTACIÓN INCREMENTAL: ${recommendation.reason}`);
          console.log(`💡 Procesando desde misma fecha que completa, pero saltando existentes`);
          skipExisting = true;
        } else {
          console.log(`ℹ️  IMPORTACIÓN INCREMENTAL: ${recommendation.reason}`);
        }
      } else {
        // COMPLETA: Misma fecha + actualizar todas las existentes
        console.log(`🔄 IMPORTACIÓN COMPLETA: Procesando desde última fecha sync, actualizando todos`);
        console.log(`📋 Esto garantiza que todos los vehículos se procesen y actualicen`);
        skipExisting = false;
      }
      
      // Registrar inicio
      await db
        .update(importHistory)
        .set({
          status: 'in_progress',
          details: { 
            syncControlId: syncData.id,
            lastSyncDate: syncData.lastSyncDate.toISOString(),
            lastId: syncData.lastId
          }
        })
        .where(eq(importHistory.id, importId));
      
      // Inicializar variables para paginación
      let lastId = syncData.lastId;
      let moreRecordsExist = true;
      let totalProcessed = 0;
      let errors: string[] = [];
      let lastModDate = syncData.lastSyncDate;
      const batchSize = 1000; // Máximo rendimiento para importaciones
      
      // Procesar en bucle mientras haya más registros
      while (moreRecordsExist) {
        try {
          // Actualizar progreso
          await db
            .update(importHistory)
            .set({
              processingItem: `Procesando vehículos desde lastId=${lastId}`
            })
            .where(eq(importHistory.id, importId));
          
          // Obtener lote de vehículos
          console.log(`Intentando obtener vehículos desde API con lastId=${lastId}, fecha=${syncData.lastSyncDate.toISOString()}`);
          const formattedDate = this.formatDate(syncData.lastSyncDate);
          console.log(`${fullImport ? '🔄 IMPORTACIÓN COMPLETA' : '📤 IMPORTACIÓN INCREMENTAL'}: usando fecha ${formattedDate}`);
          // Según documentación oficial: lastId para paginación y offset máximo de 1000
          console.log(`API Inventario - Solicitando vehículos con: [fecha=${formattedDate}, lastId=${lastId}, offset=${batchSize}]`);
          
          let data;
          try {
            data = await this.fetchWithRetry('RecuperarCambiosVehiculosCanal', {
              fecha: formattedDate, 
              lastId, 
              offset: batchSize, // Máximo 1000 según documentación
              useParamsInUrl: false // Usar parámetros en header en lugar de URL para mejorar compatibilidad
            });
          } catch (apiError) {
            console.error('Error en petición API:', apiError);
            
            // Si es error de configuración, parar importación
            if (apiError instanceof Error && apiError.message.includes('API Key no configurada')) {
              throw apiError;
            }
            
            // Para otros errores, intentar con configuración alternativa
            console.log('Intentando con configuración alternativa...');
            data = await this.fetchWithRetry('RecuperarCambiosVehiculosCanal', {
              fecha: formattedDate, 
              lastId, 
              offset: batchSize,
              useParamsInUrl: true // Usar parámetros en URL como alternativa
            });
          }
          
          console.log(`Respuesta de API recibida, analizando formato...`);
          
          // Intentar diferentes formatos de respuesta conocidos
          let vehicleBatch: any[] = [];
          
          // Caso 1: formato data.vehiculos (más común)
          if (data.data?.vehiculos && Array.isArray(data.data.vehiculos)) {
            console.log(`Formato encontrado: data.vehiculos con ${data.data.vehiculos.length} elementos`);
            vehicleBatch = data.data.vehiculos;
          } 
          // Caso 2: formato vehiculos en raíz
          else if (data.vehiculos && Array.isArray(data.vehiculos)) {
            console.log(`Formato encontrado: vehiculos con ${data.vehiculos.length} elementos`);
            vehicleBatch = data.vehiculos;
          }
          // Caso 3: formato elementos en data
          else if (data.elements && Array.isArray(data.elements)) {
            console.log(`Formato encontrado: elements con ${data.elements.length} elementos`);
            vehicleBatch = data.elements;
          }
          // Caso 4: formato de la propiedad data
          else if (data.data && Array.isArray(data.data)) {
            console.log(`Formato encontrado: data[] con ${data.data.length} elementos`);
            vehicleBatch = data.data;
          }
          // Caso 5: tal vez los datos estén en otro nivel
          else {
            // Buscar propiedades que podrían contener arrays
            const possibleArrayProps = Object.keys(data).filter(key => 
              Array.isArray(data[key]) && data[key].length > 0
            );
            
            if (possibleArrayProps.length > 0) {
              const propName = possibleArrayProps[0];
              console.log(`Formato alternativo encontrado: ${propName} con ${data[propName].length} elementos`);
              vehicleBatch = data[propName];
            } else {
              console.log(`No se encontraron vehículos en la respuesta API. Estructura de respuesta:`, 
                JSON.stringify(data).substring(0, 500) + '...');
              
              // No lanzar error, simplemente asumir que no hay datos
              vehicleBatch = [];
            }
          }
          
          // Si no hay vehículos, terminar
          if (vehicleBatch.length === 0) {
            moreRecordsExist = false;
            continue;
          }
          
          // Procesar lote dentro de una transacción con optimización opcional
          const batchResult = await this.processVehicleBatch(vehicleBatch, skipExisting);
          
          // Actualizar contadores
          totalProcessed += vehicleBatch.length;
          
          // Actualizar ID para paginación según las diferentes posibilidades en la respuesta
          console.log(`Analizando respuesta para obtener lastId de paginación...`);
          
          // Caso 1: Verificar si hay un result_set con lastId (formato documentado)
          if (data.result_set?.lastId) {
            console.log(`Avanzando paginación con result_set.lastId: ${lastId} -> ${data.result_set.lastId}`);
            lastId = data.result_set.lastId;
          }
          // Caso 2: Verificar si hay un paginacion.lastId (formato alternativo)
          else if (data.paginacion?.lastId) {
            console.log(`Avanzando paginación con paginacion.lastId: ${lastId} -> ${data.paginacion.lastId}`);
            lastId = data.paginacion.lastId;
          } 
          // Caso 3: Si no hay paginación explícita, usar el ID del último elemento del lote
          else if (vehicleBatch.length > 0) {
            const lastItem = vehicleBatch[vehicleBatch.length - 1];
            if (lastItem.idLocal) {
              console.log(`Usando idLocal del último vehículo para paginación: ${lastId} -> ${lastItem.idLocal}`);
              lastId = lastItem.idLocal;
            } else if (lastItem.id) {
              console.log(`Usando id del último vehículo para paginación: ${lastId} -> ${lastItem.id}`);
              lastId = lastItem.id;
            }
          }
          
          console.log(`Nuevo lastId para próximo lote: ${lastId}`);
          
          
          // Determinar fecha más reciente
          for (const vehicle of vehicleBatch) {
            if (vehicle.fechaMod) {
              const modDate = new Date(vehicle.fechaMod);
              if (modDate > lastModDate) {
                lastModDate = modDate;
              }
            }
          }
          
          // Añadir errores si hay
          if (batchResult.errorMessages.length > 0) {
            errors = [...errors, ...batchResult.errorMessages];
          }
          
          // Obtener contadores acumulativos actuales de la base de datos
          const [currentImport] = await db
            .select({ newItems: importHistory.newItems, updatedItems: importHistory.updatedItems })
            .from(importHistory)
            .where(eq(importHistory.id, importId));
          
          const accumulatedNew = (currentImport?.newItems || 0) + batchResult.inserted;
          const accumulatedUpdated = (currentImport?.updatedItems || 0) + batchResult.updated;
          
          // Actualizar progreso con contadores acumulativos
          await db
            .update(importHistory)
            .set({
              processedItems: totalProcessed,
              newItems: accumulatedNew,
              updatedItems: accumulatedUpdated,
              errors: Array.isArray(errors) ? errors : [],
              errorCount: Array.isArray(errors) ? errors.length : 0,
              progress: Math.min(95, Math.floor((totalProcessed / (totalProcessed + 100)) * 100)), // Estimación
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importId));
          
          // Verificar si hay más registros
          if (importId) {
            const [importRecord] = await db
              .select()
              .from(importHistory)
              .where(eq(importHistory.id, importId));
            
            // Lógica mejorada para importaciones completas vs incrementales
            if (importRecord && importRecord.isFullImport) {
              // Para importaciones COMPLETAS:
              // 1. Verificar si hay más registros según la respuesta de la API
              // 2. Continuar hasta que la API indique que no hay más
              
              // Para importaciones COMPLETAS, continuamos mientras tengamos datos en el lote actual
              // y haya un lastId válido para continuar (o total de registros API > procesados)
              
              // Verificar campos en la API (resultset o paginacion)
              const hasMoreFromResultSet = data.result_set?.masRegistros === true;
              const hasMoreFromPaginacion = data.paginacion?.masRegistros === true;
              const hasExplicitMoreFlag = hasMoreFromResultSet || hasMoreFromPaginacion;
              
              // Verificar conteo total disponible
              const totalRecordsInApi = data.result_set?.total || 0;
              const hasMoreBasedOnCount = totalRecordsInApi > 0 && totalProcessed < totalRecordsInApi;
              
              // Verificar datos recibidos
              const hasMoreBasedOnBatch = vehicleBatch.length > 0 && vehicleBatch.length >= 100; // Si recibimos lotes completos
              
              // Combinar criterios - continuar si cualquiera indica que hay más
              const hasMore = hasExplicitMoreFlag || hasMoreBasedOnCount || hasMoreBasedOnBatch;
              
              console.log(`Verificando continuación: explicitFlag=${hasExplicitMoreFlag}, totalAPI=${totalRecordsInApi}, procesados=${totalProcessed}, tamaño lote=${vehicleBatch.length}`);
              
              if (!hasMore) {
                moreRecordsExist = false;
                console.log(`Importación COMPLETA de vehículos finalizada. No hay más datos.`);
              } else {
                moreRecordsExist = true;
                console.log(`Importación COMPLETA de vehículos en progreso, procesados ${totalProcessed} registros. Continuando con lastId=${lastId}`);
              }
            } else {
              // Para importaciones INCREMENTALES aplicamos la misma lógica
              // Verificar campos en la API (resultset o paginacion)
              const hasMoreFromResultSet = data.result_set?.masRegistros === true;
              const hasMoreFromPaginacion = data.paginacion?.masRegistros === true;
              const hasExplicitMoreFlag = hasMoreFromResultSet || hasMoreFromPaginacion;
              
              // Verificar conteo total disponible
              const totalRecordsInApi = data.result_set?.total || 0;
              const hasMoreBasedOnCount = totalRecordsInApi > 0 && totalProcessed < totalRecordsInApi;
              
              // Verificar datos recibidos
              const hasMoreBasedOnBatch = vehicleBatch.length > 0 && vehicleBatch.length >= 100;
              
              // Para incrementales somos más conservadores - solo continuamos si hay tamaño de lote completo
              const hasMore = hasExplicitMoreFlag || (hasMoreBasedOnCount && hasMoreBasedOnBatch);
              
              moreRecordsExist = hasMore;
              console.log(`Importación incremental de vehículos, análisis continuación: explicitFlag=${hasExplicitMoreFlag}, totalAPI=${totalRecordsInApi}, tamaño lote=${vehicleBatch.length}, continúa: ${moreRecordsExist}`);
            }
          } else {
            // Comportamiento por defecto (sin importId)
            moreRecordsExist = vehicleBatch.length > 0;
          }
          
          // Actualizar control de sincronización periódicamente
          await this.updateSyncControl(
            syncData.id,
            lastModDate,
            lastId,
            syncData.recordsProcessed + totalProcessed
          );
          
        } catch (batchError: any) {
          const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
          errors.push(`Error al procesar lote: ${errorMsg}`);
          console.error('Error procesando lote de vehículos:', batchError);
          
          // Si es error de configuración, detener inmediatamente
          if (errorMsg.includes('API Key no configurada')) {
            throw new Error('Configuración de API inválida. Configure la API Key antes de continuar.');
          }
          
          // Si es un error crítico, detener proceso
          if (errors.length > 10) {
            throw new Error('Demasiados errores durante la importación');
          }
          
          // Para errores de API, esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Pausa corta entre lotes para estabilidad (vehículos)
        if (moreRecordsExist) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Actualizar control de sincronización final
      await this.updateSyncControl(
        syncData.id,
        lastModDate,
        lastId,
        syncData.recordsProcessed + totalProcessed
      );
      
      // Actualizar contadores de piezas en vehículos después de la importación
      console.log('🔄 Actualizando contadores de piezas en vehículos después de importar vehículos...');
      await this.updateVehiclePartsCounters();
      console.log('✅ Contadores de piezas actualizados correctamente');
      
      // Completar importación
      await db
        .update(importHistory)
        .set({
          status: errors.length > 0 ? 'partial' : 'completed',
          progress: 100,
          processedItems: totalProcessed,
          errors,
          errorCount: errors.length,
          processingItem: 'Importación completada',
          endTime: new Date()
        })
        .where(eq(importHistory.id, importId));
      
      console.log(`Importación de vehículos completada. Total: ${totalProcessed}`);
      
      // NOTA: La sincronización automática de vehículos se ejecuta por separado si es necesario
      
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
          endTime: new Date()
        })
        .where(eq(importHistory.id, importId));
    }
  }
  
  /**
   * Procesa un lote de vehículos con UPSERT masivo ultra-optimizado
   * Mejora crítica: Elimina updates individuales, usa UPSERT nativo PostgreSQL
   */
  private async processVehicleBatch(vehicleBatch: any[], skipExisting = false): Promise<{
    inserted: number;
    updated: number;
    errorMessages: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // OPTIMIZACIÓN: Verificar qué vehículos ya existen si se solicita saltar existentes
      let vehiclesToProcess = vehicleBatch;
      let skippedCount = 0;
      
      if (skipExisting) {
        const existingIds = await this.checkExistingVehicles(vehicleBatch);
        vehiclesToProcess = vehicleBatch.filter(v => !existingIds.has(v.idLocal));
        skippedCount = vehicleBatch.length - vehiclesToProcess.length;
        
        if (skippedCount > 0) {
          console.log(`⚡ OPTIMIZACIÓN: Saltando ${skippedCount} vehículos existentes de ${vehicleBatch.length} totales`);
        }
      }
      
      // Preparar todos los vehículos normalizados para UPSERT masivo
      const normalizedVehicles = [];
      
      for (const vehicleData of vehiclesToProcess) {
        try {
          const normalizedVehicle = this.normalizeVehicle(vehicleData);
          normalizedVehicles.push(normalizedVehicle);
        } catch (vehicleError) {
          const errorMsg = vehicleError instanceof Error ? vehicleError.message : String(vehicleError);
          errors.push(`Error normalizando vehículo ${vehicleData.idLocal}: ${errorMsg}`);
        }
      }
      
      if (normalizedVehicles.length === 0) {
        return { 
          inserted: 0, 
          updated: skipExisting ? skippedCount : 0, 
          errorMessages: errors 
        };
      }
      
      // OPTIMIZACIÓN CRÍTICA: UPSERT masivo en una sola operación atómica
      // Usar ON CONFLICT DO UPDATE para manejar inserts y updates simultáneamente
      const result = await db
        .insert(vehicles)
        .values(normalizedVehicles)
        .onConflictDoUpdate({
          target: vehicles.idLocal,
          set: {
            descripcion: sql`EXCLUDED.descripcion`,
            marca: sql`EXCLUDED.marca`,
            modelo: sql`EXCLUDED.modelo`,
            version: sql`EXCLUDED.version`,
            anyo: sql`EXCLUDED.anyo`,
            combustible: sql`EXCLUDED.combustible`,
            bastidor: sql`EXCLUDED.bastidor`,
            matricula: sql`EXCLUDED.matricula`,
            color: sql`EXCLUDED.color`,
            kilometraje: sql`EXCLUDED.kilometraje`,
            potencia: sql`EXCLUDED.potencia`,
            puertas: sql`EXCLUDED.puertas`,
            imagenes: sql`EXCLUDED.imagenes`,
            fechaActualizacion: sql`EXCLUDED.fecha_actualizacion`,
            activo: sql`EXCLUDED.activo`
          }
        })
        .returning({ 
          id: vehicles.id, 
          idLocal: vehicles.idLocal,
          // Determinar si fue INSERT (nuevo) o UPDATE (existente)
          isNew: sql<boolean>`(xmax = 0)`
        });

      // Contar inserts vs updates basado en el flag isNew
      const inserted = result.filter(r => r.isNew).length;
      const updated = result.length - inserted;
      
      console.log(`🚀 UPSERT masivo completado: ${inserted} insertados, ${updated} actualizados de ${normalizedVehicles.length} vehículos`);
      
      return { inserted, updated, errorMessages: errors };
      
    } catch (batchError) {
      const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
      errors.push(`Error en UPSERT masivo: ${errorMsg}`);
      console.error('❌ Error en UPSERT masivo de vehículos:', batchError);
      
      // Fallback: Si UPSERT masivo falla, usar método original
      console.log('🔄 Intentando método de fallback...');
      return await this.processVehicleBatchFallback(vehicleBatch);
    }
  }
  
  /**
   * Método de fallback para casos donde UPSERT masivo no funcione
   */
  private async processVehicleBatchFallback(vehicleBatch: any[]): Promise<{
    inserted: number;
    updated: number;
    errorMessages: string[];
  }> {
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    
    try {
      // Extraer todos los IDs para búsqueda eficiente
      const vehicleIds = vehicleBatch.map(v => v.idLocal);
      
      // Buscar vehículos existentes en una sola consulta
      const existingVehicles = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, vehicleIds));
      
      // Mapa para acceso rápido
      const existingMap = new Map(
        existingVehicles.map(v => [v.idLocal, v.id])
      );
      
      // Separar inserciones y actualizaciones
      const vehiclesToInsert = [];
      const vehiclesToUpdate = [];
      
      for (const vehicleData of vehicleBatch) {
        try {
          const normalizedVehicle = this.normalizeVehicle(vehicleData);
          
          if (existingMap.has(vehicleData.idLocal)) {
            vehiclesToUpdate.push({
              ...normalizedVehicle,
              id: existingMap.get(vehicleData.idLocal)
            });
          } else {
            vehiclesToInsert.push(normalizedVehicle);
          }
        } catch (vehicleError) {
          const errorMsg = vehicleError instanceof Error ? vehicleError.message : String(vehicleError);
          errors.push(`Error normalizando vehículo ${vehicleData.idLocal}: ${errorMsg}`);
        }
      }
      
      // Insertar nuevos vehículos
      if (vehiclesToInsert.length > 0) {
        const result = await db
          .insert(vehicles)
          .values(vehiclesToInsert)
          .returning({ id: vehicles.id });
        
        inserted = result.length;
      }
      
      // Actualizar vehículos existentes (uno por uno como método de emergencia)
      for (const vehicle of vehiclesToUpdate) {
        try {
          const id = vehicle.id;
          delete vehicle.id;
          
          await db
            .update(vehicles)
            .set(vehicle)
            .where(eq(vehicles.id, id));
          
          updated++;
        } catch (updateError) {
          errors.push(`Error actualizando vehículo: ${updateError instanceof Error ? updateError.message : 'Error'}`);
        }
      }
      
    } catch (batchError) {
      const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
      errors.push(`Error procesando lote de fallback: ${errorMsg}`);
      console.error('Error en lote de vehículos (fallback):', batchError);
    }
    
    return { inserted, updated, errorMessages: errors };
  }
  
  /**
   * Sincroniza eliminando piezas que ya no están en la API (OPCIONAL)
   * @param currentApiParts Array de piezas actuales del API
   * @param mode Modo de sincronización: 'conservador', 'completo', 'hibrido'
   */
  async syncRemovedParts(currentApiParts: any[], mode: 'conservador' | 'completo' | 'hibrido' | 'eliminar' = 'conservador'): Promise<{
    marked: number;
    deactivated: number;
    preserved: number;
  }> {
    if (mode === 'conservador') {
      console.log('🔒 Modo conservador activo - no se eliminan piezas');
      return { marked: 0, deactivated: 0, preserved: 0 };
    }

    try {
      // Obtener IDs actuales del API
      const apiPartIds = new Set(currentApiParts.map(p => p.refLocal));
      console.log(`📊 API actual contiene ${apiPartIds.size} piezas`);

      // Buscar piezas locales que ya no están en el API
      const localParts = await db
        .select({ id: parts.id, refLocal: parts.refLocal, activo: parts.activo })
        .from(parts)
        .where(eq(parts.activo, true));

      const missingParts = localParts.filter(p => !apiPartIds.has(p.refLocal));
      console.log(`🔍 Encontradas ${missingParts.length} piezas locales que ya no están en el API`);

      if (missingParts.length === 0) {
        return { marked: 0, deactivated: 0, preserved: 0 };
      }

      if (mode === 'completo') {
        // Desactivar completamente las piezas faltantes
        const result = await db
          .update(parts)
          .set({ 
            activo: false,
            fechaActualizacion: sql`NOW()`
          })
          .where(inArray(parts.refLocal, missingParts.map(p => p.refLocal)))
          .returning({ refLocal: parts.refLocal });

        console.log(`❌ Desactivadas ${result.length} piezas que ya no están en el API`);
        return { marked: 0, deactivated: result.length, preserved: 0 };

      } else if (mode === 'hibrido') {
        // Marcar piezas como no disponibles en API pero mantenerlas activas para historial
        // Procesar en lotes para evitar stack overflow
        const batchSize = 1000;
        let totalMarked = 0;
        
        for (let i = 0; i < missingParts.length; i += batchSize) {
          const batch = missingParts.slice(i, i + batchSize);
          
          const result = await db
            .update(parts)
            .set({ 
              disponibleApi: false,
              fechaActualizacion: sql`NOW()`
            })
            .where(inArray(parts.refLocal, batch.map(p => p.refLocal)))
            .returning({ refLocal: parts.refLocal });

          totalMarked += result.length;
          console.log(`🔄 Marcadas ${result.length} piezas como no disponibles (lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(missingParts.length/batchSize)})`);
        }

        console.log(`✅ Total: ${totalMarked} piezas marcadas como no disponibles en API (modo híbrido)`);
        console.log(`📋 Estas piezas se ocultarán del catálogo pero se conservarán para historial`);
        return { marked: totalMarked, deactivated: 0, preserved: missingParts.length };
      
      } else if (mode === 'eliminar') {
        // ELIMINACIÓN DIRECTA: Borrar piezas que ya no están en la API
        console.log(`🗑️ ELIMINACIÓN DIRECTA: Borrando ${missingParts.length} piezas que ya no están en la API...`);
        
        // Eliminar en lotes para evitar problemas de memoria
        const batchSize = 1000;
        let totalDeleted = 0;
        
        for (let i = 0; i < missingParts.length; i += batchSize) {
          const batch = missingParts.slice(i, i + batchSize);
          
          const result = await db
            .delete(parts)
            .where(inArray(parts.refLocal, batch.map(p => p.refLocal)))
            .returning({ refLocal: parts.refLocal });
          
          totalDeleted += result.length;
          console.log(`🗑️ Eliminadas ${result.length} piezas (lote ${Math.floor(i/batchSize) + 1})`);
        }

        console.log(`✅ ELIMINACIÓN COMPLETA: ${totalDeleted} piezas eliminadas de la base de datos`);
        console.log(`🎯 Base de datos local ahora coincide 100% con la API`);
        return { marked: 0, deactivated: totalDeleted, preserved: 0 };
      }

    } catch (error) {
      console.error('Error en sincronización de piezas eliminadas:', error);
      throw error;
    }

    return { marked: 0, deactivated: 0, preserved: 0 };
  }

  /**
   * Obtiene todas las piezas actuales del API para comparación en importaciones incrementales
   * Optimizado para ser rápido y detectar solo los IDs actuales
   * PÚBLICO (Octubre 5, 2025) - Necesario para proceso independiente de sincronización
   */
  public async getAllCurrentApiParts(): Promise<any[]> {
    try {
      console.log('📡 Obteniendo lista completa de piezas del API para comparación...');
      
      const allParts: any[] = [];
      let lastId = 0;
      let hasMore = true;
      let batchCount = 0;
      const maxBatches = 200; // Aumentado para soportar 200K piezas (200 * 1000)
      let consecutiveEmptyBatches = 0;
      
      // CORREGIDO (Octubre 5, 2025): Usar fecha 2000-01-01 que ya funciona en otras partes del código
      // El API de RecuperarCambiosCanal requiere una fecha razonable
      const baseDate = new Date('2000-01-01T00:00:00');
      const formattedDate = this.formatDate(baseDate);
      
      console.log(`📅 Usando fecha base: ${formattedDate} para obtener todas las piezas`);
      
      while (hasMore && batchCount < maxBatches) {
        batchCount++;
        
        try {
          const data = await this.fetchWithRetry('RecuperarCambiosCanal', {
            fecha: formattedDate,
            lastId: lastId,
            offset: 1000
          });
          
          // Extraer piezas de la respuesta
          let partBatch: any[] = [];
          if (data.data?.piezas && Array.isArray(data.data.piezas)) {
            partBatch = data.data.piezas;
          } else if (data.piezas && Array.isArray(data.piezas)) {
            partBatch = data.piezas;
          } else if (Array.isArray(data)) {
            partBatch = data;
          }
          
          if (partBatch.length === 0) {
            consecutiveEmptyBatches++;
            // Si recibimos 2 lotes vacíos consecutivos, detener
            if (consecutiveEmptyBatches >= 2) {
              console.log(`🛑 Deteniendo: ${consecutiveEmptyBatches} lotes vacíos consecutivos`);
              hasMore = false;
              break;
            }
          } else {
            consecutiveEmptyBatches = 0; // Resetear contador
          }
          
          // Solo almacenar IDs (eficiencia de memoria)
          const partIds = partBatch.map(p => ({
            refLocal: p.refLocal || p.RefLocal || p.id
          }));
          
          // Agregar solo si tenemos IDs válidos
          const validIds = partIds.filter(p => p.refLocal);
          if (validIds.length > 0) {
            allParts.push(...validIds);
          }
          
          // Actualizar lastId para siguiente lote
          if (partBatch.length > 0) {
            const lastPart = partBatch[partBatch.length - 1];
            lastId = lastPart.refLocal || lastPart.RefLocal || lastPart.id || (lastId + 1000);
          } else {
            lastId += 1000; // Incrementar si no hay datos
          }
          
          // Verificar si hay más datos según API - CONFIAR SOLO EN EL FLAG
          const hasMoreFlag = data.result_set?.masRegistros || data.paginacion?.masRegistros;
          if (hasMoreFlag === false) {
            console.log('🛑 API indica que no hay más registros (masRegistros=false)');
            hasMore = false;
            break;
          }
          
          // CORREGIDO (Octubre 5, 2025): No detenerse por lotes pequeños
          // El API puede devolver lotes variables, confiar solo en masRegistros
          // Lotes pequeños NO significan fin de datos si masRegistros no dice false
          
          // Log cada 10 lotes para no saturar consola
          if (batchCount % 10 === 0) {
            console.log(`📊 Progreso: ${batchCount} lotes, ${allParts.length.toLocaleString()} piezas totales`);
          }
          
        } catch (batchError) {
          console.error(`⚠️ Error en lote ${batchCount}:`, batchError);
          // Continuar con siguiente lote en vez de detener completamente
          lastId += 1000;
          consecutiveEmptyBatches++;
          
          // Detener si hay muchos errores consecutivos
          if (consecutiveEmptyBatches >= 3) {
            console.error('❌ Demasiados errores consecutivos, deteniendo obtención del API');
            hasMore = false;
          }
        }
      }
      
      if (batchCount >= maxBatches) {
        console.log(`⚠️ Alcanzado límite máximo de ${maxBatches} lotes (${allParts.length.toLocaleString()} piezas)`);
      }
      
      console.log(`✅ Lista completa obtenida: ${allParts.length.toLocaleString()} piezas del API`);
      return allParts;
      
    } catch (error) {
      console.error('❌ Error obteniendo lista completa del API:', error);
      return []; // Devolver array vacío en caso de error
    }
  }

  /**
   * Detecta automáticamente si la base de datos está poblada y recomienda optimización
   */
  private async shouldSkipExisting(type: 'vehicles' | 'parts'): Promise<{
    recommend: boolean;
    count: number;
    reason: string;
  }> {
    try {
      let count = 0;
      
      if (type === 'vehicles') {
        const result = await db.select({ count: sql<number>`count(*)` }).from(vehicles);
        count = result[0]?.count || 0;
      } else {
        const result = await db.select({ count: sql<number>`count(*)` }).from(parts);
        count = result[0]?.count || 0;
      }
      
      // Umbrales para recomendar optimización
      const threshold = type === 'vehicles' ? 1000 : 10000;
      const recommend = count >= threshold;
      
      const reason = recommend 
        ? `Base poblada con ${count.toLocaleString()} ${type}, optimización recomendada`
        : `Base con ${count.toLocaleString()} ${type}, optimización no necesaria`;
      
      return { recommend, count, reason };
    } catch (error) {
      console.error(`Error detectando estado de BD para ${type}:`, error);
      return { recommend: false, count: 0, reason: 'Error detectando estado' };
    }
  }

  /**
   * Verifica qué vehículos ya existen en la base de datos para evitar UPSERT innecesario
   */
  private async checkExistingVehicles(vehicleBatch: any[]): Promise<Set<number>> {
    if (vehicleBatch.length === 0) return new Set();
    
    const idLocales = vehicleBatch.map(v => v.idLocal).filter(id => id != null);
    
    if (idLocales.length === 0) return new Set();
    
    console.log(`🔍 Verificando existencia de ${idLocales.length} vehículos en BD...`);
    
    const existingVehicles = await db
      .select({ idLocal: vehicles.idLocal })
      .from(vehicles)
      .where(inArray(vehicles.idLocal, idLocales));
    
    const existingIds = new Set(existingVehicles.map(v => v.idLocal));
    console.log(`✅ Encontrados ${existingIds.size} vehículos existentes de ${idLocales.length} verificados`);
    
    return existingIds;
  }

  /**
   * Verifica qué piezas ya existen en la base de datos para evitar UPSERT innecesario
   */
  private async checkExistingParts(partBatch: any[]): Promise<Set<number>> {
    if (partBatch.length === 0) return new Set();
    
    const idLocales = partBatch.map(p => p.refLocal).filter(id => id != null);
    
    if (idLocales.length === 0) return new Set();
    
    console.log(`🔍 Verificando existencia de ${idLocales.length} piezas en BD...`);
    
    const existingParts = await db
      .select({ refLocal: parts.refLocal })
      .from(parts)
      .where(inArray(parts.refLocal, idLocales));
    
    const existingIds = new Set(existingParts.map(p => p.refLocal));
    console.log(`✅ Encontradas ${existingIds.size} piezas existentes de ${idLocales.length} verificadas`);
    
    return existingIds;
  }

  /**
   * Normaliza un vehículo para la base de datos asegurando que todos los campos requeridos tengan valores válidos
   */
  private normalizeVehicle(vehicleData: any): any {
    // Asegurar que los campos obligatorios existan
    if (!vehicleData.idLocal) {
      throw new Error('Vehículo sin idLocal');
    }
    
    // Normalizar imágenes usando el array normalizer para evitar errores "value.map is not a function"
    let imagenes: string[] = [];
    
    // Verificar todas las variantes posibles de nombres de campo para imágenes
    const imageFields = [
      vehicleData.imagenes,
      vehicleData.UrlsImgs,
      vehicleData.urlsImgs,
      vehicleData.Imagenes
    ];
    
    for (const imageField of imageFields) {
      if (imageField) {
        imagenes = normalizeImagenesArray(imageField);
        break;
      }
    }
    
    // Si no se encontraron imágenes válidas, usar la imagen por defecto
    if (imagenes.length === 0) {
      imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
      console.log(`Usando imagen por defecto para vehículo ${vehicleData.idLocal}. Campos disponibles: ${Object.keys(vehicleData).join(', ')}`);
    }
    
    // Normalizar marca/modelo
    const marca = vehicleData.nombreMarca || vehicleData.marca || vehicleData.Marca || 'Desconocida';
    const modelo = vehicleData.nombreModelo || vehicleData.modelo || vehicleData.Modelo || 'Desconocido';
    const version = vehicleData.nombreVersion || vehicleData.codVersion || vehicleData.version || vehicleData.Version || '';
    const anyo = vehicleData.anyoVehiculo || vehicleData.AnyoVehiculo || vehicleData.anyo || vehicleData.Anyo || 0;
    
    // Usar el campo 'codigo' como referencia principal (descripción)
    // Si no hay codigo, usar el idLocal como referencia
    let descripcion = vehicleData.codigo || vehicleData.Codigo || `REF-${vehicleData.idLocal}`;
    
    // Asegurar que siempre haya una descripción válida
    if (!descripcion || descripcion.length < 1) {
      descripcion = `REF-${vehicleData.idLocal}`;
    }
    
    // Crear objeto normalizado con valores por defecto para campos obligatorios
    return {
      idLocal: vehicleData.idLocal,
      idEmpresa: vehicleData.idEmpresa || this.companyId,
      marca,
      modelo,
      version,
      anyo,
      descripcion,
      combustible: vehicleData.combustible || vehicleData.Combustible || '',
      bastidor: vehicleData.bastidor || vehicleData.Bastidor || '',
      matricula: vehicleData.matricula || vehicleData.Matricula || '',
      color: vehicleData.color || vehicleData.Color || '',
      kilometraje: vehicleData.kilometraje || vehicleData.Kilometraje || 0,
      potencia: vehicleData.potenciaHP || vehicleData.potenciaKW || vehicleData.Potencia || 0,
      puertas: vehicleData.puertas || vehicleData.Puertas || null,
      imagenes,
      activo: true,
      sincronizado: true,
      ultimaSincronizacion: sql`NOW()`,
      fechaCreacion: sql`NOW()`,
      
    };
  }
  
  /**
   * Importa piezas en modo optimizado para volúmenes grandes
   * @param importId ID del registro de importación
   */
  async importParts(importId: number): Promise<void> {
    try {
      // Configurar servicio
      await this.configure();
      
      // Obtener información del registro de importación para determinar tipo
      const [importRecord] = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.id, importId));
      
      if (!importRecord) {
        throw new Error(`No se encontró registro de importación con ID ${importId}`);
      }
      
      const fullImport = importRecord.isFullImport;
      const syncData = await this.getSyncControl('parts', fullImport);
      
      // LÓGICA ORIGINAL: Determinar skipExisting basado en si es incremental y base poblada
      let skipExisting = false;
      if (!fullImport) {
        // Para incrementales: optimizar saltando existentes en bases pobladas (152K+ piezas)
        const existingPartsCount = await db.select({ count: sql<number>`count(*)` }).from(parts);
        const isPopulatedDatabase = existingPartsCount[0]?.count > 10000;
        
        if (isPopulatedDatabase) {
          skipExisting = true;
          console.log(`🎯 IMPORTACIÓN INCREMENTAL: Base poblada detectada (${existingPartsCount[0]?.count} piezas) - Aplicando optimización skipExisting`);
        }
      }
      
      console.log(`🚀 Iniciando importación de piezas - fullImport=${fullImport}, skipExisting=${skipExisting}`);
      
      // ✨ NUEVO SISTEMA DE SINCRONIZACIÓN (Octubre 7, 2025)
      // Para importaciones completas: rastrear todas las ref_local recibidas del API
      const receivedPartIds = new Set<number>();
      
      // Registrar inicio
      await db
        .update(importHistory)
        .set({
          status: 'in_progress',
          details: { 
            syncControlId: syncData.id,
            lastSyncDate: syncData.lastSyncDate.toISOString(),
            lastId: syncData.lastId
          }
        })
        .where(eq(importHistory.id, importId));
      
      // Inicializar variables para paginación
      let lastId = syncData.lastId;
      let moreRecordsExist = true;
      let totalProcessed = 0;
      let errors: string[] = [];
      let lastModDate = syncData.lastSyncDate;
      let pendingPartsCount = 0;
      const batchSize = 1000; // Máximo rendimiento para importaciones
      
      // Procesar en bucle mientras haya más registros
      while (moreRecordsExist) {
        try {
          // Actualizar progreso
          await db
            .update(importHistory)
            .set({
              processingItem: `Procesando piezas desde lastId=${lastId}`
            })
            .where(eq(importHistory.id, importId));
          
          // Obtener lote de piezas
          console.log(`Intentando obtener piezas desde API con lastId=${lastId}, fecha=${syncData.lastSyncDate.toISOString()}`);
          
          // CORRECCIÓN: Usar siempre RecuperarCambiosCanal sin añadir el canal en la URL
          // El canal se proporcionará como encabezado en la petición
          const endpoint = 'RecuperarCambiosCanal';
            
          console.log(`Usando endpoint: ${endpoint}`);
          
          const formattedDate = this.formatDate(syncData.lastSyncDate);
          console.log(`Fecha formateada para API de piezas: ${formattedDate}`);
          console.log(`${fullImport ? '🔄 IMPORTACIÓN COMPLETA' : '📤 IMPORTACIÓN INCREMENTAL'}: usando fecha ${formattedDate}`);
          
          // Según documentación oficial: lastId para paginación y offset máximo de 1000
          console.log(`API Inventario - Solicitando piezas con: [fecha=${formattedDate}, lastId=${lastId}, offset=${batchSize}]`);
          const data = await this.fetchWithRetry(endpoint, {
            fecha: formattedDate, 
            lastId, 
            offset: batchSize // Máximo 1000 según documentación
          });
          
          console.log(`Respuesta de API recibida para piezas, analizando formato...`);
          
          // Hacer un análisis más detallado de la estructura para diagnóstico
          const keys = Object.keys(data);
          console.log(`Keys en el primer nivel: ${keys.join(', ')}`);
          
          // Inspeccionar la estructura de datos recibida
          let dataStructure = 'Estructura de respuesta: { ';
          for (const key of keys) {
            const value = data[key];
            const type = Array.isArray(value) ? `array[${value.length}]` : 
                        (value === null ? 'null' : 
                        (typeof value === 'object' ? 'object' : typeof value));
            dataStructure += `${key}: ${type}, `;
            
            // Si es un objeto, también inspeccionar sus keys
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              const subKeys = Object.keys(value);
              if (subKeys.length > 0) {
                dataStructure += `{ ${subKeys.join(', ')} }, `;
              }
            }
          }
          dataStructure += ' }';
          console.log(dataStructure);
          
          // Intentar diferentes formatos de respuesta conocidos para piezas
          let partBatch: any[] = [];
          
          // Caso 1: formato data.data.piezas (más común)
          if (data.data?.piezas && Array.isArray(data.data.piezas)) {
            console.log(`Formato encontrado: data.data.piezas con ${data.data.piezas.length} elementos`);
            partBatch = data.data.piezas;
          } 
          // Caso 2: formato data.piezas
          else if (data.piezas && Array.isArray(data.piezas)) {
            console.log(`Formato encontrado: data.piezas con ${data.piezas.length} elementos`);
            partBatch = data.piezas;
          }
          // Caso 3: formato elementos en data
          else if (data.elements && Array.isArray(data.elements)) {
            console.log(`Formato encontrado: elements con ${data.elements.length} elementos`);
            partBatch = data.elements;
          }
          // Caso 4: formato de la propiedad data como array
          else if (data.data && Array.isArray(data.data)) {
            console.log(`Formato encontrado: data[] con ${data.data.length} elementos`);
            partBatch = data.data;
          }
          // Caso 5: formato piezas en raíz
          else if (data.items && Array.isArray(data.items)) {
            console.log(`Formato encontrado: items con ${data.items.length} elementos`);
            partBatch = data.items;
          }
          // Caso 6: formato Partes (capitalización diferente)
          else if (data.Partes && Array.isArray(data.Partes)) {
            console.log(`Formato encontrado: Partes con ${data.Partes.length} elementos`);
            partBatch = data.Partes;
          }
          // Caso 7: formato data.data.Partes
          else if (data.data?.Partes && Array.isArray(data.data.Partes)) {
            console.log(`Formato encontrado: data.data.Partes con ${data.data.Partes.length} elementos`);
            partBatch = data.data.Partes;
          }
          // Caso 8: formato data.Partes
          else if (data.Partes && Array.isArray(data.Partes)) {
            console.log(`Formato encontrado: data.Partes con ${data.Partes.length} elementos`);
            partBatch = data.Partes;
          }
          // Caso 9: formato piezas en canal (pueden venir en el campo canal)
          else if (data.canal?.piezas && Array.isArray(data.canal.piezas)) {
            console.log(`Formato encontrado: canal.piezas con ${data.canal.piezas.length} elementos`);
            partBatch = data.canal.piezas;
          }
          // Caso 10: tal vez los datos estén en otro nivel
          else {
            // Buscar propiedades que podrían contener arrays
            const possibleArrayProps = Object.keys(data).filter(key => 
              Array.isArray(data[key]) && data[key].length > 0
            );
            
            if (possibleArrayProps.length > 0) {
              const propName = possibleArrayProps[0];
              console.log(`Formato alternativo encontrado: ${propName} con ${data[propName].length} elementos`);
              partBatch = data[propName];
            } 
            // Buscar en niveles más profundos
            else if (data.data && typeof data.data === 'object') {
              const deepArrayProps = Object.keys(data.data).filter(key => 
                Array.isArray(data.data[key]) && data.data[key].length > 0
              );
              
              if (deepArrayProps.length > 0) {
                const propName = deepArrayProps[0];
                console.log(`Formato profundo encontrado: data.${propName} con ${data.data[propName].length} elementos`);
                partBatch = data.data[propName];
              } else {
                console.log(`No se encontraron piezas en la respuesta API.`);
                // Mostrar un fragmento de la respuesta para diagnóstico
                console.log(`Muestra de la respuesta: ${JSON.stringify(data).substring(0, 500)}...`);
                
                // No lanzar error, simplemente asumir que no hay datos
                partBatch = [];
              }
            } else {
              console.log(`No se encontraron piezas en la respuesta API.`);
              // Mostrar un fragmento de la respuesta para diagnóstico
              console.log(`Muestra de la respuesta: ${JSON.stringify(data).substring(0, 500)}...`);
              
              // No lanzar error, simplemente asumir que no hay datos
              partBatch = [];
            }
          }
          
          // Si no hay piezas, terminar
          if (partBatch.length === 0) {
            moreRecordsExist = false;
            continue;
          }
          
          // Extraer datos de vehículos si están disponibles en la respuesta
          let vehicleBatch: any[] = [];
          
          // CRÍTICO: La API MetaSync envía datos de vehículos procesados de forma inconsistente
          // Implementar estrategia robusta de múltiples fuentes
          
          // Estrategia 1: Array vehiculos en la respuesta (principal)
          if (data.vehiculos && Array.isArray(data.vehiculos)) {
            vehicleBatch = data.vehiculos;
            console.log(`📋 Array vehiculos encontrado en raíz: ${vehicleBatch.length} vehículos`);
          } else if (data.data?.vehiculos && Array.isArray(data.data.vehiculos)) {
            vehicleBatch = data.data.vehiculos;
            console.log(`📋 Array vehiculos encontrado en data.vehiculos: ${vehicleBatch.length} vehículos`);
          }
          
          // SOLUCIÓN DIRECTA (30 JUL 2025): Extraer datos directamente del array vehiculos del API
          // El endpoint RecuperarCambiosCanal devuelve SEPARADOS los datos:
          // - data.vehiculos: Array con información completa de vehículos  
          // - data.piezas: Array con piezas que referencian vehículos por idVehiculo
          
          console.log(`🎯 EXTRAYENDO DATOS DIRECTOS DEL API - vehiculos: ${vehicleBatch.length}, piezas: ${partBatch.length}`);
          
          // Crear mapa de vehículos para correlación eficiente
          const vehiculosApiMap = new Map();
          
          if (vehicleBatch.length > 0) {
            console.log(`📋 Procesando ${vehicleBatch.length} vehículos del array vehiculos...`);
            
            for (const vehiculo of vehicleBatch) {
              if (vehiculo.idLocal || vehiculo.id) {
                const vehiculoId = vehiculo.idLocal || vehiculo.id;
                
                // Extraer DIRECTAMENTE los datos que vienen en el API
                const vehiculoData = {
                  idLocal: vehiculoId,
                  idEmpresa: vehiculo.idEmpresa || this.companyId,
                  fechaMod: vehiculo.fechaMod || new Date().toISOString(),
                  codigo: vehiculo.codigo || vehiculo.Codigo || `REF-${vehiculoId}`,
                  // DATOS DIRECTOS DEL API - usar múltiples variaciones de nombres de campo
                  nombreMarca: vehiculo.nombreMarca || vehiculo.marca || vehiculo.Marca || vehiculo.brand || '',
                  nombreModelo: vehiculo.nombreModelo || vehiculo.modelo || vehiculo.Modelo || vehiculo.model || '',
                  nombreVersion: vehiculo.nombreVersion || vehiculo.version || vehiculo.Version || vehiculo.codVersion || '',
                  anyoVehiculo: vehiculo.anyoVehiculo || vehiculo.anyo || vehiculo.Anyo || vehiculo.year || 0,
                  combustible: vehiculo.combustible || vehiculo.Combustible || vehiculo.fuel || '',
                  // Campos adicionales
                  codMarca: vehiculo.codMarca || vehiculo.brandCode || '',
                  codModelo: vehiculo.codModelo || vehiculo.modelCode || '',
                  codVersion: vehiculo.codVersion || vehiculo.versionCode || '',
                  bastidor: vehiculo.bastidor || vehiculo.Bastidor || vehiculo.vin || '',
                  matricula: vehiculo.matricula || vehiculo.Matricula || vehiculo.plate || '',
                  color: vehiculo.color || vehiculo.Color || '',
                  kilometraje: vehiculo.kilometraje || vehiculo.Kilometraje || vehiculo.mileage || 0,
                  potencia: vehiculo.potencia || vehiculo.Potencia || vehiculo.power || 0,
                  puertas: vehiculo.puertas || vehiculo.Puertas || vehiculo.doors || null,
                  // Imágenes
                  imagenes: vehiculo.imagenes || vehiculo.Imagenes || vehiculo.images || ["https://via.placeholder.com/150?text=Sin+Imagen"]
                };
                
                vehiculosApiMap.set(vehiculoId, vehiculoData);
                
                // Log para diagnóstico de casos específicos como la pieza 994087
                if (vehiculoData.nombreMarca && vehiculoData.nombreModelo) {
                  console.log(`  ✅ VEHÍCULO COMPLETO: ID=${vehiculoId}, Marca=${vehiculoData.nombreMarca}, Modelo=${vehiculoData.nombreModelo}`);
                } else {
                  console.log(`  ⚠️ VEHÍCULO INCOMPLETO: ID=${vehiculoId}, Marca=${vehiculoData.nombreMarca || 'VACÍO'}, Modelo=${vehiculoData.nombreModelo || 'VACÍO'}`);
                  
                  // Mostrar todos los campos disponibles para diagnóstico
                  const camposDisponibles = Object.keys(vehiculo).filter(k => vehiculo[k] !== null && vehiculo[k] !== undefined && vehiculo[k] !== '');
                  console.log(`    Campos disponibles: ${camposDisponibles.join(', ')}`);
                }
              }
            }
            
            console.log(`📋 Mapa de vehículos API creado: ${vehiculosApiMap.size} vehículos disponibles`);
            
            // Mostrar muestra de IDs para diagnóstico
            const idsDisponibles = Array.from(vehiculosApiMap.keys()).slice(0, 10);
            console.log(`    IDs de muestra: ${idsDisponibles.join(', ')}...`);
          }
          
          // Buscar piezas procesadas que necesitan datos de vehículo
          const piezasProcesadas = partBatch.filter(p => p.idVehiculo < 0);
          
          if (piezasProcesadas.length > 0) {
            console.log(`🔍 Encontradas ${piezasProcesadas.length} piezas procesadas, aplicando datos directos del API...`);
            
            let correlacionesExitosas = 0;
            let correlacionesFallidas = 0;
            
            // Procesar cada pieza procesada
            for (const pieza of piezasProcesadas) {
              const idVehiculo = pieza.idVehiculo;
              
              // Buscar vehículo en el mapa del API
              const vehiculoApi = vehiculosApiMap.get(idVehiculo);
              
              if (vehiculoApi && (vehiculoApi.nombreMarca || vehiculoApi.nombreModelo)) {
                // ✅ DATOS ENCONTRADOS EN EL API
                correlacionesExitosas++;
                console.log(`  ✅ DATOS API: ID=${idVehiculo}, Marca=${vehiculoApi.nombreMarca}, Modelo=${vehiculoApi.nombreModelo}`);
              } else {
                // ❌ Datos no disponibles en el API para este vehículo
                correlacionesFallidas++;
                console.log(`  ❌ SIN DATOS API: ID=${idVehiculo} - Marca/Modelo vacíos en respuesta API`);
              }
            }
            
            console.log(`📊 RESULTADO CORRELACIÓN API: ${correlacionesExitosas} exitosas, ${correlacionesFallidas} fallidas de ${piezasProcesadas.length} piezas procesadas`);
            
            // El mapeo de vehiculosApiMap se usará en normalizePart() para completar datos de vehículos directamente
          }
          
          // Log crítico para debug: mostrar cuántos vehículos procesados están en el lote
          if (vehicleBatch.length > 0) {
            const vehiculosProcesados = vehicleBatch.filter(v => v.idLocal < 0).length;
            console.log(`🔍 ANÁLISIS VEHÍCULOS EN LOTE: Total=${vehicleBatch.length}, Procesados=${vehiculosProcesados}, Físicos=${vehicleBatch.length - vehiculosProcesados}`);
            
            // Mostrar ejemplos de vehículos procesados si los hay
            if (vehiculosProcesados > 0) {
              const ejemplosVehiculosProcesados = vehicleBatch.filter(v => v.idLocal < 0).slice(0, 3);
              for (const vehiculo of ejemplosVehiculosProcesados) {
                console.log(`  📋 Vehículo procesado encontrado: ID=${vehiculo.idLocal}, Marca=${vehiculo.nombreMarca || vehiculo.marca || 'PENDIENTE'}, Modelo=${vehiculo.nombreModelo || vehiculo.modelo || 'PENDIENTE'}`);
              }
            }
          } else {
            console.log(`⚠️ No se encontraron vehículos en la respuesta de la API para este lote de piezas`);
          }
          
          // ✨ RASTREAR PIEZAS EN IMPORTACIONES COMPLETAS (Octubre 7, 2025)
          if (fullImport && partBatch && partBatch.length > 0) {
            partBatch.forEach(part => {
              if (part.refLocal) {
                receivedPartIds.add(part.refLocal);
              }
            });
            console.log(`📊 Rastreadas ${receivedPartIds.size} piezas únicas del API hasta ahora`);
          }
          
          // Procesar lote dentro de una transacción con mapa de vehículos del API y optimización opcional
          const batchResult = await this.processPartBatch(partBatch, vehicleBatch, vehiculosApiMap, skipExisting);
          
          // Actualizar contadores
          totalProcessed += partBatch.length;
          pendingPartsCount += batchResult.pending;
          
          // Actualizar ID para paginación según las diferentes posibilidades en la respuesta
          console.log(`Analizando respuesta para obtener lastId de paginación...`);
          
          // Caso 1: Verificar si hay un result_set con lastId (formato documentado)
          if (data.result_set?.lastId) {
            console.log(`Avanzando paginación con result_set.lastId: ${lastId} -> ${data.result_set.lastId}`);
            lastId = data.result_set.lastId;
          }
          // Caso 2: Verificar si hay un paginacion.lastId (formato alternativo)
          else if (data.paginacion?.lastId) {
            console.log(`Avanzando paginación con paginacion.lastId: ${lastId} -> ${data.paginacion.lastId}`);
            lastId = data.paginacion.lastId;
          } 
          // Caso 3: Si no hay paginación explícita, usar el ID del último elemento del lote
          else if (partBatch.length > 0) {
            const lastItem = partBatch[partBatch.length - 1];
            if (lastItem.refLocal) {
              console.log(`Usando refLocal de la última pieza para paginación: ${lastId} -> ${lastItem.refLocal}`);
              lastId = lastItem.refLocal;
            } else if (lastItem.id) {
              console.log(`Usando id de la última pieza para paginación: ${lastId} -> ${lastItem.id}`);
              lastId = lastItem.id;
            }
          }
          
          console.log(`Nuevo lastId para próximo lote: ${lastId}`);
          
          
          // Determinar fecha más reciente
          for (const part of partBatch) {
            if (part.fechaMod) {
              const modDate = new Date(part.fechaMod);
              if (modDate > lastModDate) {
                lastModDate = modDate;
              }
            }
          }
          
          // Añadir errores si hay
          if (batchResult.errorMessages.length > 0) {
            errors = [...errors, ...batchResult.errorMessages];
          }
          
          // Obtener contadores acumulativos actuales de la base de datos
          const [currentImport] = await db
            .select({ newItems: importHistory.newItems, updatedItems: importHistory.updatedItems })
            .from(importHistory)
            .where(eq(importHistory.id, importId));
          
          const accumulatedNew = (currentImport?.newItems || 0) + batchResult.inserted;
          const accumulatedUpdated = (currentImport?.updatedItems || 0) + batchResult.updated;
          
          // Actualizar progreso con contadores acumulativos
          await db
            .update(importHistory)
            .set({
              processedItems: totalProcessed,
              newItems: accumulatedNew,
              updatedItems: accumulatedUpdated,
              errors: Array.isArray(errors) ? errors : [],
              errorCount: Array.isArray(errors) ? errors.length : 0,
              progress: Math.min(95, Math.floor((totalProcessed / (totalProcessed + 100)) * 100)), // Estimación
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importId));
          
          // Verificar si hay más registros
          if (importId) {
            const [importRecord] = await db
              .select()
              .from(importHistory)
              .where(eq(importHistory.id, importId));
            
            // Lógica mejorada para importaciones completas vs incrementales
            if (importRecord && importRecord.isFullImport) {
              // Para importaciones COMPLETAS:
              // 1. Verificar si hay más registros según la respuesta de la API
              // 2. Continuar hasta que la API indique que no hay más
              
              // Para importaciones COMPLETAS, continuamos mientras tengamos datos en el lote actual
              // y haya un lastId válido para continuar (o total de registros API > procesados)
              
              // Verificar campos en la API (resultset o paginacion)
              const hasMoreFromResultSet = data.result_set?.masRegistros === true;
              const hasMoreFromPaginacion = data.paginacion?.masRegistros === true;
              const hasExplicitMoreFlag = hasMoreFromResultSet || hasMoreFromPaginacion;
              
              // Verificar conteo total disponible
              const totalRecordsInApi = data.result_set?.total || 0;
              const hasMoreBasedOnCount = totalRecordsInApi > 0 && totalProcessed < totalRecordsInApi;
              
              // Verificar datos recibidos
              const hasMoreBasedOnBatch = partBatch.length > 0 && partBatch.length >= 100; // Si recibimos lotes completos
              
              // CORRECCIÓN: Si ya procesamos todas las piezas disponibles según el API, detener
              const hasProcessedAll = totalRecordsInApi > 0 && totalProcessed >= totalRecordsInApi;
              
              // Combinar criterios - continuar si cualquiera indica que hay más PERO NO si ya procesamos todo
              const hasMore = !hasProcessedAll && (hasExplicitMoreFlag || hasMoreBasedOnCount || hasMoreBasedOnBatch);
              
              console.log(`Verificando continuación piezas COMPLETAS: explicitFlag=${hasExplicitMoreFlag}, totalAPI=${totalRecordsInApi}, procesados=${totalProcessed}, hasProcessedAll=${hasProcessedAll}, tamaño lote=${partBatch.length}`);
              
              if (!hasMore) {
                moreRecordsExist = false;
                console.log(`Importación COMPLETA de piezas finalizada. No hay más datos.`);
              } else {
                moreRecordsExist = true;
                console.log(`Importación COMPLETA de piezas en progreso, procesadas ${totalProcessed} piezas. Continuando con lastId=${lastId}`);
              }
            } else {
              // Para importaciones INCREMENTALES aplicamos la misma lógica
              // Verificar campos en la API (resultset o paginacion)
              const hasMoreFromResultSet = data.result_set?.masRegistros === true;
              const hasMoreFromPaginacion = data.paginacion?.masRegistros === true;
              const hasExplicitMoreFlag = hasMoreFromResultSet || hasMoreFromPaginacion;
              
              // Verificar conteo total disponible
              const totalRecordsInApi = data.result_set?.total || 0;
              const hasMoreBasedOnCount = totalRecordsInApi > 0 && totalProcessed < totalRecordsInApi;
              
              // Verificar datos recibidos - pero NO continuar si ya procesamos todo
              const hasMoreBasedOnBatch = partBatch.length > 0 && partBatch.length >= 100;
              
              // CORRECCIÓN: Si ya procesamos todas las piezas disponibles según el API, detener
              const hasProcessedAll = totalRecordsInApi > 0 && totalProcessed >= totalRecordsInApi;
              
              // Para incrementales: detener si ya procesamos todo, o si no hay flag explícito Y no hay nuevos datos
              const hasMore = !hasProcessedAll && (hasExplicitMoreFlag || (hasMoreBasedOnCount && hasMoreBasedOnBatch));
              
              moreRecordsExist = hasMore;
              console.log(`Importación incremental de piezas, análisis continuación: explicitFlag=${hasExplicitMoreFlag}, totalAPI=${totalRecordsInApi}, procesados=${totalProcessed}, hasProcessedAll=${hasProcessedAll}, continúa: ${moreRecordsExist}`);
            }
          } else {
            // Comportamiento por defecto (sin importId)
            moreRecordsExist = partBatch.length > 0;
          }
          
          // Actualizar control de sincronización periódicamente
          await this.updateSyncControl(
            syncData.id,
            lastModDate,
            lastId,
            syncData.recordsProcessed + totalProcessed
          );
          
        } catch (batchError: any) {
          const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
          errors.push(`Error al procesar lote: ${errorMsg}`);
          console.error('Error procesando lote de piezas:', batchError);
          
          // Si es un error crítico, detener proceso
          if (errors.length > 10) {
            throw new Error('Demasiados errores durante la importación');
          }
        }
        
        // Pausa corta entre lotes para estabilidad (piezas)
        if (moreRecordsExist) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Intentar resolver relaciones pendientes
      if (pendingPartsCount > 0) {
        console.log(`Intentando resolver ${pendingPartsCount} piezas pendientes`);
        const { resolved } = await this.processPendingRelations();
        console.log(`Resueltas ${resolved} relaciones pendientes`);
      }
      
      // 🎯 OPTIMIZACIÓN PARA IMPORTACIONES INCREMENTALES
      // Solo ejecutar eliminación de obsoletos en importaciones incrementales 
      // con protecciones adicionales para preservar datos válidos
      console.log(`🔍 DEBUG: Verificando condiciones para sincronización de piezas eliminadas:`);
      console.log(`   - importId: ${importId}`);
      console.log(`   - fullImport (parámetro método): ${fullImport}`);
      
      if (importId) {
        const [importRecord] = await db
          .select()
          .from(importHistory)
          .where(eq(importHistory.id, importId));
        
        console.log(`   - importRecord existe: ${!!importRecord}`);
        console.log(`   - importRecord.isFullImport: ${importRecord?.isFullImport}`);
        console.log(`   - Condición !importRecord.isFullImport: ${!importRecord?.isFullImport}`);
        console.log(`   - Condición !fullImport: ${!fullImport}`);
        console.log(`   - Condición COMPLETA: ${!!(importRecord && !importRecord.isFullImport && !fullImport)}`);
        
        if (importRecord && !importRecord.isFullImport && !fullImport) {
          // ⚠️ SINCRONIZACIÓN AUTOMÁTICA DESACTIVADA (Octubre 7, 2025)
          // PROBLEMA DETECTADO: Las importaciones incrementales solo traen cambios recientes,
          // NO todo el catálogo. Marcar como no disponibles las piezas que no aparecen
          // en una importación incremental es incorrecto porque la mayoría de piezas
          // simplemente no cambiaron, no fueron vendidas.
          //
          // SOLUCIÓN TEMPORAL: Desactivar sincronización automática
          // SOLUCIÓN FUTURA: Implementar verificación periódica con catálogo completo
          // o usar un umbral de tiempo más largo (ej: 30 días sin confirmación)
          console.log('⚠️ SINCRONIZACIÓN AUTOMÁTICA DESACTIVADA');
          console.log('   - Las importaciones incrementales solo traen cambios recientes');
          console.log('   - No se marcarán piezas como no disponibles automáticamente');
          console.log('   - Se requiere verificación manual o sistema de catálogo completo');
        } else if (importRecord && importRecord.isFullImport) {
          // ✨ NUEVO SISTEMA DE SINCRONIZACIÓN PARA IMPORTACIONES COMPLETAS (Octubre 7, 2025)
          console.log('🔄 IMPORTACIÓN COMPLETA: Ejecutando sincronización inteligente de piezas vendidas');
          console.log(`   - Total de piezas recibidas del API: ${receivedPartIds.size}`);
          
          if (receivedPartIds.size > 0) {
            try {
              // Obtener todas las piezas activas y disponibles en BD
              const existingParts = await db
                .select({ refLocal: parts.refLocal })
                .from(parts)
                .where(
                  sql`activo = true 
                      AND disponible_api = true 
                      AND precio IS NOT NULL 
                      AND precio::numeric > 0`
                );
              
              console.log(`   - Total de piezas activas en BD: ${existingParts.length}`);
              
              // Identificar piezas que están en BD pero NO llegaron del API (vendidas)
              const soldParts: number[] = [];
              for (const part of existingParts) {
                if (!receivedPartIds.has(part.refLocal)) {
                  soldParts.push(part.refLocal);
                }
              }
              
              console.log(`   - Piezas vendidas detectadas: ${soldParts.length}`);
              
              // VALIDACIÓN DE SEGURIDAD: No marcar como vendidas si el cambio es muy grande
              const percentageChange = (soldParts.length / existingParts.length) * 100;
              const SAFETY_THRESHOLD = 10; // No permitir cambios mayores al 10%
              
              if (percentageChange > SAFETY_THRESHOLD) {
                console.log(`⚠️ ALERTA DE SEGURIDAD: Se detectó un cambio del ${percentageChange.toFixed(1)}% del catálogo`);
                console.log(`   - Umbral de seguridad: ${SAFETY_THRESHOLD}%`);
                console.log(`   - La sincronización NO se ejecutará para prevenir errores masivos`);
                console.log(`   - Por favor revise manualmente la importación del API`);
                errors.push(`Sincronización cancelada: cambio del ${percentageChange.toFixed(1)}% excede umbral de seguridad (${SAFETY_THRESHOLD}%)`);
              } else if (soldParts.length > 0) {
                // Marcar piezas vendidas como no disponibles
                const result = await db
                  .update(parts)
                  .set({
                    disponibleApi: false,
                    fechaActualizacion: new Date()
                  })
                  .where(sql`ref_local = ANY(${soldParts})`)
                  .returning({ refLocal: parts.refLocal });
                
                console.log(`✅ Sincronización completada:`);
                console.log(`   - ${result.length} piezas marcadas como no disponibles (vendidas)`);
                
                // Mostrar referencias para auditoría
                if (result.length <= 20) {
                  const refs = result.map(r => r.refLocal).join(', ');
                  console.log(`   - Referencias marcadas: ${refs}`);
                } else {
                  const refs = result.slice(0, 10).map(r => r.refLocal).join(', ');
                  console.log(`   - Primeras 10 referencias: ${refs}... (+${result.length - 10} más)`);
                }
              } else {
                console.log('✅ No se detectaron piezas vendidas - todos los artículos del API están en BD');
              }
            } catch (syncError) {
              console.error('⚠️ Error en sincronización de importación completa:', syncError);
              errors.push(`Error en sincronización: ${syncError instanceof Error ? syncError.message : String(syncError)}`);
            }
          } else {
            console.log('⚠️ No se recibieron piezas del API - omitiendo sincronización');
          }
        } else {
          console.log('❌ NO SE CUMPLEN LAS CONDICIONES para sincronización de piezas eliminadas');
        }
      } else {
        console.log('❌ No hay importId - saltando sincronización de piezas eliminadas');
      }
      
      // Actualizar contadores de piezas en vehículos después de la importación
      console.log('🔄 Actualizando contadores de piezas en vehículos...');
      await this.updateVehiclePartsCounters();
      console.log('✅ Contadores de piezas actualizados correctamente');
      
      // 🔧 CORRECCIÓN AUTOMÁTICA DE DATOS DE VEHÍCULO (Agregado: 29/07/2025)
      // Después de cada importación de piezas, ejecutar corrección automática
      // para completar datos de vehículo que faltan en piezas procesadas
      console.log('🔧 Ejecutando corrección automática de datos de vehículo en piezas...');
      try {
        // 1. Ejecutar corrección para piezas regulares (idVehiculo > 0)
        const { PartsVehicleUpdater } = await import('../services/parts-vehicle-updater');
        const updater = new PartsVehicleUpdater();
        await updater.executeFullUpdate();
        
        // 2. Ejecutar corrección específica para piezas procesadas (idVehiculo < 0)
        console.log('🔧 Corrección específica para piezas procesadas...');
        const correctedProcessedCount = await this.correctProcessedPartsVehicleData();
        console.log(`✅ ${correctedProcessedCount} piezas procesadas actualizadas con datos de vehículo`);
        
        console.log('✅ Corrección automática de datos de vehículo completada');
      } catch (vehicleUpdateError) {
        console.error('⚠️ Error en corrección automática de vehículos:', vehicleUpdateError);
        // No detener la importación por este error, solo registrarlo
        errors.push(`Error en corrección de vehículos: ${vehicleUpdateError instanceof Error ? vehicleUpdateError.message : String(vehicleUpdateError)}`);
      }
      
      // Actualizar control de sincronización final
      await this.updateSyncControl(
        syncData.id,
        lastModDate,
        lastId,
        syncData.recordsProcessed + totalProcessed
      );
      
      // Completar importación
      await db
        .update(importHistory)
        .set({
          status: errors.length > 0 ? 'partial' : 'completed',
          progress: 100,
          processedItems: totalProcessed,
          errors,
          errorCount: errors.length,
          processingItem: 'Importación completada',
          endTime: new Date()
        })
        .where(eq(importHistory.id, importId));
      
      console.log(`Importación de piezas completada. Total: ${totalProcessed}`);
      
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
          endTime: new Date()
        })
        .where(eq(importHistory.id, importId));
    }
  }
  
  /**
   * Procesa un lote de piezas con manejo optimizado para volúmenes masivos usando datos directos del API
   */
  private async processPartBatch(partBatch: any[], vehicleBatch?: any[], vehiculosApiMap?: Map<any, any>, skipExisting = false): Promise<{
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
      // OPTIMIZACIÓN: Verificar qué piezas ya existen si se solicita saltar existentes
      let partsToProcess = partBatch;
      let skippedCount = 0;
      
      if (skipExisting) {
        const existingIds = await this.checkExistingParts(partBatch);
        partsToProcess = partBatch.filter(p => !existingIds.has(p.refLocal));
        skippedCount = partBatch.length - partsToProcess.length;
        
        if (skippedCount > 0) {
          console.log(`⚡ OPTIMIZACIÓN: Saltando ${skippedCount} piezas existentes de ${partBatch.length} totales`);
        }
        
        // Si todas las piezas ya existen, retornar inmediatamente
        if (partsToProcess.length === 0) {
          return { 
            inserted: 0, 
            updated: skippedCount, 
            pending: 0, 
            errorMessages: [] 
          };
        }
      }
      // Crear mapa de vehículos por idLocal si están disponibles
      const vehicleMap = new Map();
      if (vehicleBatch && vehicleBatch.length > 0) {
        console.log(`🚗 Procesando ${vehicleBatch.length} vehículos del endpoint para crear mapa...`);
        
        for (const vehicleData of vehicleBatch) {
          if (vehicleData.idLocal) {
            vehicleMap.set(vehicleData.idLocal, vehicleData);
            
            // Log específico para vehículos procesados (ID negativo)
            if (vehicleData.idLocal < 0) {
              console.log(`  ✅ Vehículo procesado mapeado: ID ${vehicleData.idLocal} - ${vehicleData.nombreMarca || vehicleData.marca} ${vehicleData.nombreModelo || vehicleData.modelo}`);
            }
          }
        }
        
        console.log(`🗺️ Mapa de vehículos creado con ${vehicleMap.size} entradas`);
        const vehiculosProcesados = vehicleBatch.filter(v => v.idLocal < 0).length;
        console.log(`  - Vehículos físicos: ${vehicleBatch.length - vehiculosProcesados}`);
        console.log(`  - Vehículos procesados: ${vehiculosProcesados}`);
      }
      
      // Extraer todos los IDs para búsquedas eficientes
      const partIds = partBatch.map(p => p.refLocal);
      const vehicleIds = Array.from(new Set(partBatch.map(p => p.idVehiculo).filter(id => id !== null && id !== undefined)));
      
      // Buscar piezas existentes en una sola consulta optimizada
      // Usar chunking para evitar queries muy grandes que pueden ser lentas
      const existingParts = [];
      const chunkSize = 1000;
      
      for (let i = 0; i < partIds.length; i += chunkSize) {
        const chunk = partIds.slice(i, i + chunkSize);
        const chunkResults = await db
          .select({ id: parts.id, refLocal: parts.refLocal })
          .from(parts)
          .where(inArray(parts.refLocal, chunk));
        
        existingParts.push(...chunkResults);
      }
      
      // Buscar vehículos existentes con chunking optimizado
      const existingVehicles = [];
      const vehicleChunkSize = 500;
      
      for (let i = 0; i < vehicleIds.length; i += vehicleChunkSize) {
        const chunk = vehicleIds.slice(i, i + vehicleChunkSize);
        if (chunk.length > 0) {
          const chunkResults = await db
            .select({ id: vehicles.id, idLocal: vehicles.idLocal })
            .from(vehicles)
            .where(inArray(vehicles.idLocal, chunk));
          
          existingVehicles.push(...chunkResults);
        }
      }
      
      // Mapas para acceso rápido
      const existingPartsMap = new Map(
        existingParts.map(p => [p.refLocal, p.id])
      );
      
      const existingVehiclesMap = new Map(
        existingVehicles.map(v => [v.idLocal, v.id])
      );
      
      // Preparar lotes para inserción y actualización
      const partsToInsert = [];
      const partsToUpdate = [];
      const partsToUpdateTimestamp = []; // Solo actualizar timestamp para piezas saltadas en incremental
      
      for (const partData of partBatch) {
        try {
          // Verificar si existe el vehículo
          const vehicleExists = partData.idVehiculo && existingVehiclesMap.has(partData.idVehiculo);
          
          // Obtener datos del vehículo desde el mapa si está disponible
          let vehicleData = null;
          if (partData.idVehiculo && vehicleMap.has(partData.idVehiculo)) {
            vehicleData = vehicleMap.get(partData.idVehiculo);
            
            // Log específico para piezas procesadas que encuentran su vehículo
            if (partData.idVehiculo < 0) {
              console.log(`  🎯 Pieza procesada ${partData.refLocal}: ENCONTRÓ vehículo ${partData.idVehiculo} - ${vehicleData.nombreMarca || vehicleData.marca} ${vehicleData.nombreModelo || vehicleData.modelo}`);
            }
          } else if (!vehicleData && partData.idVehiculo && existingVehiclesMap.has(partData.idVehiculo)) {
            // Si no está en el mapa, buscar en la base de datos para obtener los datos del vehículo
            const [existingVehicle] = await db
              .select()
              .from(vehicles)
              .where(eq(vehicles.idLocal, partData.idVehiculo))
              .limit(1);
            
            if (existingVehicle) {
              vehicleData = {
                nombreMarca: existingVehicle.marca,
                nombreModelo: existingVehicle.modelo,
                nombreVersion: existingVehicle.version,
                anyoVehiculo: existingVehicle.anyo,
                combustible: existingVehicle.combustible
              };
            }
          } else if (!vehicleData && partData.idVehiculo < 0) {
            // Log específico para piezas procesadas que NO encuentran su vehículo
            console.log(`  ❌ Pieza procesada ${partData.refLocal}: NO encontró vehículo ${partData.idVehiculo} en el mapa (${vehicleMap.size} entradas)`);
          }
          
          // Normalizar datos usando datos directos del API cuando están disponibles
          const normalizedPart = this.normalizePart(partData, vehicleExists, vehicleData, vehiculosApiMap);
          
          // Solo desactivar piezas de vehículos físicos (idVehiculo > 0) que no existen
          // Las piezas de vehículos procesados (idVehiculo < 0) deben mantenerse activas
          if (!vehicleExists && partData.idVehiculo && partData.idVehiculo > 0) {
            normalizedPart.isPendingRelation = true;
            normalizedPart.activo = false;
            pending++;
          }
          
          // OPTIMIZACIÓN INCREMENTAL: Si skipExisting es true, saltar piezas existentes
          if (existingPartsMap.has(partData.refLocal)) {
            if (skipExisting) {
              // INCREMENTAL: Saltar actualización completa pero actualizar timestamp
              // CRÍTICO: Actualizar timestamp para confirmar que la pieza sigue en el API
              partsToUpdateTimestamp.push(existingPartsMap.get(partData.refLocal));
            } else {
              // COMPLETA: Actualizar piezas existentes
              partsToUpdate.push({
                ...normalizedPart,
                id: existingPartsMap.get(partData.refLocal)
              });
            }
          } else {
            // Si no existe, insertar (tanto incremental como completa)
            partsToInsert.push(normalizedPart);
          }
        } catch (partError) {
          const errorMsg = partError instanceof Error ? partError.message : String(partError);
          errors.push(`Error normalizando pieza ${partData.refLocal}: ${errorMsg}`);
        }
      }
      
      // Realizar inserciones en lote
      if (partsToInsert.length > 0) {
        // Añadir timestamp de confirmación API a nuevas piezas
        const partsWithConfirmation = partsToInsert.map(p => ({
          ...p,
          lastApiConfirmation: new Date()
        }));
        
        const result = await db
          .insert(parts)
          .values(partsWithConfirmation)
          .returning({ id: parts.id });
        
        inserted = result.length;
      }
      
      // Realizar actualizaciones en lote con chunking para mejor rendimiento
      if (partsToUpdate.length > 0) {
        const chunkSize = 100; // Procesar en grupos de 100 para evitar queries muy largas
        
        for (let i = 0; i < partsToUpdate.length; i += chunkSize) {
          const chunk = partsToUpdate.slice(i, i + chunkSize);
          
          // Usar transacción para cada chunk
          await db.transaction(async (tx) => {
            for (const part of chunk) {
              const id = part.id;
              delete part.id;
              
              await tx
                .update(parts)
                .set({
                  ...part,
                  lastApiConfirmation: new Date(), // Confirmar que sigue en el API
                  fechaActualizacion: sql`NOW()`
                })
                .where(eq(parts.id, id));
            }
          });
        }
      }
      
      updated = partsToUpdate.length;
      
      // Actualizar SOLO timestamps de piezas saltadas en importación incremental
      if (partsToUpdateTimestamp.length > 0) {
        console.log(`⏰ Actualizando timestamps de ${partsToUpdateTimestamp.length} piezas saltadas...`);
        
        const timestampChunkSize = 500; // Chunks más grandes para timestamps solamente
        let timestampUpdated = 0;
        
        for (let i = 0; i < partsToUpdateTimestamp.length; i += timestampChunkSize) {
          const chunk = partsToUpdateTimestamp.slice(i, i + timestampChunkSize);
          
          // Actualización rápida solo de timestamp
          await db
            .update(parts)
            .set({
              lastApiConfirmation: new Date() // Confirmar que sigue en el API
            })
            .where(inArray(parts.id, chunk));
          
          timestampUpdated += chunk.length;
        }
        
        console.log(`✅ ${timestampUpdated} timestamps actualizados (piezas confirmadas en API)`);
      }
      
    } catch (batchError) {
      const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
      errors.push(`Error procesando lote: ${errorMsg}`);
      console.error('Error en lote de piezas:', batchError);
    }
    
    return { inserted, updated, pending, errorMessages: errors };
  }

  /**
   * Sincronización automática completa - ejecuta tras cada importación
   * Elimina directamente las piezas que ya no están en la API para coincidencia 100%
   */
  async autoSyncWithApi(apiParts: any[]): Promise<void> {
    try {
      console.log('🔄 Iniciando sincronización completa automática (eliminación directa)...');
      
      const apiPartIds = new Set(apiParts.map(p => p.refLocal));
      
      if (apiPartIds.size > 0) {
        // Ejecutar eliminación directa para coincidencia 100%
        const syncResult = await this.syncRemovedParts(apiParts, 'eliminar');
        
        if (syncResult.deactivated > 0) {
          console.log(`🗑️ Sincronización completa: ${syncResult.deactivated} piezas eliminadas de la base de datos`);
          console.log(`✅ Base de datos local ahora coincide 100% con la API`);
        }
      }
      
    } catch (error) {
      console.error('Error en sincronización automática:', error);
    }
  }
  
  /**
   * Normaliza una pieza para la base de datos usando datos directos del API cuando están disponibles
   */
  private normalizePart(partData: any, vehicleExists: boolean = false, vehicleData?: any, vehiculosApiMap?: Map<any, any>): any {
    // Asegurar que los campos obligatorios existan
    if (!partData.refLocal) {
      throw new Error('Pieza sin refLocal');
    }
    
    // Normalizar imágenes usando el array normalizer para evitar errores "value.map is not a function"
    let imagenes: string[] = [];
    
    // Verificar todas las variantes posibles de nombres de campo para imágenes
    const imageFields = [
      partData.imagenes,
      partData.UrlsImgs,
      partData.urlsImgs,
      partData.Imagenes
    ];
    
    for (const imageField of imageFields) {
      if (imageField) {
        imagenes = normalizeImagenesArray(imageField);
        break;
      }
    }
    
    // Si no se encontraron imágenes válidas, usar la imagen por defecto - OPTIMIZADO
    if (imagenes.length === 0) {
      imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
    }
    
    // Normalizar descripción (campo obligatorio)
    let descripcionArticulo = partData.descripcionArticulo || partData.descripcion || '';
    if (!descripcionArticulo || descripcionArticulo.length < 3) {
      descripcionArticulo = `Pieza ID ${partData.refLocal}`;
    }
    
    // Normalizar familia (si no existe)
    const codFamilia = partData.codFamilia || partData.familia || '';
    const descripcionFamilia = partData.descripcionFamilia || 'General';
    
    // PRIORIDAD 1: Usar datos directos del mapa de vehículos del API
    let vehicleMarca = '';
    let vehicleModelo = '';
    let vehicleVersion = '';
    let vehicleAnyo = 0;
    let combustible = '';
    
    // 🎯 SOLUCIÓN DIRECTA (30 JUL 2025): Usar datos del mapa de vehículos del API como primera prioridad
    if (vehiculosApiMap && partData.idVehiculo && vehiculosApiMap.has(partData.idVehiculo)) {
      const vehiculoDelApi = vehiculosApiMap.get(partData.idVehiculo);
      
      if (vehiculoDelApi) {
        vehicleMarca = vehiculoDelApi.nombreMarca || '';
        vehicleModelo = vehiculoDelApi.nombreModelo || '';
        vehicleVersion = vehiculoDelApi.nombreVersion || '';
        vehicleAnyo = vehiculoDelApi.anyoVehiculo || 0;
        combustible = vehiculoDelApi.combustible || '';
        
        // Log específico para diagnosticar casos como la pieza 994087
        if (partData.idVehiculo < 0) {
          console.log(`🎯 DATOS API DIRECTOS para pieza procesada ${partData.refLocal}: Vehículo ${partData.idVehiculo} → ${vehicleMarca} ${vehicleModelo}`);
        }
      }
    }
    // PRIORIDAD 2: Usar vehicleData si no están en el mapa del API
    else if (vehicleData) {
      vehicleMarca = vehicleData.nombreMarca || vehicleData.marca || '';
      vehicleModelo = vehicleData.nombreModelo || vehicleData.modelo || '';
      vehicleVersion = vehicleData.nombreVersion || vehicleData.version || '';
      vehicleAnyo = vehicleData.anyoVehiculo || vehicleData.anyo || 0;
      combustible = vehicleData.combustible || '';
    } 
    // PRIORIDAD 3: Pattern matching como último recurso SOLO para piezas procesadas
    else if (partData.idVehiculo < 0) {
      // Opción 2: Para piezas de vehículos procesados (ID negativo)
      // ADVANCED PATTERN MATCHING (30 JUL 2025): Sistema mejorado de extracción de datos de vehículos
      
      // Recopilar todos los campos de texto disponibles para análisis
      const descripcionArticulo = partData.descripcionArticulo || '';
      const descripcionFamilia = partData.descripcionFamilia || '';
      const codFamilia = partData.codFamilia || '';
      const observaciones = partData.observaciones || '';
      
      // Crear un texto completo para análisis más exhaustivo
      const textoCompleto = `${descripcionFamilia} ${descripcionArticulo} ${observaciones}`.toUpperCase();
      
      // Lista expandida de marcas con variaciones comunes
      const marcasYVariaciones = {
        'AUDI': ['AUDI'],
        'BMW': ['BMW'],
        'CITROEN': ['CITROEN', 'CITROËN'],
        'FIAT': ['FIAT'],
        'FORD': ['FORD'],
        'HONDA': ['HONDA'],
        'HYUNDAI': ['HYUNDAI'],
        'KIA': ['KIA'],
        'MERCEDES': ['MERCEDES', 'MERCEDES-BENZ', 'MERCEDESBENZ'],
        'NISSAN': ['NISSAN'],
        'OPEL': ['OPEL'],
        'PEUGEOT': ['PEUGEOT'],
        'RENAULT': ['RENAULT'],
        'SEAT': ['SEAT'],
        'SKODA': ['SKODA', 'ŠKODA'],
        'SUZUKI': ['SUZUKI'],
        'TOYOTA': ['TOYOTA'],
        'VOLKSWAGEN': ['VOLKSWAGEN', 'VW'],
        'VOLVO': ['VOLVO'],
        'CHEVROLET': ['CHEVROLET'],
        'SSANGYONG': ['SSANGYONG'],
        'MITSUBISHI': ['MITSUBISHI'],
        'MAZDA': ['MAZDA'],
        'SUBARU': ['SUBARU'],
        'ISUZU': ['ISUZU'],
        'DACIA': ['DACIA'],
        'LANCIA': ['LANCIA'],
        'ALFA': ['ALFA', 'ALFA ROMEO'],
        'JEEP': ['JEEP'],
        'CHRYSLER': ['CHRYSLER'],
        'DODGE': ['DODGE'],
        'MINI': ['MINI'],
        'SMART': ['SMART'],
        'PORSCHE': ['PORSCHE'],
        'JAGUAR': ['JAGUAR'],
        'LAND': ['LAND ROVER', 'LANDROVER'],
        'LEXUS': ['LEXUS'],
        'INFINITI': ['INFINITI'],
        'ACURA': ['ACURA']
      };
      
      // Buscar marca usando todas las variaciones
      let marcaEncontrada = false;
      for (const [marcaEstandar, variaciones] of Object.entries(marcasYVariaciones)) {
        for (const variacion of variaciones) {
          if (textoCompleto.includes(variacion)) {
            vehicleMarca = marcaEstandar;
            marcaEncontrada = true;
            
            // Intentar extraer modelo de la descripción completa
            // Buscar patrones comunes de modelo después de la marca
            const regex = new RegExp(`${variacion}\\s+([A-Z0-9\\s\\-\\.]+)`, 'i');
            const match = textoCompleto.match(regex);
            if (match && match[1]) {
              const modeloPotencial = match[1].trim().split(' ').slice(0, 3).join(' '); // Hasta 3 palabras
              if (modeloPotencial && modeloPotencial.length > 1) {
                vehicleModelo = modeloPotencial;
              }
            }
            
            console.log(`🎯 Pieza procesada ${partData.refLocal}: Pattern matching exitoso con variación '${variacion}' → ${vehicleMarca} ${vehicleModelo}`);
            break;
          }
        }
        if (marcaEncontrada) break;
      }
      
      // Si no se encontró marca por pattern matching avanzado, aplicar fallbacks más inteligentes
      if (!vehicleMarca) {
        // Fallback 1: Analizar descripcionFamilia para patrones de marca-modelo
        if (descripcionFamilia && descripcionFamilia.length > 3) {
          const familiaUpper = descripcionFamilia.toUpperCase();
          const invalidFamilias = ['GENERICO', 'ELECTRICIDAD', 'CARROCERÍA', 'INTERIOR', 'SUSPENSIÓN', 'FRENOS', 'DIRECCIÓN', 'TRANSMISIÓN', 'MOTOR', 'ADMISIÓN', 'ESCAPE', 'ALUMBRADO', 'CLIMATIZACIÓN', 'ACCESORIOS', 'CAMBIO', 'EMBRAGUE', 'COMBUSTIBLE', 'ACEITE', 'REFRIGERACIÓN'];
          
          const esGenerico = invalidFamilias.some(invalid => familiaUpper.includes(invalid));
          
          if (!esGenerico) {
            // Si descripcionFamilia no es genérica, puede contener datos de vehículo
            const partes = descripcionFamilia.split(' ').filter(p => p.length > 1);
            if (partes.length >= 2) {
              vehicleMarca = partes[0]; // Primera palabra como marca
              vehicleModelo = partes.slice(1).join(' '); // Resto como modelo
              console.log(`🔧 Pieza procesada ${partData.refLocal}: Fallback desde descripcionFamilia - ${vehicleMarca} ${vehicleModelo}`);
            } else if (partes.length === 1 && partes[0].length > 3) {
              vehicleMarca = partes[0]; // Si solo hay una palabra, usar como marca
              console.log(`🔧 Pieza procesada ${partData.refLocal}: Fallback desde descripcionFamilia (solo marca) - ${vehicleMarca}`);
            }
          }
        }
        
        // Fallback 2: Analizar codFamilia si descripcionFamilia no funcionó
        if (!vehicleMarca && codFamilia && codFamilia.length > 1 && !/^\d+$/.test(codFamilia)) {
          // Solo usar codFamilia si no es puramente numérico
          const codFamiliaUpper = codFamilia.toUpperCase();
          const invalidCodes = ['GEN', 'GENERAL', 'SIN', 'NO', 'NA', 'NULL'];
          
          if (!invalidCodes.some(invalid => codFamiliaUpper.includes(invalid))) {
            vehicleMarca = codFamilia;
            console.log(`🔧 Pieza procesada ${partData.refLocal}: Fallback desde codFamilia - ${vehicleMarca}`);
          }
        }
        
        // Si aún no hay datos, marcar para logging
        if (!vehicleMarca) {
          console.log(`❌ Pieza procesada ${partData.refLocal}: Sin datos válidos de vehículo tras pattern matching avanzado (Familia: '${descripcionFamilia}', Código: '${codFamilia}')`);
        }
      }
    } else {
      // Opción 3: Pieza de vehículo físico sin datos de vehículo encontrados
      console.log(`⚠️ Pieza ${partData.refLocal} (vehículo ${partData.idVehiculo}): No se encontraron datos de vehículo`);
    }
    
    // Crear objeto normalizado con valores por defecto para campos obligatorios
    return {
      refLocal: partData.refLocal,
      idEmpresa: partData.idEmpresa || this.companyId,
      idVehiculo: partData.idVehiculo || 0,
      
      // Datos del vehículo extraídos del endpoint
      vehicleMarca,
      vehicleModelo,
      vehicleVersion,
      vehicleAnyo,
      combustible,
      
      codFamilia,
      descripcionFamilia,
      codArticulo: partData.codArticulo || '',
      descripcionArticulo,
      codVersion: partData.codVersion || '',
      refPrincipal: partData.refPrincipal || '',
      anyoInicio: parseInt(partData.anyoInicio || partData.anyoStock || '2000'), // Asegurar que sea número entero
      anyoFin: parseInt(partData.anyoFin || partData.anyoStock || '2050'), // Asegurar que sea número entero
      puertas: partData.puertas || 0,
      rvCode: partData.rvCode || '',
      precio: partData.precio ? (parseInt(partData.precio) / 100).toString() : '0', // Dividir por 100 para corregir formato
      anyoStock: partData.anyoStock || 0,
      peso: partData.peso?.toString() || '0',
      ubicacion: partData.ubicacion || 0,
      observaciones: partData.observaciones || '',
      reserva: partData.reserva || 0,
      tipoMaterial: partData.tipoMaterial || 0,
      situacion: partData.situacion || partData.Situacion || 'almacenada',
      imagenes,
      // TODAS LAS PIEZAS DEBEN ESTAR ACTIVAS POR DEFECTO (30/07/2025)
      // ELIMINACIÓN COMPLETA DE DESACTIVACIÓN AUTOMÁTICA SEGÚN INSTRUCCIONES DEL USUARIO
      // Las piezas procesadas (idVehiculo < 0) NUNCA deben desactivarse durante importaciones
      // 🎯 ACTUALIZACIÓN (04/10/2025): Usar campo "situacion" de la API para determinar estado
      activo: (() => {
        // 🎯 PRIORIDAD 1: Verificar campo "situacion" de la API
        const situacion = (partData.situacion || partData.Situacion || '').toLowerCase();
        if (situacion === 'vendida' || situacion === 'baja' || situacion === 'eliminada') {
          console.log(`❌ Pieza ${partData.refLocal}: DESACTIVADA por situacion="${situacion}"`);
          return false;
        }
        
        // ✅ VERIFICAR TÍTULO "NO IDENTIFICADO" - DESACTIVAR ESTAS PIEZAS
        const tituloLower = descripcionArticulo.toLowerCase();
        if (tituloLower.includes('no identificado') || tituloLower.includes('no identificada')) {
          console.log(`❌ Pieza ${partData.refLocal}: DESACTIVADA por título "no identificado"`);
          return false;
        }
        
        // ✅ PIEZAS PROCESADAS: SIEMPRE ACTIVAS (PROTECCIÓN TOTAL) - excepto vendidas o "no identificado"
        if (partData.idVehiculo < 0) {
          console.log(`🛡️ Pieza procesada ${partData.refLocal} (vehículo ${partData.idVehiculo}): FORZADA ACTIVA para preservar catálogo`);
          return true;
        }
        
        // ✅ PIEZAS REGULARES: SOLO DESACTIVAR SI PRECIO ES EXACTAMENTE 0
        const precio = parseFloat((partData.precio || '0').toString().replace(',', '.'));
        const isActive = precio !== 0; // Solo desactivar precio exactamente 0
        
        if (!isActive) {
          console.log(`⚠️ Pieza regular ${partData.refLocal} (vehículo ${partData.idVehiculo}): Desactivada por precio 0`);
        }
        
        return isActive;
      })(),
      
      // ELIMINAR SISTEMA DE RELACIONES PENDIENTES
      // Todas las piezas se importan sin restricciones de existencia de vehículos
      isPendingRelation: false,
      sincronizado: true,
      ultimaSincronizacion: sql`NOW()`,
      fechaCreacion: sql`NOW()`,
      
    };
  }
  
  /**
   * Procesa las relaciones pendientes entre piezas y vehículos
   * Busca piezas marcadas como isPendingRelation=true y verifica si sus vehículos ya existen
   */
  async processPendingRelations(): Promise<{ resolved: number }> {
    let resolved = 0;
    const BATCH_SIZE = 1000; // Procesar en lotes de 1000 para evitar límites de parámetros
    
    try {
      // Obtener conteo total de piezas pendientes
      const [{ count }] = await db
        .select({ count: dbCount() })
        .from(parts)
        .where(eq(parts.isPendingRelation, true));
      
      const totalPending = Number(count);
      console.log(`Encontradas ${totalPending} piezas pendientes de relación`);
      
      if (totalPending === 0) {
        return { resolved: 0 };
      }
      
      // Procesar en lotes para evitar problemas de memoria y límites de parámetros
      let offset = 0;
      
      while (offset < totalPending) {
        console.log(`Procesando lote de relaciones pendientes: ${offset} - ${Math.min(offset + BATCH_SIZE, totalPending)}`);
        
        // Obtener lote de piezas pendientes
        const pendingParts = await db
          .select()
          .from(parts)
          .where(eq(parts.isPendingRelation, true))
          .limit(BATCH_SIZE)
          .offset(offset);
        
        if (pendingParts.length === 0) {
          break;
        }
        
        // Extraer IDs de vehículos únicos del lote actual
        const vehicleIds = Array.from(new Set(
          pendingParts.map(p => p.idVehiculo).filter(id => id !== null && id !== 0)
        ));
        
        if (vehicleIds.length === 0) {
          offset += BATCH_SIZE;
          continue;
        }
        
        // Si hay demasiados IDs únicos de vehículos, dividir en sub-lotes
        const VEHICLE_BATCH_SIZE = 500;
        const existingVehiclesMap = new Map();
        
        for (let i = 0; i < vehicleIds.length; i += VEHICLE_BATCH_SIZE) {
          const vehicleBatch = vehicleIds.slice(i, i + VEHICLE_BATCH_SIZE);
          
          const existingVehicles = await db
            .select({ id: vehicles.id, idLocal: vehicles.idLocal })
            .from(vehicles)
            .where(inArray(vehicles.idLocal, vehicleBatch));
          
          // Agregar al mapa
          existingVehicles.forEach(v => {
            existingVehiclesMap.set(v.idLocal, v.id);
          });
        }
        
        // Preparar actualizaciones en lote y asociaciones
        const partsToUpdate = [];
        const vehiclePartsToCreate = [];
        
        for (const part of pendingParts) {
          // Verificar si el vehículo existe ahora
          if (part.idVehiculo && existingVehiclesMap.has(part.idVehiculo)) {
            partsToUpdate.push(part.id);
            
            // Preparar asociación vehicle_parts
            vehiclePartsToCreate.push({
              vehicleId: existingVehiclesMap.get(part.idVehiculo),
              partId: part.id,
              idVehiculoOriginal: part.idVehiculo
            });
          }
        }
        
        // Actualizar piezas en lote
        if (partsToUpdate.length > 0) {
          await db
            .update(parts)
            .set({
              activo: true,
              isPendingRelation: false,
              ultimaSincronizacion: sql`NOW()`
            })
            .where(inArray(parts.id, partsToUpdate));
          
          // Crear asociaciones en vehicle_parts
          if (vehiclePartsToCreate.length > 0) {
            try {
              await db.insert(vehicleParts).values(vehiclePartsToCreate);
              console.log(`Creadas ${vehiclePartsToCreate.length} asociaciones vehicle_parts`);
            } catch (error) {
              console.error('Error creando asociaciones vehicle_parts:', error);
              // Continuar sin fallar si hay problemas con las asociaciones
            }
          }
          
          resolved += partsToUpdate.length;
          console.log(`Resueltas ${partsToUpdate.length} relaciones en este lote`);
        }
        
        offset += BATCH_SIZE;
      }
      
      // Después de resolver todas las relaciones, actualizar contadores de vehículos
      if (resolved > 0) {
        console.log(`Actualizando contadores de vehículos para ${resolved} piezas resueltas...`);
        await this.updateVehiclePartsCounters();
        console.log(`Contadores de vehículos actualizados correctamente`);
      }
      
      console.log(`Total de relaciones resueltas: ${resolved}`);
      return { resolved };
    } catch (error) {
      console.error('Error procesando relaciones pendientes:', error);
      throw error;
    }
  }
  
  /**
   * Desactiva piezas que ya no existen en la API (solo para importaciones completas)
   */
  async deactivateObsoleteParts(): Promise<number> {
    // ❌ FUNCIÓN DESACTIVADA POR INSTRUCCIONES DEL USUARIO
    // Esta función desactivaba piezas automáticamente durante importaciones completas
    // Ahora se mantiene desactivada para preservar todas las piezas importadas
    console.log('🔒 FUNCIÓN DESACTIVADA: deactivateObsoleteParts no se ejecuta según instrucciones del usuario');
    console.log('   Todas las piezas se mantienen activas durante importaciones completas');
    return 0;
    
    /* CÓDIGO ORIGINAL COMENTADO
    try {
      console.log('🔍 Verificando piezas que ya no existen en la API...');
      
      // Obtener muestra de piezas activas de la API para verificar cuáles siguen existiendo
      const apiResponse = await this.fetchWithRetry('RecuperarCambiosCanal', {
        fecha: this.formatDate(new Date('2000-01-01')),
        lastId: 0,
        offset: 10000 // Muestra grande para verificar eliminaciones
      });
      
      let apiParts: any[] = [];
      
      // Extraer piezas según el formato de respuesta
      if (apiResponse.data?.piezas && Array.isArray(apiResponse.data.piezas)) {
        apiParts = apiResponse.data.piezas;
      } else if (apiResponse.piezas && Array.isArray(apiResponse.piezas)) {
        apiParts = apiResponse.piezas;
      } else if (Array.isArray(apiResponse)) {
        apiParts = apiResponse;
      }
      
      if (apiParts.length === 0) {
        console.log('⚠️ No se pudieron obtener piezas de la API para verificar eliminaciones');
        return 0;
      }
      
      // Crear Set de refLocal que existen en la API
      const apiRefLocals = new Set(apiParts.map(p => p.refLocal || p.RefLocal).filter(ref => ref));
      console.log(`📡 Verificando contra ${apiRefLocals.size} piezas en la API...`);
      
      // Obtener todas las piezas activas de la base de datos EXCLUYENDO piezas de vehículos procesados
      const activePartsInDb = await db
        .select({ id: parts.id, refLocal: parts.refLocal, idVehiculo: parts.idVehiculo })
        .from(parts)
        .where(
          and(
            eq(parts.activo, true),
            sql`${parts.idVehiculo} > 0` // Solo piezas de vehículos físicos, no procesados
          )
        );
      
      console.log(`💾 Encontradas ${activePartsInDb.length} piezas activas en la BD (excluyendo vehículos procesados)`);
      
      // Encontrar piezas que ya no están en la API (solo de vehículos físicos)
      const obsoleteParts = activePartsInDb.filter(part => 
        !apiRefLocals.has(part.refLocal) && part.idVehiculo > 0 // Asegurar que no sean de vehículos procesados
      );
      
      if (obsoleteParts.length === 0) {
        console.log('✅ No se encontraron piezas obsoletas');
        return 0;
      }
      
      console.log(`❌ Encontradas ${obsoleteParts.length} piezas obsoletas que ya no existen en la API`);
      
      // Desactivar piezas obsoletas en lotes
      const BATCH_SIZE = 1000;
      let deactivatedCount = 0;
      
      for (let i = 0; i < obsoleteParts.length; i += BATCH_SIZE) {
        const batch = obsoleteParts.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(p => p.id);
        
        const result = await db
          .update(parts)
          .set({
            activo: false,
            ultimaSincronizacion: sql`NOW()`
          })
          .where(inArray(parts.id, batchIds));
        
        deactivatedCount += result.rowCount || 0;
        console.log(`🔄 Desactivadas ${result.rowCount || 0} piezas obsoletas (lote ${Math.floor(i / BATCH_SIZE) + 1})`);
      }
      
      console.log(`✅ Total de piezas obsoletas desactivadas: ${deactivatedCount}`);
      return deactivatedCount;
      
    } catch (error) {
      console.error('❌ Error al desactivar piezas obsoletas:', error);
      return 0;
    }
    */ // FIN CÓDIGO ORIGINAL COMENTADO
  }

  /**
   * Desactiva piezas que ya no existen en la API (para importaciones incrementales)
   * Usa una estrategia de verificación por muestreo para detectar piezas vendidas
   */
  async deactivateObsoletePartsIncremental(): Promise<number> {
    // ❌ FUNCIÓN DESACTIVADA POR INSTRUCCIONES DEL USUARIO
    // Esta función desactivaba piezas automáticamente durante importaciones incrementales
    // Ahora se mantiene desactivada para preservar todas las piezas importadas
    console.log('🔒 FUNCIÓN DESACTIVADA: deactivateObsoletePartsIncremental no se ejecuta según instrucciones del usuario');
    console.log('   Todas las piezas se mantienen activas durante importaciones incrementales');
    return 0;
    
    /* CÓDIGO ORIGINAL COMENTADO
    try {
      console.log('🔍 Verificando piezas obsoletas en importación incremental...');
      
      // Obtener una muestra de piezas activas de la base de datos EXCLUYENDO piezas de vehículos procesados
      const activeParts = await db
        .select({ id: parts.id, refLocal: parts.refLocal, idVehiculo: parts.idVehiculo })
        .from(parts)
        .where(
          and(
            eq(parts.activo, true),
            sql`${parts.idVehiculo} > 0` // Solo piezas de vehículos físicos
          )
        )
        .limit(5000); // Muestra de 5000 piezas más recientes
      
      if (activeParts.length === 0) {
        console.log('No hay piezas activas para verificar');
        return 0;
      }
      
      console.log(`Verificando ${activeParts.length} piezas activas contra la API...`);
      
      // Dividir en lotes para verificación
      const BATCH_SIZE = 1000;
      let totalDeactivated = 0;
      
      for (let i = 0; i < activeParts.length; i += BATCH_SIZE) {
        const batch = activeParts.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(p => p.refLocal);
        
        console.log(`Verificando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(activeParts.length / BATCH_SIZE)}...`);
        
        // Obtener piezas de la API para este lote
        const apiResponse = await this.fetchWithRetry('RecuperarCambiosCanal', {
          fecha: this.formatDate(new Date('2000-01-01')),
          lastId: 0,
          offset: 2000 // Obtener una muestra grande
        });
        
        let apiParts: any[] = [];
        
        // Extraer piezas según el formato de respuesta
        if (apiResponse.data?.piezas && Array.isArray(apiResponse.data.piezas)) {
          apiParts = apiResponse.data.piezas;
        } else if (apiResponse.piezas && Array.isArray(apiResponse.piezas)) {
          apiParts = apiResponse.piezas;
        } else if (Array.isArray(apiResponse)) {
          apiParts = apiResponse;
        }
        
        if (apiParts.length === 0) {
          console.log('No se pudieron obtener piezas de la API para verificar');
          continue;
        }
        
        // Crear Set de refLocal que existen en la API
        const apiRefLocals = new Set(apiParts.map(p => p.refLocal || p.RefLocal).filter(ref => ref));
        
        // Encontrar piezas del lote que ya no están en la API (solo de vehículos físicos)
        const obsoleteParts = batch.filter(part => 
          !apiRefLocals.has(part.refLocal) && part.idVehiculo > 0 // Asegurar que no sean de vehículos procesados
        );
        
        if (obsoleteParts.length > 0) {
          console.log(`Encontradas ${obsoleteParts.length} piezas obsoletas en este lote`);
          
          // Desactivar piezas obsoletas
          const obsoleteIds = obsoleteParts.map(p => p.id);
          const result = await db
            .update(parts)
            .set({
              activo: false,
              ultimaSincronizacion: sql`NOW()`
            })
            .where(inArray(parts.id, obsoleteIds));
          
          totalDeactivated += result.rowCount || 0;
          console.log(`Desactivadas ${result.rowCount || 0} piezas obsoletas`);
        }
        
        // Esperar un poco entre lotes para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Total de piezas obsoletas desactivadas (incremental): ${totalDeactivated}`);
      return totalDeactivated;
      
    } catch (error) {
      console.error('❌ Error al verificar piezas obsoletas (incremental):', error);
      return 0;
    }
    */ // FIN CÓDIGO ORIGINAL COMENTADO
  }

  /**
   * Actualiza los contadores de piezas en todos los vehículos
   */
  async updateVehiclePartsCounters(): Promise<void> {
    try {
      console.log('🔄 Iniciando actualización de contadores de piezas...');
      
      // Actualizar contadores usando una consulta SQL optimizada
      // active_parts_count debe usar los mismos filtros que el frontend
      const result = await db.execute(sql`
        UPDATE ${vehicles}
        SET 
          active_parts_count = COALESCE(active_count.count, 0),
          total_parts_count = COALESCE(total_count.count, 0),
          fecha_actualizacion = NOW()
        FROM (
          SELECT 
            ${parts.idVehiculo} as id_vehiculo,
            COUNT(*) as count
          FROM ${parts}
          WHERE ${parts.activo} = true
            AND ${parts.precio} IS NOT NULL 
            AND ${parts.precio} != '' 
            AND ${parts.precio} != '0'
            AND CAST(REPLACE(${parts.precio}, ',', '.') AS DECIMAL) > 0
          GROUP BY ${parts.idVehiculo}
        ) as active_count
        FULL OUTER JOIN (
          SELECT 
            ${parts.idVehiculo} as id_vehiculo,
            COUNT(*) as count
          FROM ${parts}
          WHERE ${parts.activo} = true
          GROUP BY ${parts.idVehiculo}
        ) as total_count ON active_count.id_vehiculo = total_count.id_vehiculo
        WHERE 
          ${vehicles.idLocal} = COALESCE(active_count.id_vehiculo, total_count.id_vehiculo)
      `);
      
      console.log(`✅ Contadores de piezas actualizados en vehículos`);
      
    } catch (error) {
      console.error('❌ Error actualizando contadores de piezas:', error);
      throw error;
    }
  }
  
  /**
   * Inicia una importación optimizada
   */
  async startImport(type: 'vehicles' | 'parts', fromDate?: Date, fullImport: boolean = false): Promise<number> {
    try {
      await this.configure();
      
      // Si se hace una importación completa, actualizar el control de sincronización
      // con una fecha muy antigua para traer todos los registros
      if (fullImport) {
        const initialDate = new Date('1900-01-01T00:00:00');
        const control = await this.getSyncControl(type);
        await this.updateSyncControl(control.id, initialDate, 0, control.recordsProcessed);
        console.log(`Iniciando importación COMPLETA de ${type} con fecha: ${initialDate.toISOString()}`);
      }
      // Si se proporciona fecha, actualizar el control de sincronización con esa fecha
      else if (fromDate) {
        const control = await this.getSyncControl(type);
        await this.updateSyncControl(control.id, fromDate, 0, control.recordsProcessed);
        console.log(`Iniciando importación incremental de ${type} desde: ${fromDate.toISOString()}`);
      }
      
      // Crear registro de importación
      const [importRecord] = await db.insert(importHistory)
        .values({
          type,
          status: 'in_progress',
          progress: 0,
          processingItem: 'Iniciando importación',
          totalItems: 0,
          processedItems: 0,
          newItems: 0,
          updatedItems: 0,
          itemsDeactivated: 0,
          errors: [],
          errorCount: 0,
          details: {},
          options: {
            fromDate: fromDate?.toISOString(),
            fullImport
          },
          isFullImport: fullImport
        })
        .returning();
      
      console.log(`Iniciando importación optimizada de ${type} con ID: ${importRecord.id}`);
      console.log(`🔍 PARÁMETROS IMPORTACIÓN: type=${type}, fullImport=${fullImport}, fromDate=${fromDate?.toISOString()}`);
      console.log(`🔍 REGISTRO CREADO: isFullImport=${importRecord.isFullImport}`);
      
      // Iniciar proceso en segundo plano
      if (type === 'vehicles') {
        setTimeout(() => this.importVehicles(importRecord.id), 100);
      } else {
        setTimeout(() => this.importParts(importRecord.id), 100);
      }
      
      return importRecord.id;
    } catch (error) {
      console.error(`Error al iniciar importación de ${type}:`, error);
      throw error;
    }
  }
  
  /**
   * Actualiza el estado activo de todas las piezas basado en la existencia del vehículo asociado
   */
  async updatePartsActiveStatus(): Promise<{ activated: number, deactivated: number }> {
    let activated = 0;
    let deactivated = 0;
    
    try {
      // Activar piezas que tienen vehículo y están marcadas como pendientes
      const activateResult = await db.execute(sql`
        UPDATE ${parts}
        SET 
          ${parts.activo} = true,
          ${parts.isPendingRelation} = false,
          ${parts.fechaActualizacion} = NOW()
        WHERE
          ${parts.isPendingRelation} = true
          AND EXISTS (
            SELECT 1 FROM ${vehicles}
            WHERE ${vehicles.idLocal} = ${parts.idVehiculo}
          )
      `);
      
      // Desactivar piezas que no tienen vehículo asociado
      const deactivateResult = await db.execute(sql`
        UPDATE ${parts}
        SET 
          ${parts.activo} = false,
          ${parts.isPendingRelation} = true,
          ${parts.fechaActualizacion} = NOW()
        WHERE
          ${parts.activo} = true
          AND NOT EXISTS (
            SELECT 1 FROM ${vehicles}
            WHERE ${vehicles.idLocal} = ${parts.idVehiculo}
          )
      `);
      
      activated = activateResult.rowCount || 0;
      deactivated = deactivateResult.rowCount || 0;
      
      return { activated, deactivated };
    } catch (error) {
      console.error('Error actualizando estado de piezas:', error);
      throw error;
    }
  }

  /**
   * Función para probar el formato de respuesta de piezas para diagnóstico
   * Realiza una llamada directa a la API y analiza su estructura
   */
  async testFetchPartsFormat(endpoint: string, params: any): Promise<{
    formatInfo: string;
    sampleData: any;
    detectedArrays: Record<string, number>;
    formatDetected: string;
    parts: any[];
  }> {
    try {
      // Realizar llamada a la API
      const data = await this.fetchWithRetry(endpoint, params);
      
      // Resultado a devolver
      const result = {
        formatInfo: '',
        sampleData: {},
        detectedArrays: {} as Record<string, number>,
        formatDetected: 'unknown',
        parts: [] as any[]
      };
      
      // Analizar estructura de la respuesta para diagnóstico
      const keys = Object.keys(data);
      result.formatInfo = `Keys en el primer nivel: ${keys.join(', ')}`;
      
      // Buscar arrays en la respuesta
      for (const key of keys) {
        const value = data[key];
        
        // Si tenemos un array directamente
        if (Array.isArray(value)) {
          result.detectedArrays[key] = value.length;
          
          // Si parece contener piezas, usarlo como nuestro array de piezas
          if (value.length > 0 && (
              key.toLowerCase().includes('pieza') || 
              key.toLowerCase().includes('part') ||
              key.toLowerCase().includes('item')
            )) {
            result.parts = value;
            result.formatDetected = `array:${key}`;
          }
        } 
        // Si tenemos un objeto, buscar arrays dentro de él
        else if (typeof value === 'object' && value !== null) {
          const nestedKeys = Object.keys(value);
          
          for (const nestedKey of nestedKeys) {
            const nestedValue = value[nestedKey];
            
            if (Array.isArray(nestedValue)) {
              result.detectedArrays[`${key}.${nestedKey}`] = nestedValue.length;
              
              // Si parece contener piezas, usarlo
              if (nestedValue.length > 0 && (
                  nestedKey.toLowerCase().includes('pieza') || 
                  nestedKey.toLowerCase().includes('part') ||
                  nestedKey.toLowerCase().includes('item')
                )) {
                result.parts = nestedValue;
                result.formatDetected = `nested:${key}.${nestedKey}`;
              }
            }
          }
        }
      }
      
      // Si no hemos encontrado nada específico, buscar cualquier array
      if (!result.parts.length) {
        // Validar que detectedArrays existe y es un objeto antes de usar Object.entries()
        const safeDetectedArrays = result.detectedArrays && typeof result.detectedArrays === 'object' ? result.detectedArrays : {};
        for (const [path, length] of Object.entries(safeDetectedArrays)) {
          if (length > 0) {
            // Obtener el array según la ruta
            const pathParts = path.split('.');
            if (pathParts.length === 1) {
              result.parts = data[pathParts[0]];
            } else if (pathParts.length === 2) {
              result.parts = data[pathParts[0]][pathParts[1]];
            }
            
            result.formatDetected = `fallback:${path}`;
            break;
          }
        }
      }
      
      // Extraer una muestra de la respuesta para análisis
      result.sampleData = {
        firstLevel: JSON.stringify(data).substring(0, 1000) + '...',
      };
      
      // Si tenemos datos, incluir el primero como muestra
      if (result.parts && result.parts.length > 0) {
        result.sampleData.firstItem = JSON.stringify(result.parts[0]).substring(0, 1000) + '...';
      }
      
      return result;
    } catch (error) {
      console.error('Error al probar formato de piezas:', error);
      throw error;
    }
  }

  /**
   * Corrección específica para piezas procesadas (idVehiculo < 0)
   * Basado en la lógica que funcionó hace unos días en run_vehicle_correction.ts
   */
  async correctProcessedPartsVehicleData(): Promise<number> {
    try {
      console.log('🔍 Analizando piezas procesadas sin datos de vehículo...');
      
      // Encontrar piezas procesadas sin datos válidos
      const processedPartsQuery = await db
        .select({
          id: parts.id,
          idVehiculo: parts.idVehiculo,
          refLocal: parts.refLocal,
          vehicleMarca: parts.vehicleMarca,
          vehicleModelo: parts.vehicleModelo,
          descripcionFamilia: parts.descripcionFamilia,
          descripcionArticulo: parts.descripcionArticulo
        })
        .from(parts)
        .where(
          and(
            eq(parts.activo, true),
            sql`${parts.idVehiculo} < 0`, // Solo piezas procesadas
            or(
              isNull(parts.vehicleMarca),
              eq(parts.vehicleMarca, ''),
              sql`${parts.vehicleMarca} LIKE 'ELECTRICIDAD%'`,
              sql`${parts.vehicleMarca} LIKE 'CARROCER%'`,
              sql`${parts.vehicleMarca} LIKE 'SUSPENSIÓN%'`,
              sql`${parts.vehicleMarca} LIKE 'FRENOS%'`,
              sql`${parts.vehicleMarca} LIKE 'DIRECCIÓN%'`,
              sql`${parts.vehicleMarca} LIKE 'TRANSMISIÓN%'`,
              sql`${parts.vehicleMarca} LIKE 'MOTOR%'`,
              sql`${parts.vehicleMarca} LIKE 'INTERIOR%'`
            )
          )
        )
        .limit(5000); // Procesar en lotes
      
      console.log(`📊 Encontradas ${processedPartsQuery.length} piezas procesadas sin datos válidos de vehículo`);
      
      if (processedPartsQuery.length === 0) {
        console.log('✅ No hay piezas procesadas que requieran corrección');
        return 0;
      }
      
      // Cargar vehículos físicos para correlación
      console.log('📋 Cargando vehículos físicos...');
      const physicalVehicles = await db
        .select({
          idLocal: vehicles.idLocal,
          marca: vehicles.marca,
          modelo: vehicles.modelo,
          version: vehicles.version,
          anyo: vehicles.anyo,
          combustible: vehicles.combustible
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.activo, true),
            sql`${vehicles.idLocal} > 0`
          )
        );
      
      console.log(`📋 Cargados ${physicalVehicles.length} vehículos físicos`);
      
      // Crear mapa de marcas comunes para búsqueda rápida
      const marcasComunes = ['FORD', 'PEUGEOT', 'RENAULT', 'CHEVROLET', 'SEAT', 'AUDI', 'BMW', 'MERCEDES', 'VOLKSWAGEN', 'OPEL', 'TOYOTA', 'NISSAN', 'HONDA', 'HYUNDAI', 'KIA', 'SKODA', 'FIAT', 'CITROEN'];
      
      let updatedCount = 0;
      
      // Procesar cada pieza
      for (const part of processedPartsQuery) {
        let vehicleDataFound = null;
        
        // Estrategia: Buscar marcas conocidas en descripción de familia o artículo
        const textoCompleto = `${part.descripcionFamilia || ''} ${part.descripcionArticulo || ''}`.toUpperCase();
        
        // Buscar marca conocida en descripción
        for (const marca of marcasComunes) {
          if (textoCompleto.includes(marca)) {
            // Buscar vehículo de esta marca en nuestra base
            const vehiculoEncontrado = physicalVehicles.find(v => 
              v.marca && v.marca.toUpperCase().includes(marca)
            );
            
            if (vehiculoEncontrado) {
              vehicleDataFound = {
                marca: vehiculoEncontrado.marca,
                modelo: vehiculoEncontrado.modelo || '',
                version: vehiculoEncontrado.version || '',
                anyo: vehiculoEncontrado.anyo || 0,
                combustible: vehiculoEncontrado.combustible || ''
              };
              break;
            }
          }
        }
        
        // Si encontramos datos de vehículo, actualizar
        if (vehicleDataFound) {
          try {
            await db
              .update(parts)
              .set({
                vehicleMarca: vehicleDataFound.marca,
                vehicleModelo: vehicleDataFound.modelo,
                vehicleVersion: vehicleDataFound.version,
                vehicleAnyo: vehicleDataFound.anyo,
                fechaActualizacion: sql`NOW()`
              })
              .where(eq(parts.id, part.id));
            
            updatedCount++;
            
            if (updatedCount % 100 === 0) {
              console.log(`  ✅ ${updatedCount} piezas procesadas actualizadas...`);
            }
            
          } catch (error) {
            console.error(`⚠️ Error actualizando pieza procesada ${part.refLocal}:`, error);
          }
        }
      }
      
      console.log(`📊 Corrección de piezas procesadas completada:`);
      console.log(`  • Piezas analizadas: ${processedPartsQuery.length}`);
      console.log(`  • Piezas actualizadas: ${updatedCount}`);
      console.log(`  • Tasa de éxito: ${((updatedCount / processedPartsQuery.length) * 100).toFixed(2)}%`);
      
      return updatedCount;
      
    } catch (error) {
      console.error('❌ Error en corrección automática de piezas procesadas:', error);
      throw error;
    }
  }

  // Método startCompleteSequentialImport eliminado - usar orden establecido simple
}

export const metasyncOptimizedImport = new MetasyncOptimizedImportService();