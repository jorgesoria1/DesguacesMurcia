import { Request, Response, Router } from 'express';
import { db } from '../db';
import { parts, importHistory, apiConfig, vehicles } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import axios from 'axios';

const router = Router();

// Endpoint para importación optimizada de piezas con monitoreo completo
router.post('/import', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Iniciando importación optimizada de piezas...');

    // Obtener configuración de API
    const [config] = await db.select()
      .from(apiConfig)
      .where(eq(apiConfig.active, true))
      .limit(1);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró configuración de API activa'
      });
    }

    // Crear registro de historial de importación
    const [importRecord] = await db.insert(importHistory).values({
      type: 'parts',
      status: 'running',
      startTime: new Date(),
      lastUpdated: new Date(),
      progress: 0,
      processedItems: 0,
      totalItems: 0,
      newItems: 0,
      updatedItems: 0,
      errors: [],
      errorCount: 0,
      processingItem: 'Iniciando importación de piezas...'
    }).returning();

    res.json({
      success: true,
      message: 'Importación de piezas iniciada',
      importId: importRecord.id
    });

    // Procesar importación en background
    setTimeout(async () => {
      try {
        let lastId = 0;
        let hasMoreData = true;
        let allParts: any[] = [];
        let batchCount = 0;
        let partsProcessed = 0;
        let partsNewCount = 0;
        let partsUpdatedCount = 0;
        let partsActivated = 0;

        // Fase 1: Descarga masiva de piezas
        console.log('📥 Fase 1: Descarga masiva de piezas...');
        
        while (hasMoreData && batchCount < 20) {
          batchCount++;
          console.log(`📡 Obteniendo lote ${batchCount} de piezas desde lastId=${lastId}`);

          await db.update(importHistory)
            .set({
              processingItem: `Descargando lote ${batchCount} de piezas...`,
              progress: Math.min(30, batchCount * 2),
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importRecord.id));

          const partsResponse = await axios.get(`https://apis.metasync.com/Almacen/RecuperarCambiosCanal`, {
            headers: {
              'apikey': config.apiKey,
              'fecha': '2000-01-01',
              'lastid': lastId.toString(),
              'offset': '1000'
            }
          });

          let partsDataArray = [];
          if (partsResponse.data?.piezas && Array.isArray(partsResponse.data.piezas)) {
            partsDataArray = partsResponse.data.piezas;
          } else if (Array.isArray(partsResponse.data)) {
            partsDataArray = partsResponse.data;
          }

          console.log(`📥 Recibidas ${partsDataArray.length} piezas de la API`);

          if (partsDataArray.length === 0) {
            console.log('🏁 No hay más datos de piezas');
            hasMoreData = false;
            break;
          }

          allParts = allParts.concat(partsDataArray);

          if (partsDataArray.length > 0) {
            const lastPart = partsDataArray[partsDataArray.length - 1];
            const newLastId = lastPart.RefLocal || lastPart.refLocal || lastPart.id;
            if (newLastId && newLastId > lastId) {
              lastId = newLastId;
              console.log(`➡️ Siguiente lastId: ${lastId}`);
            } else {
              console.log('🏁 No hay más datos según estructura');
              hasMoreData = false;
            }
          }

          await db.update(importHistory)
            .set({
              processingItem: `Descargando lote ${batchCount}: ${allParts.length} piezas obtenidas`,
              totalItems: allParts.length,
              progress: Math.min(30, batchCount * 2),
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importRecord.id));

          if (partsDataArray.length < 1000) {
            console.log('⚠️ Lote incompleto, finalizando descarga');
            hasMoreData = false;
          }
        }

        console.log(`📊 Total de piezas descargadas: ${allParts.length}`);

        // Fase 2: Procesamiento masivo
        console.log('🔄 Fase 2: Procesamiento masivo de piezas...');
        
        await db.update(importHistory)
          .set({ 
            totalItems: allParts.length,
            processingItem: `Procesando ${allParts.length} piezas...`,
            progress: 35,
            lastUpdated: new Date()
          })
          .where(eq(importHistory.id, importRecord.id));

        // Procesar en lotes de 100
        for (let i = 0; i < allParts.length; i += 100) {
          const batch = allParts.slice(i, i + 100);
          
          for (const part of batch) {
            try {
              const refLocal = part.RefLocal || part.refLocal;
              const precio = String(part.Precio || part.precio || '0');

              const [existing] = await db.select()
                .from(parts)
                .where(eq(parts.refLocal, refLocal))
                .limit(1);

              // Extract vehicle information
              const idVehiculo = part.IdVehiculo || part.idVehiculo || -1;
              const vehicleInfo = part.Vehiculo || part.vehiculo || {};
              
              const partData = {
                refLocal,
                idEmpresa: config.companyId,
                codArticulo: part.CodArticulo || part.codArticulo || '',
                refPrincipal: part.RefPrincipal || part.refPrincipal || '',
                descripcionArticulo: part.DescripcionArticulo || part.descripcionArticulo || '',
                descripcionFamilia: part.DescripcionFamilia || part.descripcionFamilia || '',
                codFamilia: part.CodFamilia || part.codFamilia || '',
                precio: precio,
                peso: String(part.Peso || part.peso || '0'),
                idVehiculo: idVehiculo,
                imagenes: part.Imagenes || part.imagenes || [],
                activo: parseFloat(precio) > 0,
                vehicleMarca: vehicleInfo.Marca || part.vehicleMarca || '',
                vehicleModelo: vehicleInfo.Modelo || part.vehicleModelo || '',
                vehicleVersion: vehicleInfo.Version || part.vehicleVersion || '',
                vehicleAnyo: parseInt(vehicleInfo.Anyo || part.vehicleAnyo) || 0,
                
              };

              if (existing) {
                await db.update(parts)
                  .set(partData)
                  .where(eq(parts.refLocal, refLocal));
                partsUpdatedCount++;
              } else {
                const insertData = {
                  ...partData,
                  fechaCreacion: new Date()
                };
                await db.insert(parts).values(insertData);
                partsNewCount++;
              }

              if (parseFloat(precio) > 0) {
                partsActivated++;
              }

              partsProcessed++;

            } catch (partError) {
              console.error(`Error procesando pieza:`, partError);
              partsProcessed++;
            }
          }

          // Actualizar progreso cada lote (desde 35% hasta 95%)
          const batchProgress = 35 + Math.round(((partsProcessed / allParts.length) * 60));
          await db.update(importHistory)
            .set({
              progress: Math.min(95, batchProgress),
              processedItems: partsProcessed,
              newItems: partsNewCount,
              updatedItems: partsUpdatedCount,
              processingItem: `Procesando pieza ${partsProcessed}/${allParts.length} (${partsActivated} activadas)`,
              lastUpdated: new Date()
            })
            .where(eq(importHistory.id, importRecord.id));
        }

        // Finalizar importación
        await db.update(importHistory)
          .set({
            status: 'completed',
            progress: 100,
            processedItems: partsProcessed,
            newItems: partsNewCount,
            updatedItems: partsUpdatedCount,
            processingItem: `Importación completa: ${partsActivated} piezas activadas`,
            endTime: new Date(),
            lastUpdated: new Date()
          })
          .where(eq(importHistory.id, importRecord.id));

        console.log(`✅ Importación de piezas finalizada: ${partsActivated} piezas activadas`);

      } catch (error) {
        console.error('❌ Error en la importación de piezas:', error);

        await db.update(importHistory)
          .set({
            status: 'failed',
            errors: [error instanceof Error ? error.message : 'Error desconocido'],
            errorCount: 1,
            endTime: new Date(),
            lastUpdated: new Date()
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 100);

  } catch (error) {
    console.error('Error iniciando importación de piezas:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error interno del servidor' 
    });
  }
});

export { router as optimizedPartsImportController };