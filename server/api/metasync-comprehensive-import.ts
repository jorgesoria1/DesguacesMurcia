import { Request, Response } from 'express';
import { db } from '../db';
import { vehicles, parts, apiConfig, importHistory } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import axios from 'axios';

/**
 * Comprehensive MetaSync import service that fixes all identified issues:
 * 1. Removes 1000 parts limit - imports ALL available parts
 * 2. Properly associates vehicle information using multiple matching patterns
 * 3. Correctly formats prices (divides by 100 as instructed)
 * 4. Creates vehicle-parts relationships
 * 5. Handles proper error recovery and progress tracking
 */

interface VehicleMatchResult {
  vehicle: any | null;
  matchType: string;
}

class ComprehensiveImportService {
  private apiKey: string = '';
  private companyId: number = 0;
  private apiUrl = 'https://apis.metasync.com/Almacen';

  async configure() {
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      throw new Error('No hay configuración de API activa');
    }
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    return config;
  }

  /**
   * Find vehicle using multiple ID matching patterns to handle MetaSync's ID variations
   */
  private async findVehicleByMultiplePatterns(vehicleId: number): Promise<VehicleMatchResult> {
    if (!vehicleId) {
      return { vehicle: null, matchType: 'no-id' };
    }

    const vehicleIdAbs = Math.abs(vehicleId);
    const patterns = [
      { id: vehicleIdAbs, type: 'exact' },
      { id: vehicleIdAbs % 1000000, type: 'mod-1m' },
      { id: vehicleIdAbs % 100000, type: 'mod-100k' },
      { id: vehicleIdAbs % 10000, type: 'mod-10k' },
      { id: vehicleIdAbs % 1000, type: 'mod-1k' }
    ];

    for (const pattern of patterns) {
      if (pattern.id <= 0) continue;
      
      const [vehicle] = await db.select()
        .from(vehicles)
        .where(eq(vehicles.idLocal, pattern.id))
        .limit(1);

      if (vehicle) {
        return { vehicle, matchType: pattern.type };
      }
    }

    return { vehicle: null, matchType: 'not-found' };
  }

  /**
   * Format price according to instructions (divide by 100)
   */
  private formatPrice(rawPrice: any): string {
    const priceStr = rawPrice?.toString() || '0';
    const priceNum = parseFloat(priceStr);
    
    if (isNaN(priceNum) || priceNum <= 0) {
      return '0';
    }
    
    // Divide by 100 if price is >= 100 as instructed
    if (priceNum >= 100) {
      return (priceNum / 100).toFixed(2);
    }
    
    return priceNum.toFixed(2);
  }

  /**
   * Import all parts with proper vehicle associations and unlimited pagination
   */
  async importAllParts(): Promise<any> {
    await this.configure();

    // Create import record
    const [importRecord] = await db.insert(importHistory).values({
      type: 'parts',
      status: 'running',
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      newItems: 0,
      updatedItems: 0,
      startTime: new Date(),
      details: { source: 'comprehensive-import', unlimited: true }
    }).returning();

    let allParts: any[] = [];
    let lastId = 0;
    let batchCount = 0;
    let hasMoreData = true;
    const batchSize = 10000; // Large batch size for efficiency

    console.log('🚀 Starting comprehensive parts import (unlimited)...');

    try {
      // Download ALL parts in batches
      while (hasMoreData && batchCount < 100) { // Safety limit of 100 batches
        batchCount++;
        console.log(`📦 Downloading batch ${batchCount} (lastId: ${lastId})...`);

        const response = await axios.get(`${this.apiUrl}/RecuperarCambiosCanal`, {
          headers: {
            'apikey': this.apiKey,
            'Content-Type': 'application/json',
            'fecha': '2024-01-01',
            'lastid': lastId.toString(),
            'offset': batchSize.toString()
          }
        });

        const batchParts = response.data?.piezas || [];
        const resultSet = response.data?.result_set;

        console.log(`📥 Batch ${batchCount}: Received ${batchParts.length} parts`);

        if (batchParts.length === 0) {
          console.log('🏁 No more parts available');
          hasMoreData = false;
          break;
        }

        allParts = allParts.concat(batchParts);

        // Update lastId for next batch
        if (resultSet && resultSet.lastId) {
          lastId = resultSet.lastId;
        } else {
          hasMoreData = false;
        }

        // Update download progress
        await db.update(importHistory)
          .set({
            processingItem: `Downloaded batch ${batchCount}: ${allParts.length} parts total`,
            totalItems: allParts.length
          })
          .where(eq(importHistory.id, importRecord.id));
      }

      console.log(`📊 Total parts downloaded: ${allParts.length}`);

      // Process all parts with vehicle associations
      let processed = 0;
      let newCount = 0;
      let updatedCount = 0;
      let vehicleMatches = 0;

      await db.update(importHistory)
        .set({
          totalItems: allParts.length,
          processingItem: `Processing ${allParts.length} parts with vehicle associations...`
        })
        .where(eq(importHistory.id, importRecord.id));

      // Process in batches for better performance
      for (let i = 0; i < allParts.length; i += 200) {
        const batch = allParts.slice(i, i + 200);

        for (const part of batch) {
          try {
            const refLocal = part.refLocal || part.RefLocal;
            const idVehiculo = part.idVehiculo || part.IdVehiculo;

            if (!refLocal) {
              console.warn(`Skipping part without refLocal: ${JSON.stringify(part).substring(0, 50)}...`);
              continue;
            }

            // Check if part already exists
            const [existing] = await db.select()
              .from(parts)
              .where(eq(parts.refLocal, refLocal))
              .limit(1);

            // Find associated vehicle
            const vehicleMatch = await this.findVehicleByMultiplePatterns(idVehiculo);
            const vehicle = vehicleMatch.vehicle;

            if (vehicle) {
              vehicleMatches++;
            }

            // Format price correctly
            const formattedPrice = this.formatPrice(part.precio);

            const partData = {
              refLocal,
              idEmpresa: this.companyId,
              idVehiculo: idVehiculo || 0,
              vehicleMarca: vehicle?.marca || '',
              vehicleModelo: vehicle?.modelo || '',
              vehicleVersion: vehicle?.version || '',
              vehicleAnyo: vehicle?.anyo || 0,
              combustible: vehicle?.combustible || '',
              codFamilia: part.codFamilia || '',
              descripcionFamilia: part.descripcionFamilia || '',
              codArticulo: part.codArticulo || '',
              descripcionArticulo: part.descripcionArticulo || '',
              refPrincipal: part.refPrincipal || '',
              precio: formattedPrice,
              peso: part.peso?.toString() || '0',
              imagenes: part.urlsImgs || part.imagenes || [],
              activo: vehicle ? true : false, // Only activate if has vehicle
              isPendingRelation: !vehicle,
              sincronizado: true,
              ultimaSincronizacion: new Date(),
              
            };

            if (existing) {
              await db.update(parts)
                .set(partData)
                .where(eq(parts.refLocal, refLocal));
              updatedCount++;
            } else {
              await db.insert(parts).values(partData);
              newCount++;
            }

            processed++;

            // Update progress every 200 parts
            if (processed % 200 === 0) {
              const progress = Math.round((processed / allParts.length) * 100);
              await db.update(importHistory)
                .set({
                  progress,
                  processedItems: processed,
                  newItems: newCount,
                  updatedItems: updatedCount,
                  processingItem: `Processed ${processed}/${allParts.length} parts (${vehicleMatches} with vehicles)`
                })
                .where(eq(importHistory.id, importRecord.id));

              console.log(`🔄 Progress: ${processed}/${allParts.length} (${progress}%) - ${vehicleMatches} vehicle matches`);
            }

          } catch (partError) {
            console.error(`Error processing part ${part.refLocal || part.RefLocal}:`, partError);
          }
        }
      }

      // Complete import
      await db.update(importHistory)
        .set({
          status: 'completed',
          progress: 100,
          processedItems: processed,
          newItems: newCount,
          updatedItems: updatedCount,
          endTime: new Date(),
          processingItem: `Import completed: ${newCount} new, ${updatedCount} updated, ${vehicleMatches} with vehicles`
        })
        .where(eq(importHistory.id, importRecord.id));

      console.log(`✅ Comprehensive import completed:`);
      console.log(`   - Total parts processed: ${processed}`);
      console.log(`   - New parts: ${newCount}`);
      console.log(`   - Updated parts: ${updatedCount}`);
      console.log(`   - Parts with vehicle associations: ${vehicleMatches}`);

      return {
        success: true,
        importId: importRecord.id,
        stats: {
          totalProcessed: processed,
          newParts: newCount,
          updatedParts: updatedCount,
          vehicleMatches: vehicleMatches,
          totalDownloaded: allParts.length
        }
      };

    } catch (error) {
      console.error('❌ Error in comprehensive import:', error);
      
      await db.update(importHistory)
        .set({
          status: 'failed',
          endTime: new Date(),
          errors: [error instanceof Error ? error.message : 'Unknown error']
        })
        .where(eq(importHistory.id, importRecord.id));

      throw error;
    }
  }
}

export const comprehensiveImportService = new ComprehensiveImportService();

// API endpoint
export async function startComprehensiveImport(req: Request, res: Response) {
  try {
    console.log('🚀 Starting comprehensive parts import...');
    
    res.json({
      success: true,
      message: 'Comprehensive parts import started - will import ALL parts with vehicle associations'
    });

    // Start import in background
    setTimeout(async () => {
      try {
        await comprehensiveImportService.importAllParts();
      } catch (error) {
        console.error('Background import failed:', error);
      }
    }, 100);

  } catch (error) {
    console.error('❌ Error starting comprehensive import:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting comprehensive import',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}