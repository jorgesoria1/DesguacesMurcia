/**
 * Ultra-Optimized Parts Import System
 * Implements the high-performance bulk operations described in the optimization document
 * Processes thousands of records per minute using PostgreSQL bulk operations
 */

import { db } from '../db';
import { parts, importHistory } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import axios from 'axios';

interface ImportConfig {
  apiKey: string;
  companyId: number;
  channel: string;
}

export class UltraOptimizedPartsImporter {
  private config: ImportConfig;
  private importId: number;
  
  constructor(config: ImportConfig, importId: number) {
    this.config = config;
    this.importId = importId;
  }

  async executeUltraFastImport(): Promise<void> {
    console.log('🚀 Iniciando importación ultra-optimizada de piezas...');
    
    try {
      // Phase 1: Bulk download all parts data
      const allParts = await this.bulkDownloadParts();
      console.log(`📦 Descargadas ${allParts.length} piezas de la API`);

      // Phase 2: Ultra-fast bulk processing
      await this.ultraFastBulkProcess(allParts);
      
      // Phase 3: Finalize import
      await this.finalizeImport(allParts.length);
      
    } catch (error) {
      console.error('❌ Error en importación ultra-optimizada:', error);
      await this.markImportAsFailed(error);
      throw error;
    }
  }

