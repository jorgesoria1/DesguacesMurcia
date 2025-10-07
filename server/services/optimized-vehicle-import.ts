import { db } from '../db';
import { vehicles, importHistory, apiConfig } from '@shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import axios from 'axios';

interface VehicleData {
  idLocal: number;
  idEmpresa: number;
  marca: string;
  modelo: string;
  version: string;
  anyo: number;
  combustible: string;
  descripcion: string;
  imagenes: string[];
  bastidor?: string;
  matricula?: string;
  color?: string;
  potencia?: number;
  activo: boolean;
}

interface BatchResult {
  inserted: number;
  updated: number;
  errors: string[];
  processedIds: number[];
}

export class OptimizedVehicleImport {
  private config: any = null;
  private readonly BATCH_SIZE = 1000;
  private readonly MAX_CONCURRENT_BATCHES = 3;
  private readonly UPSERT_BATCH_SIZE = 500; // Smaller batches for DB operations

  async configure(): Promise<void> {
    const [activeConfig] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!activeConfig) {
      throw new Error('No hay configuración de API activa');
    }
    this.config = activeConfig;
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async fetchVehiclesFromAPI(lastId: number = 0, limit: number = this.BATCH_SIZE): Promise<any> {
    if (!this.config) {
      throw new Error('Configuración no inicializada');
    }

    const response = await axios.get('https://apis.metasync.com/Almacen/RecuperarCambiosVehiculosCanal', {
      headers: {
        'apikey': this.config.apiKey,
        'Content-Type': 'application/json',
        'fecha': this.formatDate(new Date('2000-01-01')),
        'lastid': lastId.toString(),
        'offset': limit.toString()
      },
      timeout: 30000
    });

    return response.data;
  }

  normalizeVehicleData(rawVehicle: any): VehicleData {
    // Handle both old and new API formats
    const idLocal = rawVehicle.idLocal || rawVehicle.IdLocal || rawVehicle.id;
    const marca = rawVehicle.nombreMarca || rawVehicle.Marca || rawVehicle.marca || 'Desconocida';
    const modelo = rawVehicle.nombreModelo || rawVehicle.Modelo || rawVehicle.modelo || 'Desconocido';
    const version = rawVehicle.nombreVersion || rawVehicle.Version || rawVehicle.version || 'Desconocida';
    const anyo = rawVehicle.anyoVehiculo || rawVehicle.AnyoVehiculo || rawVehicle.anyo || 0;
    const combustible = rawVehicle.tipoCombustible || rawVehicle.Combustible || rawVehicle.combustible || '';

    return {
      idLocal,
      idEmpresa: this.config.companyId,
      marca,
      modelo,
      version,
      anyo,
      combustible,
      descripcion: `${marca} ${modelo} ${version}`,
      imagenes: rawVehicle.urlsImgs || rawVehicle.UrlsImgs || rawVehicle.imagenes || [],
      bastidor: rawVehicle.bastidor || rawVehicle.Bastidor || '',
      matricula: rawVehicle.matricula || rawVehicle.Matricula || '',
      color: rawVehicle.color || rawVehicle.Color || '',
      potencia: rawVehicle.potencia || rawVehicle.Potencia || 0,
      activo: true
    };
  }

  async getExistingVehicleIds(idLocals: number[]): Promise<Map<number, number>> {
    if (idLocals.length === 0) return new Map();

    // Split into chunks to avoid parameter limits
    const chunks = [];
    for (let i = 0; i < idLocals.length; i += 1000) {
      chunks.push(idLocals.slice(i, i + 1000));
    }

    const existingMap = new Map<number, number>();
    
    for (const chunk of chunks) {
      const existing = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, chunk));
      
