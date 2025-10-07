import { Request, Response, Router } from 'express';
import { db } from '../db';
import { parts, vehicles, vehicleParts, importHistory, apiConfig } from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import axios from 'axios';

const router = Router();

/**
 * Endpoint mejorado para importar piezas con el mismo sistema de monitoreo que vehículos
 */
router.post('/import/parts-improved', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Iniciando importación mejorada de piezas...');

    // Obtener configuración de API
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No hay configuración de API activa'
      });
    }

    // Crear registro de importación
    const [importRecord] = await db.insert(importHistory).values({
      type: 'parts',
      status: 'pending',
      isFullImport: true,
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      newItems: 0,
      updatedItems: 0,
      startTime: new Date(),
      details: { source: 'metasync-improved', importType: 'complete' },
      errors: []
    }).returning();

    res.json({
      success: true,
      message: 'Importación mejorada de piezas iniciada',
      importId: importRecord.id
    });

    // Iniciar importación en segundo plano
    setTimeout(async () => {
      try {
        await db.update(importHistory)
          .set({ 
            status: 'in_progress',
            processingItem: 'Iniciando importación de piezas...',
            progress: 5
          })
          .where(eq(importHistory.id, importRecord.id));

        let lastId = 0;
        let hasMore = true;
        let totalProcessed = 0;
        let totalNew = 0;
        let totalUpdated = 0;
        let totalActivated = 0;
        const batchSize = 1000;
        const errors = [];
        let batchCount = 0;

        while (hasMore) {
          batchCount++;
          console.log(`📡 Obteniendo lote ${batchCount} de piezas desde lastId=${lastId}`);
          
          await db.update(importHistory)
            .set({ 
              processingItem: `Descargando lote ${batchCount} de piezas...`
            })
            .where(eq(importHistory.id, importRecord.id));

          const partsResponse = await axios.get(`https://apis.metasync.com/Almacen/RecuperarCambiosArticulosCanal`, {
            headers: {
              'apikey': config.apiKey,
              'Content-Type': 'application/json',
              'fecha': '2000-01-01',
              'lastid': lastId.toString(),
              'offset': batchSize.toString()
            }
          });

          // Extract parts from different response formats
          let partsBatch = [];
          if (partsResponse.data?.data?.articulos && Array.isArray(partsResponse.data.data.articulos)) {
            partsBatch = partsResponse.data.data.articulos;
          } else if (partsResponse.data?.articulos && Array.isArray(partsResponse.data.articulos)) {
            partsBatch = partsResponse.data.articulos;
          } else if (Array.isArray(partsResponse.data)) {
            partsBatch = partsResponse.data;
          }

          console.log(`📥 Recibidas ${partsBatch.length} piezas de la API`);

          if (partsBatch.length === 0) {
            console.log('✅ No hay más piezas para importar');
            hasMore = false;
            break;
          }

          // Process parts batch with monitoring
          let batchNew = 0;
          let batchUpdated = 0;
          let batchActivated = 0;

          await db.update(importHistory)
            .set({ 
              processingItem: `Procesando lote ${batchCount}: ${partsBatch.length} piezas`,
              totalItems: totalProcessed + partsBatch.length
            })
            .where(eq(importHistory.id, importRecord.id));

          for (let i = 0; i < partsBatch.length; i++) {
            const part = partsBatch[i];
            try {
              const refLocal = part.refLocal || part.RefLocal || part.id;
              const precio = String(part.precio || part.Precio || '0');
              const idVehiculo = part.idVehiculo || part.IdVehiculo || -1;
              
              // Check if part exists
              const [existing] = await db.select()
                .from(parts)
                .where(and(
                  eq(parts.refLocal, refLocal),
                  eq(parts.idEmpresa, config.companyId)
                ))
                .limit(1);

              const partData = {
                refLocal,
                idEmpresa: config.companyId,
                codArticulo: part.codArticulo || part.CodArticulo || '',
                refPrincipal: part.refPrincipal || part.RefPrincipal || '',
                descripcionArticulo: part.descripcionArticulo || part.DescripcionArticulo || '',
                descripcionFamilia: part.descripcionFamilia || part.DescripcionFamilia || '',
                codFamilia: part.codFamilia || part.CodFamilia || '',
                precio: precio,
                peso: String(part.peso || part.Peso || '0'),
                idVehiculo: idVehiculo,
                imagenes: part.imagenes || part.Imagenes || [],
                activo: false, // Initially inactive
                
              };

              let partId;
              if (existing) {
                await db.update(parts)
                  .set(partData)
                  .where(eq(parts.id, existing.id));
                batchUpdated++;
                partId = existing.id;
              } else {
                partData.fechaCreacion = new Date();
                const [inserted] = await db.insert(parts).values(partData).returning();
                batchNew++;
                partId = inserted.id;
              }

              // Try to associate with vehicle and activate if valid
              if (idVehiculo > 0 && parseFloat(precio) > 0) {
                const [vehicle] = await db.select({ id: vehicles.id })
                  .from(vehicles)
                  .where(eq(vehicles.idLocal, idVehiculo))
                  .limit(1);

                if (vehicle) {
                  // Activate the part
                  await db.update(parts)
                    .set({ activo: true })
                    .where(eq(parts.id, partId));
                  batchActivated++;

                  // Create vehicle-part relation if it doesn't exist
                  const [existingRelation] = await db.select()
                    .from(vehicleParts)
                    .where(and(
                      eq(vehicleParts.vehicleId, vehicle.id),
                      eq(vehicleParts.partId, partId)
                    ))
                    .limit(1);

                  if (!existingRelation) {
                    await db.insert(vehicleParts).values({
                      vehicleId: vehicle.id,
                      partId: partId,
                      idVehiculoOriginal: idVehiculo
                    });
                  }
                }
              }

              totalProcessed++;

              // Update progress every 50 parts
              if (totalProcessed % 50 === 0) {
                const progress = Math.min(95, Math.floor((totalProcessed / (totalProcessed + 500)) * 100));
                await db.update(importHistory)
                  .set({
                    progress,
                    processedItems: totalProcessed,
                    newItems: totalNew + batchNew,
                    updatedItems: totalUpdated + batchUpdated,
                    processingItem: `Lote ${batchCount}: ${i + 1}/${partsBatch.length} - Total: ${totalProcessed} piezas (${totalActivated + batchActivated} activadas)`,
                    lastUpdated: new Date()
                  })
                  .where(eq(importHistory.id, importRecord.id));
              }

            } catch (partError) {
              console.error(`Error procesando pieza:`, partError);
              errors.push(`Error procesando pieza: ${partError.message}`);
            }
          }

          totalNew += batchNew;
          totalUpdated += batchUpdated;
          totalActivated += batchActivated;

          // Update progress after batch
          const progress = Math.min(95, Math.floor((totalProcessed / (totalProcessed + 1000)) * 100));
          await db.update(importHistory)
            .set({
              progress,
              processedItems: totalProcessed,
              newItems: totalNew,
              updatedItems: totalUpdated,
              processingItem: `Completado lote ${batchCount}: ${totalProcessed} piezas procesadas (${totalActivated} activadas)`,
              errors: errors.slice(-50),
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importRecord.id));

          console.log(`✅ Lote ${batchCount} completado: ${batchNew} nuevas, ${batchUpdated} actualizadas, ${batchActivated} activadas`);

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

          // Check if we should continue
          if (partsBatch.length < batchSize) {
            hasMore = false;
          }

          // Limit batches to prevent infinite loops
          if (batchCount >= 20) {
            console.log('⚠️ Límite de lotes alcanzado');
            hasMore = false;
          }

          // Small delay to prevent API overload
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Final activation pass for parts without vehicle associations
        console.log('🔄 Ejecutando pase final de activación...');
        await db.update(importHistory)
          .set({ 
            processingItem: 'Finalizando activación de piezas...'
          })
          .where(eq(importHistory.id, importRecord.id));

        // Activate parts that have valid vehicle associations and non-zero prices
        const activationResult = await db.execute(
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

        const additionalActivated = activationResult.rowCount || 0;
        totalActivated += additionalActivated;

        // Finalizar importación
        const finalStatus = errors.length > totalProcessed * 0.1 ? 'partial' : 'completed';
        await db.update(importHistory)
          .set({
            status: finalStatus,
            progress: 100,
            processedItems: totalProcessed,
            newItems: totalNew,
            updatedItems: totalUpdated,
            processingItem: `Importación ${finalStatus}: ${totalProcessed} piezas procesadas, ${totalActivated} activadas`,
            endTime: new Date(),
            lastUpdated: new Date(),
            errors: errors.slice(-100)
          })
          .where(eq(importHistory.id, importRecord.id));

        console.log(`✅ Importación de piezas ${finalStatus}: ${totalProcessed} procesadas, ${totalNew} nuevas, ${totalUpdated} actualizadas, ${totalActivated} activadas`);

      } catch (error) {
        console.error('❌ Error en importación mejorada de piezas:', error);
        await db.update(importHistory)
          .set({
            status: 'failed',
            errors: [error instanceof Error ? error.message : 'Error desconocido'],
            endTime: new Date(),
            lastUpdated: new Date()
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 100);

  } catch (error) {
    console.error('Error iniciando importación mejorada de piezas:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error interno del servidor' 
    });
  }
});

export default router;