  private async bulkDownloadParts(): Promise<any[]> {
    const allParts: any[] = [];
    let lastId = 0;
    let hasMoreData = true;
    let batchCount = 0;
    let totalApiCount = 0;

    while (hasMoreData) {
      batchCount++;
      console.log(`📡 Descargando lote ${batchCount} desde lastId=${lastId}`);

      try {
        const response = await axios.get('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
          headers: {
            'apikey': this.config.apiKey,
            'canal': this.config.channel || '1',
            'idempresa': this.config.companyId.toString(),
            'fecha': '2000-01-01',
            'lastid': lastId.toString(),
            'offset': '1000'
          },
          timeout: 30000
        });

        let partsData = [];
        
        // Extract parts and total count from response
        if (response.data?.piezas && Array.isArray(response.data.piezas)) {
          partsData = response.data.piezas;
          totalApiCount = response.data.result_set?.total || response.data.total || 0;
        } else if (Array.isArray(response.data)) {
          partsData = response.data;
        }

        // Extract total count on first batch if not available
        if (batchCount === 1 && totalApiCount === 0 && partsData.length > 0) {
          try {
            const countResponse = await axios.get('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
              headers: {
                'apikey': this.config.apiKey,
                'canal': this.config.channel || '1',
                'idempresa': this.config.companyId.toString(),
                'fecha': '2000-01-01',
                'lastid': '0',
                'offset': '1',
                'count': 'true'
              },
              timeout: 10000
            });
            totalApiCount = countResponse.data?.total || countResponse.data?.count || 0;
          } catch (countError) {
            console.log('ℹ️ Could not get total count, using progressive count');
          }
        }

        if (partsData.length === 0) {
          hasMoreData = false;
          break;
        }

        allParts.push(...partsData);
        
        // Update progress with total count if available
        const displayTotal = totalApiCount > 0 ? totalApiCount : allParts.length;
        await this.updateProgress(
          `Descargando lote ${batchCount}: ${allParts.length} de ${displayTotal} piezas`,
          Math.min(30, batchCount * 2),
          displayTotal,
          allParts.length
        );

        // Check if we have all data
        if (partsData.length < 1000) {
          hasMoreData = false;
        } else {
          // Get lastId for next batch
          const lastPart = partsData[partsData.length - 1];
          lastId = lastPart.RefLocal || lastPart.refLocal || lastId + 1000;
        }

      } catch (downloadError) {
        console.error(`Error descargando lote ${batchCount}:`, downloadError);
        hasMoreData = false;
      }
    }

    return allParts;
  }

  private async ultraFastBulkProcess(allParts: any[]): Promise<void> {
    console.log('⚡ Iniciando procesamiento ultra-rápido...');
    
    const ULTRA_CHUNK_SIZE = 1000; // Maximum PostgreSQL can handle efficiently
    let processed = 0;
    
    for (let i = 0; i < allParts.length; i += ULTRA_CHUNK_SIZE) {
      const chunk = allParts.slice(i, i + ULTRA_CHUNK_SIZE);
      
      try {
        // Prepare all data for ultra-fast UPSERT
        const upsertData = chunk.map(part => {
          const refLocal = part.RefLocal || part.refLocal;
          const precio = String(part.Precio || part.precio || '0');
          const idVehiculo = part.IdVehiculo || part.idVehiculo || -1;

          // Extract vehicle information
          const vehicleInfo = part.Vehiculo || {};
          const vehicleMarca = vehicleInfo.Marca || part.vehicleMarca || '';
          const vehicleModelo = vehicleInfo.Modelo || part.vehicleModelo || '';
          const vehicleVersion = vehicleInfo.Version || part.vehicleVersion || '';
          const vehicleAnyo = parseInt(vehicleInfo.Anyo || part.vehicleAnyo) || 0;

          return {
            refLocal,
            idEmpresa: this.config.companyId,
            codArticulo: part.CodArticulo || part.codArticulo || '',
            refPrincipal: part.RefPrincipal || part.refPrincipal || '',
            descripcionArticulo: part.DescripcionArticulo || part.descripcionArticulo || '',
            descripcionFamilia: part.DescripcionFamilia || part.descripcionFamilia || '',
            codFamilia: part.CodFamilia || part.codFamilia || '',
            precio: precio,
            peso: String(part.Peso || part.peso || '0'),
            idVehiculo: idVehiculo,
            imagenes: part.Imagenes || part.imagenes || [],
            vehicleMarca,
            vehicleModelo,
            vehicleVersion,
            vehicleAnyo,
            activo: parseFloat(precio) > 0 && (vehicleMarca !== '' || idVehiculo > 0),
            fechaCreacion: new Date(),
            
          };
        });

        // Ultra-fast PostgreSQL UPSERT (single operation for entire chunk)
        await db.insert(parts)
          .values(upsertData)
          .onConflictDoUpdate({
            target: parts.refLocal,
            set: {
              descripcionArticulo: sql`excluded.descripcion_articulo`,
              precio: sql`excluded.precio`,
              imagenes: sql`excluded.imagenes`,
              activo: sql`excluded.activo`,
              // fechaActualizacion auto-updated,
              vehicleMarca: sql`excluded.vehicle_marca`,
              vehicleModelo: sql`excluded.vehicle_modelo`,
              vehicleVersion: sql`excluded.vehicle_version`,
              vehicleAnyo: sql`excluded.vehicle_anyo`
            }
          });

        processed += chunk.length;
        
        // Update progress
        const progressPercent = 30 + Math.round((processed / allParts.length) * 65);
        await this.updateProgress(
          `Procesado ultra-rápido: ${processed}/${allParts.length} piezas`,
          progressPercent,
          allParts.length,
          processed
        );

      } catch (chunkError) {
        console.error(`Error procesando chunk ultra-rápido:`, chunkError);
        // Continue with next chunk
      }
    }

    console.log(`⚡ Procesamiento ultra-rápido completado: ${processed} piezas`);
  }

  private async updateProgress(message: string, progress: number, totalItems: number, processedItems: number): Promise<void> {
    await db.update(importHistory)
      .set({
        processingItem: message,
        progress: Math.min(100, progress),
        totalItems,
        processedItems,
        lastUpdated: new Date()
      })
      .where(eq(importHistory.id, this.importId));
  }

  private async finalizeImport(totalProcessed: number): Promise<void> {
    await db.update(importHistory)
      .set({
        status: 'completed',
        progress: 100,
        processedItems: totalProcessed,
        processingItem: `Importación ultra-optimizada completada: ${totalProcessed} piezas`,
        endTime: new Date(),
        lastUpdated: new Date()
      })
      .where(eq(importHistory.id, this.importId));

    console.log(`✅ Importación ultra-optimizada completada: ${totalProcessed} piezas`);
  }

  private async markImportAsFailed(error: any): Promise<void> {
    await db.update(importHistory)
      .set({
        status: 'failed',
        processingItem: `Error: ${error.message || 'Unknown error'}`,
        lastUpdated: new Date()
      })
      .where(eq(importHistory.id, this.importId));
  }
}