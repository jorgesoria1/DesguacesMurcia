import { Router, Request, Response } from 'express';
import axios from 'axios';
import { db } from '../db';
import { parts, vehicles, apiConfig, importHistory } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();

/**
 * Final comprehensive import system that:
 * 1. Imports 300,000+ parts using pagination
 * 2. Applies business rules: only activate parts with price > 0 AND vehicle associations
 * 3. Fixes vehicle ID mapping between negative part IDs and positive vehicle IDs
 * 4. Formats prices correctly (divides by 100)
 */
router.post('/comprehensive-final-import', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Iniciando importación final comprensiva...');

    // Get API configuration
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No hay configuración de API activa'
      });
    }

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
      details: { source: 'comprehensive-final-300k' }
    }).returning();

    res.json({
      success: true,
      message: 'Importación comprensiva final iniciada - objetivo 300,000+ piezas',
      importId: importRecord.id
    });

    // Start background import
    setTimeout(async () => {
      try {
        let allParts: any[] = [];
        let lastId = 0;
        let batchCount = 0;
        const maxBatches = 300; // Allow up to 300 batches to reach 300k+ parts
        const batchSize = 5000; // Larger batch size

        console.log('📦 Fase 1: Descarga masiva de piezas...');

        // Download all parts using pagination
        while (batchCount < maxBatches) {
          batchCount++;
          console.log(`Lote ${batchCount}: Descargando desde lastId ${lastId}...`);

          const response = await axios.get(`https://apis.metasync.com/Almacen/RecuperarCambiosCanal`, {
            headers: {
              'apikey': config.apiKey,
              'Content-Type': 'application/json',
              'fecha': '2024-01-01',
              'lastid': lastId.toString(),
              'offset': batchSize.toString()
            }
          });

          const batchData = response.data?.piezas || [];
          const resultSet = response.data?.result_set;

          if (batchData.length === 0) {
            console.log(`Lote ${batchCount}: No hay más datos disponibles`);
            break;
          }

          allParts = allParts.concat(batchData);
          console.log(`Lote ${batchCount}: +${batchData.length} piezas (Total: ${allParts.length.toLocaleString()})`);

          // Update progress
          await db.update(importHistory)
            .set({
              totalItems: allParts.length,
              processingItem: `Descargando lote ${batchCount}: ${allParts.length.toLocaleString()} piezas`
            })
            .where(eq(importHistory.id, importRecord.id));

          // Update lastId for next batch
          if (resultSet && resultSet.lastId) {
            lastId = resultSet.lastId;
          } else {
            const maxRefLocal = Math.max(...batchData.map(p => p.refLocal || 0));
            lastId = maxRefLocal + 1;
          }

          // Check if we've reached target
          if (allParts.length >= 300000) {
            console.log(`✅ Objetivo alcanzado: ${allParts.length.toLocaleString()} piezas descargadas`);
            break;
          }

          // Small delay to prevent API overload
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`📊 Descarga completada: ${allParts.length.toLocaleString()} piezas obtenidas`);
        console.log('🔧 Fase 2: Procesamiento con asociaciones de vehículos...');

        let processed = 0;
        let newParts = 0;
        let updatedParts = 0;
        let activeParts = 0;
        let withVehicles = 0;

        // Process all parts with vehicle associations and business rules
        for (const part of allParts) {
          try {
            const refLocal = part.refLocal || part.RefLocal;
            const idVehiculo = part.idVehiculo || part.IdVehiculo;

            if (!refLocal) continue;

            // Check if part exists
            const [existing] = await db.select()
              .from(parts)
              .where(eq(parts.refLocal, refLocal))
              .limit(1);

            // Find vehicle using enhanced ID matching patterns
            let vehicle = null;
            if (idVehiculo) {
              const vehicleIdAbs = Math.abs(idVehiculo);
              const patterns = [
                vehicleIdAbs,
                vehicleIdAbs % 1000000,
                vehicleIdAbs % 100000,
                vehicleIdAbs % 10000,
                vehicleIdAbs % 1000,
                Math.floor(vehicleIdAbs / 1000),
                Math.floor(vehicleIdAbs / 10000)
              ];

              for (const pattern of patterns) {
                const [foundVehicle] = await db.select()
                  .from(vehicles)
                  .where(eq(vehicles.idLocal, pattern))
                  .limit(1);

                if (foundVehicle) {
                  vehicle = foundVehicle;
                  withVehicles++;
                  break;
                }
              }
            }

            // Format price correctly (divide by 100)
            let precio = part.precio?.toString() || '0';
            const precioNum = parseFloat(precio);
            if (!isNaN(precioNum) && precioNum >= 100) {
              precio = (precioNum / 100).toFixed(2);
            }

            // Apply business rules: only activate if price > 0 AND has vehicle
            const finalPrecioNum = parseFloat(precio);
            const hasValidPrice = !isNaN(finalPrecioNum) && finalPrecioNum > 0;
            const hasVehicle = vehicle !== null;
            const shouldBeActive = hasValidPrice && hasVehicle;

            if (shouldBeActive) {
              activeParts++;
            }

            const partData = {
              refLocal,
              idEmpresa: config.companyId,
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
              precio: precio,
              peso: part.peso?.toString() || '0',
              imagenes: part.urlsImgs || part.imagenes || [],
              activo: shouldBeActive,
              isPendingRelation: !hasVehicle,
              sincronizado: true,
              ultimaSincronizacion: new Date(),
              
            };

            if (existing) {
              await db.update(parts).set(partData).where(eq(parts.refLocal, refLocal));
              updatedParts++;
            } else {
              await db.insert(parts).values(partData);
              newParts++;
            }

            processed++;

            // Update progress every 5000 parts
            if (processed % 5000 === 0) {
              const progressPercent = Math.round((processed / allParts.length) * 100);
              await db.update(importHistory)
                .set({
                  progress: progressPercent,
                  processedItems: processed,
                  newItems: newParts,
                  updatedItems: updatedParts,
                  processingItem: `Procesado ${processed.toLocaleString()}/${allParts.length.toLocaleString()} - ${activeParts.toLocaleString()} activas`
                })
                .where(eq(importHistory.id, importRecord.id));

              console.log(`Progreso: ${processed.toLocaleString()}/${allParts.length.toLocaleString()} (${activeParts.toLocaleString()} activas, ${withVehicles.toLocaleString()} con vehículos)`);
            }

          } catch (partError) {
            console.error(`Error procesando pieza:`, partError);
          }
        }

        // Complete import
        await db.update(importHistory)
          .set({
            status: 'completed',
            progress: 100,
            processedItems: processed,
            newItems: newParts,
            updatedItems: updatedParts,
            endTime: new Date(),
            processingItem: `Completado: ${processed.toLocaleString()} piezas, ${activeParts.toLocaleString()} activas (reglas aplicadas)`
          })
          .where(eq(importHistory.id, importRecord.id));

        console.log('🎉 IMPORTACIÓN FINAL COMPLETADA:');
        console.log(`- Total procesadas: ${processed.toLocaleString()}`);
        console.log(`- Nuevas: ${newParts.toLocaleString()}`);
        console.log(`- Actualizadas: ${updatedParts.toLocaleString()}`);
        console.log(`- Con vehículos asociados: ${withVehicles.toLocaleString()}`);
        console.log(`- Activas (precio válido + vehículo): ${activeParts.toLocaleString()}`);

        if (processed >= 300000) {
          console.log('✅ OBJETIVO DE 300,000+ PIEZAS ALCANZADO');
        }

      } catch (error) {
        console.error('❌ Error en importación final:', error);
        await db.update(importHistory)
          .set({
            status: 'failed',
            endTime: new Date(),
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 100);

  } catch (error) {
    console.error('❌ Error iniciando importación final:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación final',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;