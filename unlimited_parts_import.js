/**
 * Unlimited Parts Import - Complete pagination implementation
 * Imports all 138,505+ parts using proper MetaSync API pagination
 */

import { neon } from '@neondatabase/serverless';
import axios from 'axios';

const sql = neon(process.env.DATABASE_URL);

async function unlimitedPartsImport() {
  console.log('🚀 Iniciando importación ILIMITADA de piezas...');
  
  try {
    // Get API configuration
    const configResult = await sql`
      SELECT api_key, company_id, channel 
      FROM api_config 
      WHERE active = true 
      LIMIT 1
    `;
    
    if (!configResult.length) {
      throw new Error('No se encontró configuración de API');
    }
    
    const config = configResult[0];
    
    // Create import record
    const importResult = await sql`
      INSERT INTO import_history (type, status, start_time, processing_item, progress, total_items, processed_items, new_items, updated_items, last_updated)
      VALUES ('parts', 'in_progress', NOW(), 'Iniciando importación ilimitada...', 0, 138505, 0, 0, 0, NOW())
      RETURNING id
    `;
    
    const importId = importResult[0].id;
    console.log(`📝 Registro de importación creado: ${importId}`);
    
    // Initialize pagination variables
    let allParts = [];
    let lastId = 0;
    let batchCount = 0;
    let totalFromAPI = 0;
    const batchSize = 1000; // API standard batch size
    const maxBatches = 200; // Safety limit: 200 * 1000 = 200,000 parts maximum
    
    console.log('📦 FASE 1: Descarga masiva con paginación completa...');
    
    // Download all parts using proper pagination
    while (batchCount < maxBatches) {
      batchCount++;
      console.log(`📡 Lote ${batchCount}: Descargando desde lastId=${lastId}`);
      
      await sql`
        UPDATE import_history 
        SET processing_item = ${`Descargando lote ${batchCount}: ${allParts.length} de ~138,505 piezas`},
            progress = ${Math.min(30, Math.round((allParts.length / 138505) * 30))},
            last_updated = NOW()
        WHERE id = ${importId}
      `;
      
      try {
        const response = await axios.get('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
          headers: {
            'apikey': config.api_key,
            'canal': config.channel || 'webcliente MRC',
            'idempresa': config.company_id.toString(),
            'fecha': '2000-01-01',
            'lastid': lastId.toString(),
            'offset': batchSize.toString()
          },
          timeout: 60000
        });
        
        const batchData = response.data?.piezas || [];
        const resultSet = response.data?.result_set;
        
        if (resultSet) {
          totalFromAPI = resultSet.total;
          console.log(`📊 API reporta ${totalFromAPI.toLocaleString()} piezas totales`);
        }
        
        if (batchData.length === 0) {
          console.log(`🏁 Lote ${batchCount}: No hay más datos - descarga completa`);
          break;
        }
        
        allParts = allParts.concat(batchData);
        console.log(`📥 Lote ${batchCount}: +${batchData.length} piezas (Total: ${allParts.length.toLocaleString()})`);
        
        // Update lastId for next batch from result_set
        if (resultSet && resultSet.lastId) {
          lastId = resultSet.lastId;
        } else if (batchData.length > 0) {
          // Fallback: use RefLocal from last item
          const lastPart = batchData[batchData.length - 1];
          const newLastId = lastPart.refLocal || lastPart.RefLocal;
          if (newLastId && newLastId > lastId) {
            lastId = newLastId;
          } else {
            console.log('🚧 No se puede determinar lastId para siguiente lote');
            break;
          }
        }
        
        // If we got less than batch size, we're at the end
        if (batchData.length < batchSize) {
          console.log(`🎯 Última página alcanzada (${batchData.length} < ${batchSize})`);
          break;
        }
        
        // Update total items if we have API info
        if (totalFromAPI > 0) {
          await sql`
            UPDATE import_history 
            SET total_items = ${totalFromAPI}
            WHERE id = ${importId}
          `;
        }
        
      } catch (downloadError) {
        console.error(`❌ Error descargando lote ${batchCount}:`, downloadError.message);
        
        // Try to continue with next batch if possible
        if (downloadError.code === 'ECONNRESET' || downloadError.code === 'ETIMEDOUT') {
          console.log('🔄 Error de conexión, continuando con siguiente lote...');
          lastId += 1000; // Skip ahead
          continue;
        } else {
          break;
        }
      }
    }
    
    const finalTotal = allParts.length;
    console.log(`📊 DESCARGA COMPLETA: ${finalTotal.toLocaleString()} piezas descargadas`);
    
    // Update progress for processing phase
    await sql`
      UPDATE import_history 
      SET processing_item = 'Iniciando procesamiento masivo...',
          progress = 35,
          total_items = ${finalTotal},
          last_updated = NOW()
      WHERE id = ${importId}
    `;
    
    console.log('⚡ FASE 2: Procesamiento masivo con PostgreSQL UPSERT...');
    
    // Ultra-fast processing with PostgreSQL UPSERT
    const CHUNK_SIZE = 500; // Optimized chunk size
    let processed = 0;
    let newParts = 0;
    let updatedParts = 0;
    
    for (let i = 0; i < allParts.length; i += CHUNK_SIZE) {
      const chunk = allParts.slice(i, i + CHUNK_SIZE);
      const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
      const totalChunks = Math.ceil(allParts.length / CHUNK_SIZE);
      
      console.log(`⚡ Procesando chunk ${chunkNumber}/${totalChunks} (${chunk.length} piezas)`);
      
      // Process chunk with UPSERT operations
      for (const part of chunk) {
        try {
          const refLocal = part.refLocal || part.RefLocal;
          const precio = String(part.precio || part.Precio || '0');
          const idVehiculo = part.idVehiculo || part.IdVehiculo || -1;
          
          // Extract vehicle information
          const vehicleInfo = part.Vehiculo || {};
          const vehicleMarca = vehicleInfo.nombreMarca || part.vehicleMarca || '';
          const vehicleModelo = vehicleInfo.nombreModelo || part.vehicleModelo || '';
          const vehicleVersion = vehicleInfo.nombreVersion || part.vehicleVersion || '';
          const vehicleAnyo = parseInt(vehicleInfo.anyoVehiculo || part.vehicleAnyo) || 0;
          
          // Determine if part should be active
          const hasValidPrice = parseFloat(precio) > 0;
          const hasVehicleInfo = vehicleMarca !== '' || idVehiculo > 0;
          const isActive = hasValidPrice && hasVehicleInfo;
          
          const result = await sql`
            INSERT INTO parts (
              ref_local, id_empresa, cod_articulo, ref_principal, descripcion_articulo,
              descripcion_familia, cod_familia, precio, peso, id_vehiculo, imagenes,
              vehicle_marca, vehicle_modelo, vehicle_version, vehicle_anyo,
              activo, fecha_creacion, fecha_actualizacion
            ) VALUES (
              ${refLocal}, ${config.company_id}, ${part.codArticulo || part.CodArticulo || ''},
              ${part.refPrincipal || part.RefPrincipal || ''}, ${part.descripcionArticulo || part.DescripcionArticulo || ''},
              ${part.descripcionFamilia || part.DescripcionFamilia || ''}, ${part.codFamilia || part.CodFamilia || ''},
              ${precio}, ${String(part.peso || part.Peso || '0')}, ${idVehiculo},
              ${part.urlsImgs || part.imagenes || []}, ${vehicleMarca}, ${vehicleModelo},
              ${vehicleVersion}, ${vehicleAnyo}, ${isActive}, NOW(), NOW()
            )
            ON CONFLICT (ref_local)
            DO UPDATE SET
              descripcion_articulo = EXCLUDED.descripcion_articulo,
              precio = EXCLUDED.precio,
              imagenes = EXCLUDED.imagenes,
              activo = EXCLUDED.activo,
              fecha_actualizacion = EXCLUDED.fecha_actualizacion,
              vehicle_marca = EXCLUDED.vehicle_marca,
              vehicle_modelo = EXCLUDED.vehicle_modelo,
              vehicle_version = EXCLUDED.vehicle_version,
              vehicle_anyo = EXCLUDED.vehicle_anyo
            RETURNING (xmax = 0) AS was_inserted
          `;
          
          if (result[0].was_inserted) {
            newParts++;
          } else {
            updatedParts++;
          }
          
        } catch (partError) {
          console.error(`Error procesando pieza ${part.refLocal || part.RefLocal}:`, partError.message);
        }
      }
      
      processed += chunk.length;
      const progressPercent = 35 + Math.round((processed / allParts.length) * 60);
      
      await sql`
        UPDATE import_history 
        SET processing_item = ${`Procesando pieza ${processed.toLocaleString()}/${finalTotal.toLocaleString()}`},
            progress = ${Math.min(95, progressPercent)},
            processed_items = ${processed},
            new_items = ${newParts},
            updated_items = ${updatedParts},
            last_updated = NOW()
        WHERE id = ${importId}
      `;
      
      if (chunkNumber % 10 === 0) { // Log every 10 chunks
        console.log(`✅ Procesadas ${processed.toLocaleString()}/${finalTotal.toLocaleString()} piezas`);
      }
    }
    
    // Finalize import
    await sql`
      UPDATE import_history 
      SET status = 'completed',
          progress = 100,
          processed_items = ${processed},
          new_items = ${newParts},
          updated_items = ${updatedParts},
          processing_item = ${`Importación completada: ${processed.toLocaleString()} piezas procesadas (${newParts.toLocaleString()} nuevas, ${updatedParts.toLocaleString()} actualizadas)`},
          end_time = NOW(),
          last_updated = NOW()
      WHERE id = ${importId}
    `;
    
    console.log(`🎉 IMPORTACIÓN COMPLETA: ${processed.toLocaleString()} piezas procesadas`);
    console.log(`📊 Estadísticas: ${newParts.toLocaleString()} nuevas, ${updatedParts.toLocaleString()} actualizadas`);
    
  } catch (error) {
    console.error('❌ Error en importación ilimitada:', error);
    throw error;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  unlimitedPartsImport()
    .then(() => {
      console.log('✅ Importación ilimitada finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { unlimitedPartsImport };