      existing.forEach(v => existingMap.set(v.idLocal, v.id));
    }

    return existingMap;
  }

  async upsertVehiclesBatch(vehicleData: VehicleData[]): Promise<BatchResult> {
    const result: BatchResult = {
      inserted: 0,
      updated: 0,
      errors: [],
      processedIds: []
    };

    try {
      // Get existing vehicles to determine updates vs inserts
      const idLocals = vehicleData.map(v => v.idLocal);
      const existingMap = await this.getExistingVehicleIds(idLocals);

      // Separate into updates and inserts
      const toUpdate: Array<{id: number, data: VehicleData}> = [];
      const toInsert: VehicleData[] = [];

      vehicleData.forEach(vehicle => {
        const existingId = existingMap.get(vehicle.idLocal);
        if (existingId) {
          toUpdate.push({ id: existingId, data: vehicle });
        } else {
          toInsert.push(vehicle);
        }
        result.processedIds.push(vehicle.idLocal);
      });

      // Batch insert new vehicles
      if (toInsert.length > 0) {
        // Split inserts into smaller batches
        for (let i = 0; i < toInsert.length; i += this.UPSERT_BATCH_SIZE) {
          const batch = toInsert.slice(i, i + this.UPSERT_BATCH_SIZE);
          try {
            await db.insert(vehicles).values(batch);
            result.inserted += batch.length;
          } catch (error) {
            console.error(`Error inserting batch ${i}-${i + batch.length}:`, error);
            result.errors.push(`Insert batch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Batch update existing vehicles using SQL for better performance
      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += this.UPSERT_BATCH_SIZE) {
          const batch = toUpdate.slice(i, i + this.UPSERT_BATCH_SIZE);
          try {
            // Use a more efficient update approach
            for (const { id, data } of batch) {
              await db.update(vehicles)
                .set({
                  marca: data.marca,
                  modelo: data.modelo,
                  version: data.version,
                  anyo: data.anyo,
                  combustible: data.combustible,
                  descripcion: data.descripcion,
                  imagenes: data.imagenes,
                  bastidor: data.bastidor,
                  matricula: data.matricula,
                  color: data.color,
                  potencia: data.potencia,
                  activo: data.activo,
                  
                })
                .where(eq(vehicles.id, id));
            }
            result.updated += batch.length;
          } catch (error) {
            console.error(`Error updating batch ${i}-${i + batch.length}:`, error);
            result.errors.push(`Update batch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

    } catch (error) {
      console.error('Error in upsertVehiclesBatch:', error);
      result.errors.push(`Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  async processVehicleBatch(rawVehicles: any[]): Promise<BatchResult> {
    try {
      // Normalize all vehicles first
      const normalizedVehicles = rawVehicles
        .map(v => this.normalizeVehicleData(v))
        .filter(v => v.idLocal && v.idLocal > 0); // Filter out invalid vehicles

      // Process in database
      return await this.upsertVehiclesBatch(normalizedVehicles);
    } catch (error) {
      console.error('Error processing vehicle batch:', error);
      return {
        inserted: 0,
        updated: 0,
        errors: [`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processedIds: []
      };
    }
  }

  async updateImportProgress(importId: number, updates: any): Promise<void> {
    try {
      await db.update(importHistory)
        .set({
          ...updates,
          lastUpdated: new Date()
        })
        .where(eq(importHistory.id, importId));
    } catch (error) {
      console.error('Error updating import progress:', error);
    }
  }

  async importVehiclesOptimized(importId: number, fullImport: boolean = true): Promise<void> {
    await this.configure();
    
    console.log(`🚗 Iniciando importación OPTIMIZADA ${fullImport ? 'COMPLETA' : 'INCREMENTAL'} de vehículos`);
    
    let lastId = 0;
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let hasMore = true;
    const errors: string[] = [];
    const processedIds: number[] = [];

    // Update initial status
    await this.updateImportProgress(importId, {
      status: 'in_progress',
      processingItem: 'Iniciando importación optimizada de vehículos',
      progress: 5
    });

    try {
      while (hasMore) {
        console.log(`📡 Obteniendo lote de vehículos desde lastId=${lastId}`);
        
        // Fetch vehicles from API
        const apiResponse = await this.fetchVehiclesFromAPI(lastId, this.BATCH_SIZE);
        
        // Extract vehicles from different possible response formats
        let vehicleBatch: any[] = [];
        if (apiResponse.data?.vehiculos && Array.isArray(apiResponse.data.vehiculos)) {
          vehicleBatch = apiResponse.data.vehiculos;
        } else if (apiResponse.vehiculos && Array.isArray(apiResponse.vehiculos)) {
          vehicleBatch = apiResponse.vehiculos;
        } else if (Array.isArray(apiResponse)) {
          vehicleBatch = apiResponse;
        } else if (Array.isArray(apiResponse.data)) {
          vehicleBatch = apiResponse.data;
        }

        console.log(`📊 Procesando lote de ${vehicleBatch.length} vehículos`);

        if (vehicleBatch.length === 0) {
          console.log('✅ No hay más vehículos para procesar');
          hasMore = false;
          break;
        }

        // Process batch with optimized method
        const batchResult = await this.processVehicleBatch(vehicleBatch);
        
        // Update counters
        totalProcessed += vehicleBatch.length;
        totalInserted += batchResult.inserted;
        totalUpdated += batchResult.updated;
        errors.push(...batchResult.errors);
        processedIds.push(...batchResult.processedIds);

        // Update progress
        const progress = Math.min(95, Math.floor((totalProcessed / (totalProcessed + 1000)) * 100));
        await this.updateImportProgress(importId, {
          processedItems: totalProcessed,
          newItems: totalInserted,
          updatedItems: totalUpdated,
          progress,
          processingItem: `Procesados ${totalProcessed} vehículos (${totalInserted} nuevos, ${totalUpdated} actualizados)`,
          errors: errors.slice(-50) // Keep only last 50 errors
        });

        // Calculate next lastId
        if (vehicleBatch.length > 0) {
          const lastVehicle = vehicleBatch[vehicleBatch.length - 1];
          const newLastId = lastVehicle.idLocal || lastVehicle.IdLocal || lastVehicle.id;
          if (newLastId && newLastId > lastId) {
            lastId = newLastId;
          } else {
            lastId += vehicleBatch.length; // Fallback increment
          }
        }

        // Check if we should continue
        if (vehicleBatch.length < this.BATCH_SIZE) {
          hasMore = false;
        }

        // Small delay to prevent API overload
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // If full import, deactivate vehicles not in API
      if (fullImport && processedIds.length > 0) {
        console.log(`🔄 Desactivando vehículos no presentes en API...`);
        
        // Use NOT IN query for better performance
        const result = await db.execute(
          sql`UPDATE vehicles SET activo = false, updated_at = NOW() 
              WHERE id_local NOT IN (${sql.join(processedIds.map(id => sql`${id}`), sql`, `)}) 
              AND activo = true`
        );
        
        console.log(`✅ Desactivados vehículos no presentes: ${result.rowCount || 0}`);
      }

      // Complete import
      const finalStatus = errors.length > totalProcessed * 0.1 ? 'partial' : 'completed';
      await this.updateImportProgress(importId, {
        status: finalStatus,
        progress: 100,
        endTime: new Date(),
        totalItems: totalProcessed,
        processingItem: `Importación completada: ${totalProcessed} vehículos procesados`,
        errors: errors.slice(-100) // Keep last 100 errors
      });

      console.log(`✅ Importación optimizada ${finalStatus}: ${totalProcessed} procesados, ${totalInserted} nuevos, ${totalUpdated} actualizados`);

    } catch (error) {
      console.error('❌ Error en importación optimizada:', error);
      await this.updateImportProgress(importId, {
        status: 'failed',
        endTime: new Date(),
        processingItem: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
      throw error;
    }
  }
}

export const optimizedVehicleImport = new OptimizedVehicleImport();