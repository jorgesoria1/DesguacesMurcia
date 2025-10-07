/**
 * Comprehensive import system for 300,000+ parts with proper business rules
 */

import { neon } from '@neondatabase/serverless';
import axios from 'axios';

const sql = neon(process.env.DATABASE_URL);

class ComprehensiveImporter {
  constructor() {
    this.apiKey = '';
    this.companyId = 0;
    this.totalImported = 0;
    this.activePartsCount = 0;
  }

  async configure() {
    console.log('Configurando sistema de importación masiva...');
    
    const configs = await sql`
      SELECT api_key, company_id 
      FROM api_config 
      WHERE active = true 
      LIMIT 1
    `;
    
    if (configs.length === 0) {
      throw new Error('No hay configuración de API activa');
    }
    
    this.apiKey = configs[0].api_key;
    this.companyId = configs[0].company_id;
    
    console.log(`API configurada para empresa ${this.companyId}`);
  }

  async importAllPartsWithPagination() {
    console.log('Iniciando importación masiva con paginación...');
    
    let allParts = [];
    let lastId = 0;
    let batchCount = 0;
    const maxBatches = 200; // Allow up to 200 batches
    const batchSize = 10000; // Large batch size
    
    // Create import record
    const [importRecord] = await sql`
      INSERT INTO import_history (
        type, status, progress, total_items, processed_items, 
        new_items, updated_items, start_time, details
      ) VALUES (
        'parts', 'running', 0, 0, 0, 0, 0, NOW(), 
        '{"source": "comprehensive-300k"}'
      ) RETURNING id
    `;
    
    const importId = importRecord.id;
    
    try {
      // Phase 1: Download all parts using pagination
      while (batchCount < maxBatches) {
        batchCount++;
        console.log(`Lote ${batchCount}: Descargando desde lastId ${lastId}...`);
        
        const response = await axios.get(`https://apis.metasync.com/Almacen/RecuperarCambiosCanal`, {
          headers: {
            'apikey': this.apiKey,
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
        await sql`
          UPDATE import_history 
          SET total_items = ${allParts.length},
              processing_item = ${`Descargando lote ${batchCount}: ${allParts.length.toLocaleString()} piezas`}
          WHERE id = ${importId}
        `;
        
        // Update lastId for next batch
        if (resultSet && resultSet.lastId) {
          lastId = resultSet.lastId;
        } else {
          // Calculate next lastId from current batch
          const maxRefLocal = Math.max(...batchData.map(p => p.refLocal || 0));
          lastId = maxRefLocal + 1;
        }
        
        // Check if we have enough parts
        if (allParts.length >= 300000) {
          console.log(`Objetivo alcanzado: ${allParts.length.toLocaleString()} piezas descargadas`);
          break;
        }
        
        // Small delay to prevent API overload
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Descarga completada: ${allParts.length.toLocaleString()} piezas obtenidas`);
      
      // Phase 2: Process all parts with vehicle associations and business rules
      console.log('Procesando piezas con asociaciones de vehículos...');
      
      let processed = 0;
      let newParts = 0;
      let updatedParts = 0;
      let activeParts = 0;
      
      for (const part of allParts) {
        try {
          const refLocal = part.refLocal || part.RefLocal;
          const idVehiculo = part.idVehiculo || part.IdVehiculo;
          
          if (!refLocal) continue;
          
          // Check if part exists
          const existing = await sql`
            SELECT id FROM parts WHERE ref_local = ${refLocal} LIMIT 1
          `;
          
          // Find vehicle using multiple patterns
          let vehicle = null;
          if (idVehiculo) {
            const vehicleIdAbs = Math.abs(idVehiculo);
            const patterns = [
              vehicleIdAbs,
              vehicleIdAbs % 1000000,
              vehicleIdAbs % 100000,
              vehicleIdAbs % 10000,
              vehicleIdAbs % 1000
            ];
            
            for (const pattern of patterns) {
              const vehicles = await sql`
                SELECT marca, modelo, version, anyo, combustible
                FROM vehicles 
                WHERE id_local = ${pattern}
                LIMIT 1
              `;
              
              if (vehicles.length > 0) {
                vehicle = vehicles[0];
                break;
              }
            }
          }
          
          // Format price (divide by 100)
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
            precio: precio,
            peso: part.peso?.toString() || '0',
            imagenes: JSON.stringify(part.urlsImgs || part.imagenes || []),
            activo: shouldBeActive,
            isPendingRelation: !hasVehicle,
            sincronizado: true,
            ultimaSincronizacion: new Date(),
            fechaActualizacion: new Date()
          };
          
          if (existing.length > 0) {
            await sql`
              UPDATE parts 
              SET 
                vehicle_marca = ${partData.vehicleMarca},
                vehicle_modelo = ${partData.vehicleModelo},
                vehicle_version = ${partData.vehicleVersion},
                vehicle_anyo = ${partData.vehicleAnyo},
                combustible = ${partData.combustible},
                cod_familia = ${partData.codFamilia},
                descripcion_familia = ${partData.descripcionFamilia},
                cod_articulo = ${partData.codArticulo},
                descripcion_articulo = ${partData.descripcionArticulo},
                ref_principal = ${partData.refPrincipal},
                precio = ${partData.precio},
                peso = ${partData.peso},
                imagenes = ${partData.imagenes},
                activo = ${partData.activo},
                is_pending_relation = ${partData.isPendingRelation},
                sincronizado = ${partData.sincronizado},
                ultima_sincronizacion = ${partData.ultimaSincronizacion},
                fecha_actualizacion = ${partData.fechaActualizacion}
              WHERE ref_local = ${refLocal}
            `;
            updatedParts++;
          } else {
            await sql`
              INSERT INTO parts (
                ref_local, id_empresa, id_vehiculo, vehicle_marca, vehicle_modelo,
                vehicle_version, vehicle_anyo, combustible, cod_familia, descripcion_familia,
                cod_articulo, descripcion_articulo, ref_principal, precio, peso,
                imagenes, activo, is_pending_relation, sincronizado, ultima_sincronizacion,
                fecha_actualizacion
              ) VALUES (
                ${partData.refLocal}, ${partData.idEmpresa}, ${partData.idVehiculo},
                ${partData.vehicleMarca}, ${partData.vehicleModelo}, ${partData.vehicleVersion},
                ${partData.vehicleAnyo}, ${partData.combustible}, ${partData.codFamilia},
                ${partData.descripcionFamilia}, ${partData.codArticulo}, ${partData.descripcionArticulo},
                ${partData.refPrincipal}, ${partData.precio}, ${partData.peso},
                ${partData.imagenes}, ${partData.activo}, ${partData.isPendingRelation},
                ${partData.sincronizado}, ${partData.ultimaSincronizacion}, ${partData.fechaActualizacion}
              )
            `;
            newParts++;
          }
          
          processed++;
          
          // Update progress every 1000 parts
          if (processed % 1000 === 0) {
            const progressPercent = Math.round((processed / allParts.length) * 100);
            await sql`
              UPDATE import_history 
              SET 
                progress = ${progressPercent},
                processed_items = ${processed},
                new_items = ${newParts},
                updated_items = ${updatedParts},
                processing_item = ${`Procesado ${processed.toLocaleString()}/${allParts.length.toLocaleString()} - ${activeParts.toLocaleString()} activas`}
              WHERE id = ${importId}
            `;
            
            console.log(`Progreso: ${processed.toLocaleString()}/${allParts.length.toLocaleString()} (${activeParts.toLocaleString()} activas)`);
          }
          
        } catch (partError) {
          console.error(`Error procesando pieza:`, partError.message);
        }
      }
      
      // Complete import
      await sql`
        UPDATE import_history 
        SET 
          status = 'completed',
          progress = 100,
          processed_items = ${processed},
          new_items = ${newParts},
          updated_items = ${updatedParts},
          end_time = NOW(),
          processing_item = ${`Completado: ${processed.toLocaleString()} piezas, ${activeParts.toLocaleString()} activas`}
        WHERE id = ${importId}
      `;
      
      console.log('Importación masiva completada:');
      console.log(`- Total procesadas: ${processed.toLocaleString()}`);
      console.log(`- Nuevas: ${newParts.toLocaleString()}`);
      console.log(`- Actualizadas: ${updatedParts.toLocaleString()}`);
      console.log(`- Activas (con precio válido y vehículo): ${activeParts.toLocaleString()}`);
      
      this.totalImported = processed;
      this.activePartsCount = activeParts;
      
    } catch (error) {
      console.error('Error en importación masiva:', error);
      await sql`
        UPDATE import_history 
        SET 
          status = 'failed',
          end_time = NOW(),
          errors = ${JSON.stringify([error.message])}
        WHERE id = ${importId}
      `;
      throw error;
    }
  }

  async execute() {
    console.log('INICIANDO IMPORTACIÓN MASIVA DE 300,000+ PIEZAS');
    console.log('===============================================');
    
    await this.configure();
    await this.importAllPartsWithPagination();
    
    // Final verification
    const stats = await sql`
      SELECT 
        COUNT(*) as total_parts,
        COUNT(CASE WHEN vehicle_marca != '' AND vehicle_marca IS NOT NULL THEN 1 END) as parts_with_vehicles,
        COUNT(CASE WHEN activo = true THEN 1 END) as active_parts,
        COUNT(DISTINCT vehicle_marca) as unique_brands
      FROM parts
    `;
    
    console.log('');
    console.log('IMPORTACIÓN MASIVA COMPLETADA');
    console.log('============================');
    console.log(`Total de piezas: ${stats[0].total_parts.toLocaleString()}`);
    console.log(`Piezas con vehículos: ${stats[0].parts_with_vehicles.toLocaleString()}`);
    console.log(`Piezas activas: ${stats[0].active_parts.toLocaleString()}`);
    console.log(`Marcas únicas: ${stats[0].unique_brands}`);
    
    if (parseInt(stats[0].total_parts) >= 300000) {
      console.log('✅ Objetivo de 300,000+ piezas ALCANZADO');
    } else {
      console.log('⚠️ No se alcanzó el objetivo de 300,000 piezas');
    }
  }
}

// Execute comprehensive import
async function main() {
  const importer = new ComprehensiveImporter();
  await importer.execute();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ComprehensiveImporter };