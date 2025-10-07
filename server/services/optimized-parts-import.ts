import { db } from '../db';
import { parts, vehicles, vehicleParts, importHistory, apiConfig } from '@shared/schema';
import { eq, sql, inArray, and } from 'drizzle-orm';
import axios from 'axios';

interface PartData {
  refLocal: number;
  idEmpresa: number;
  codArticulo: string;
  refPrincipal: string;
  descripcionArticulo: string;
  descripcionFamilia: string;
  codFamilia: string;
  precio: string;
  peso: string;
  idVehiculo: number;
  imagenes: string[];
  activo: boolean;
  vehicleMarca?: string;
  vehicleModelo?: string;
  vehicleVersion?: string;
  vehicleAnyo?: number;
}

interface BatchResult {
  inserted: number;
  updated: number;
  errors: string[];
  processedIds: number[];
  activatedParts: number;
}

export class OptimizedPartsImport {
  private config: any = null;
  private readonly BATCH_SIZE = 1000;
  private readonly UPSERT_BATCH_SIZE = 500;
  private readonly MAX_CONCURRENT_BATCHES = 3;

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

  async fetchPartsFromAPI(lastId: number = 0, limit: number = this.BATCH_SIZE): Promise<any> {
    if (!this.config) {
      throw new Error('Configuración no inicializada');
    }

    const response = await axios.get('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
      headers: {
        'apikey': this.config.apiKey,
        'fecha': this.formatDate(new Date('2000-01-01')),
        'lastid': lastId.toString(),
        'offset': limit.toString(),
        'canal': this.config.channel,
        'idempresa': this.config.companyId.toString()
      },
      timeout: 60000
    });

    return response.data;
  }

  normalizePartData(rawPart: any): PartData {
    // Handle both old and new API formats
    const refLocal = rawPart.refLocal || rawPart.RefLocal || rawPart.id;
    const codArticulo = rawPart.codArticulo || rawPart.CodArticulo || '';
    const descripcion = rawPart.descripcionArticulo || rawPart.DescripcionArticulo || rawPart.descripcion || '';
    const familia = rawPart.descripcionFamilia || rawPart.DescripcionFamilia || rawPart.familia || '';
    const precio = String(rawPart.precio || rawPart.Precio || '0');
    
    return {
      refLocal,
      idEmpresa: this.config.companyId,
      codArticulo,
      refPrincipal: rawPart.refPrincipal || rawPart.RefPrincipal || '',
      descripcionArticulo: descripcion,
      descripcionFamilia: familia,
      codFamilia: rawPart.codFamilia || rawPart.CodFamilia || '',
      precio: this.formatPrice(precio),
      peso: String(rawPart.peso || rawPart.Peso || '0'),
      idVehiculo: rawPart.idVehiculo || rawPart.IdVehiculo || -1,
      imagenes: rawPart.imagenes || rawPart.Imagenes || rawPart.urlsImgs || [],
      activo: false, // Initially inactive until vehicle association is verified
      vehicleMarca: rawPart.vehicleMarca || rawPart.VehicleMarca,
      vehicleModelo: rawPart.vehicleModelo || rawPart.VehicleModelo,
      vehicleVersion: rawPart.vehicleVersion || rawPart.VehicleVersion,
      vehicleAnyo: rawPart.vehicleAnyo || rawPart.VehicleAnyo
    };
  }

  formatPrice(precio: string | number): string {
    if (!precio || precio === '0' || precio === 0) return '0';
    
    // Convert to string and clean
    const precioStr = String(precio).replace(',', '.');
    const precioNum = parseFloat(precioStr);
    
    if (isNaN(precioNum) || precioNum <= 0) return '0';
    
    // Format to 2 decimal places
    return precioNum.toFixed(2);
  }

  isZeroPrice(precio: string): boolean {
    const precioNum = parseFloat(precio.replace(',', '.'));
    return isNaN(precioNum) || precioNum <= 0;
  }

  async getExistingPartIds(refLocals: number[]): Promise<Map<number, number>> {
    if (refLocals.length === 0) return new Map();

    const chunks = [];
    for (let i = 0; i < refLocals.length; i += 1000) {
      chunks.push(refLocals.slice(i, i + 1000));
    }

    const existingMap = new Map<number, number>();
    
    for (const chunk of chunks) {
      const existing = await db
        .select({ id: parts.id, refLocal: parts.refLocal })
        .from(parts)
        .where(and(
          inArray(parts.refLocal, chunk),
          eq(parts.idEmpresa, this.config.companyId)
        ));
      
      existing.forEach(p => existingMap.set(p.refLocal, p.id));
    }

    return existingMap;
  }

  async getVehicleByIdLocal(idLocal: number): Promise<number | null> {
    if (idLocal <= 0) return null;
    
    const [vehicle] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.idLocal, idLocal))
      .limit(1);
    
    return vehicle?.id || null;
  }

  async createVehiclePartRelation(vehicleId: number, partId: number, idVehiculoOriginal: number): Promise<void> {
    try {
      // Check if relation already exists
      const [existing] = await db
        .select({ id: vehicleParts.id })
        .from(vehicleParts)
        .where(and(
          eq(vehicleParts.vehicleId, vehicleId),
          eq(vehicleParts.partId, partId)
        ))
        .limit(1);

      if (!existing) {
        await db.insert(vehicleParts).values({
          vehicleId,
          partId,
          idVehiculoOriginal
        });
      }
    } catch (error) {
      console.error(`Error creating vehicle-part relation:`, error);
    }
  }

  async upsertPartsBatch(partsData: PartData[]): Promise<BatchResult> {
    const result: BatchResult = {
      inserted: 0,
      updated: 0,
      errors: [],
      processedIds: [],
      activatedParts: 0
    };

    try {
      const refLocals = partsData.map(p => p.refLocal);
      const existingMap = await this.getExistingPartIds(refLocals);

      const toUpdate: Array<{id: number, data: PartData}> = [];
      const toInsert: PartData[] = [];

      // Separate updates and inserts
      for (const part of partsData) {
        const existingId = existingMap.get(part.refLocal);
        if (existingId) {
          toUpdate.push({ id: existingId, data: part });
        } else {
          toInsert.push(part);
        }
        result.processedIds.push(part.refLocal);
      }

      // Batch insert new parts
      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += this.UPSERT_BATCH_SIZE) {
          const batch = toInsert.slice(i, i + this.UPSERT_BATCH_SIZE);
          try {
            const insertData = batch.map(part => ({
              refLocal: part.refLocal,
              idEmpresa: part.idEmpresa,
              codArticulo: part.codArticulo,
              refPrincipal: part.refPrincipal,
              descripcionArticulo: part.descripcionArticulo,
              descripcionFamilia: part.descripcionFamilia,
              codFamilia: part.codFamilia,
              precio: part.precio,
              peso: part.peso,
              idVehiculo: part.idVehiculo,
              imagenes: part.imagenes,
              activo: part.activo,
              fechaCreacion: new Date(),
              
            }));

            await db.insert(parts).values(insertData);
            result.inserted += batch.length;
          } catch (error) {
            console.error(`Error inserting parts batch:`, error);
            result.errors.push(`Insert batch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Batch update existing parts
      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += this.UPSERT_BATCH_SIZE) {
          const batch = toUpdate.slice(i, i + this.UPSERT_BATCH_SIZE);
          try {
            for (const { id, data } of batch) {
              await db.update(parts)
                .set({
                  codArticulo: data.codArticulo,
                  refPrincipal: data.refPrincipal,
                  descripcionArticulo: data.descripcionArticulo,
                  descripcionFamilia: data.descripcionFamilia,
                  codFamilia: data.codFamilia,
                  precio: data.precio,
                  peso: data.peso,
                  imagenes: data.imagenes,
                  
                })
                .where(eq(parts.id, id));
            }
            result.updated += batch.length;
          } catch (error) {
            console.error(`Error updating parts batch:`, error);
            result.errors.push(`Update batch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Process vehicle associations and activate valid parts
      await this.processVehicleAssociations(partsData, existingMap, result);

    } catch (error) {
      console.error('Error in upsertPartsBatch:', error);
      result.errors.push(`Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  async processVehicleAssociations(partsData: PartData[], existingMap: Map<number, number>, result: BatchResult): Promise<void> {
    for (const part of partsData) {
      try {
        const partId = existingMap.get(part.refLocal);
        if (!partId) {
          // Get the newly inserted part ID
          const [newPart] = await db
            .select({ id: parts.id })
            .from(parts)
            .where(and(
              eq(parts.refLocal, part.refLocal),
              eq(parts.idEmpresa, part.idEmpresa)
            ))
            .limit(1);
          
          if (!newPart) continue;
          
          await this.associatePartWithVehicle(newPart.id, part);
        } else {
          await this.associatePartWithVehicle(partId, part);
        }
      } catch (error) {
        console.error(`Error processing vehicle association for part ${part.refLocal}:`, error);
        result.errors.push(`Vehicle association error for part ${part.refLocal}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async associatePartWithVehicle(partId: number, partData: PartData): Promise<void> {
    if (partData.idVehiculo <= 0) return;

    const vehicleId = await this.getVehicleByIdLocal(partData.idVehiculo);
    
    if (vehicleId) {
      await this.createVehiclePartRelation(vehicleId, partId, partData.idVehiculo);
      
      // Activate part if it has valid vehicle and non-zero price
      if (!this.isZeroPrice(partData.precio)) {
        await db.update(parts)
          .set({ activo: true })
          .where(eq(parts.id, partId));
      }
    }
  }

  async processPartsBatch(rawParts: any[]): Promise<BatchResult> {
    try {
      const normalizedParts = rawParts
        .map(p => this.normalizePartData(p))
        .filter(p => p.refLocal && p.refLocal > 0);

      return await this.upsertPartsBatch(normalizedParts);
    } catch (error) {
      console.error('Error processing parts batch:', error);
      return {
        inserted: 0,
        updated: 0,
        errors: [`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processedIds: [],
        activatedParts: 0
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

  async importPartsOptimized(importId: number, fullImport: boolean = true): Promise<void> {
    await this.configure();
    
    console.log(`🔧 Iniciando importación OPTIMIZADA ${fullImport ? 'COMPLETA' : 'INCREMENTAL'} de piezas`);
    
    let lastId = 0;
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalActivated = 0;
    let hasMore = true;
    const errors: string[] = [];
    const processedIds: number[] = [];

    await this.updateImportProgress(importId, {
      status: 'in_progress',
      processingItem: 'Iniciando importación optimizada de piezas',
      progress: 5
    });

    try {
      while (hasMore) {
        console.log(`📡 Obteniendo lote de piezas desde lastId=${lastId}`);
        
        const apiResponse = await this.fetchPartsFromAPI(lastId, this.BATCH_SIZE);
        
        // Extract parts from MetaSync API response format and total count
        let partsBatch: any[] = [];
        let totalApiCount = 0;
        
        if (apiResponse?.piezas && Array.isArray(apiResponse.piezas)) {
          partsBatch = apiResponse.piezas;
          totalApiCount = apiResponse.result_set?.total || 0;
        } else if (apiResponse?.data?.piezas && Array.isArray(apiResponse.data.piezas)) {
          partsBatch = apiResponse.data.piezas;
          totalApiCount = apiResponse.data.result_set?.total || 0;
        } else if (Array.isArray(apiResponse)) {
          partsBatch = apiResponse;
        } else if (Array.isArray(apiResponse.data)) {
          partsBatch = apiResponse.data;
        }

        console.log(`📊 Procesando lote de ${partsBatch.length} piezas`);
        if (totalApiCount > 0) {
          console.log(`📊 Total de piezas disponibles en API: ${totalApiCount}`);
        }

        if (partsBatch.length === 0) {
          console.log('✅ No hay más piezas para procesar');
          hasMore = false;
          break;
        }

        const batchResult = await this.processPartsBatch(partsBatch);
        
        totalProcessed += partsBatch.length;
        totalInserted += batchResult.inserted;
        totalUpdated += batchResult.updated;
        totalActivated += batchResult.activatedParts;
        errors.push(...batchResult.errors);
        processedIds.push(...batchResult.processedIds);

        const updateData: any = {
          processedItems: totalProcessed,
          newItems: totalInserted,
          updatedItems: totalUpdated,
          errors: errors.slice(-50)
        };

        // Update progress and display based on API total count
        if (totalApiCount > 0) {
          updateData.totalItems = totalApiCount;
          updateData.progress = Math.min(95, Math.floor((totalProcessed / totalApiCount) * 100));
          updateData.processingItem = `Procesadas ${totalProcessed} de ${totalApiCount} piezas (${totalInserted} nuevas, ${totalUpdated} actualizadas, ${totalActivated} activadas)`;
        } else {
          updateData.progress = Math.min(95, Math.floor((totalProcessed / (totalProcessed + 1000)) * 100));
          updateData.processingItem = `Procesadas ${totalProcessed} piezas (${totalInserted} nuevas, ${totalUpdated} actualizadas, ${totalActivated} activadas)`;
        }

        await this.updateImportProgress(importId, updateData);

        // Calculate next lastId
        if (partsBatch.length > 0) {
          const lastPart = partsBatch[partsBatch.length - 1];
          const newLastId = lastPart.refLocal || lastPart.RefLocal || lastPart.id;
          if (newLastId && newLastId > lastId) {
            lastId = newLastId;
          } else {
            lastId += partsBatch.length;
          }
        }

        if (partsBatch.length < this.BATCH_SIZE) {
          hasMore = false;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Update final activation status
      await this.updatePartActivationStatus(importId);

      const finalStatus = errors.length > totalProcessed * 0.1 ? 'partial' : 'completed';
      await this.updateImportProgress(importId, {
        status: finalStatus,
        progress: 100,
        endTime: new Date(),
        totalItems: totalProcessed,
        processingItem: `Importación completada: ${totalProcessed} piezas procesadas, ${totalActivated} activadas`,
        errors: errors.slice(-100)
      });

      console.log(`✅ Importación optimizada ${finalStatus}: ${totalProcessed} procesadas, ${totalInserted} nuevas, ${totalUpdated} actualizadas, ${totalActivated} activadas`);

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

  async updatePartActivationStatus(importId: number): Promise<void> {
    console.log('🔄 Actualizando estado de activación de piezas...');
    
    await this.updateImportProgress(importId, {
      processingItem: 'Finalizando activación de piezas...'
    });

    // Activate parts that have valid vehicle associations and non-zero prices
    const result = await db.execute(
      sql`UPDATE parts SET activo = true 
          WHERE id IN (
            SELECT DISTINCT p.id 
            FROM parts p 
            INNER JOIN vehicle_parts vp ON p.id = vp.part_id 
            INNER JOIN vehicles v ON vp.vehicle_id = v.id 
            WHERE v.activo = true 
            AND p.precio != '0' 
            AND p.precio != '0.00'
            AND p.activo = false
          )`
    );

    console.log(`✅ Piezas activadas: ${result.rowCount || 0}`);
  }
}

export const optimizedPartsImport = new OptimizedPartsImport();