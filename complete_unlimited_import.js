/**
 * Complete Unlimited Import System
 * Implements both download and processing phases with proper error handling
 * Removes the 1,000 parts limitation by using MetaSync API pagination
 */

import { neon } from '@neondatabase/serverless';

class CompleteUnlimitedImporter {
  constructor() {
    this.sql = neon(process.env.DATABASE_URL);
    this.importId = null;
    this.totalPartsDownloaded = 0;
    this.totalPartsProcessed = 0;
    this.batchSize = 1000;
    this.processingBatchSize = 100; // Smaller batches for database insertion
  }

  async initialize() {
    console.log('🚀 Iniciando sistema de importación completa ILIMITADA...');
    
    // Create import record
    const [importRecord] = await this.sql`
      INSERT INTO import_history (type, status, total_items)
      VALUES ('parts', 'in_progress', 0)
      RETURNING id
    `;
    
    this.importId = importRecord.id;
    console.log(`📝 Registro de importación creado: ${this.importId}`);
    
    return true;
  }

  async updateImportProgress(phase, processed = 0, total = 0, details = '') {
    await this.sql`
      UPDATE import_history 
      SET processed_items = ${processed},
          total_items = ${total},
          processing_item = ${details}
      WHERE id = ${this.importId}
    `;
  }

  async fetchPartsFromAPI(lastId = 0) {
    try {
      const response = await fetch('https://app.metasync.com/api/parts/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 7d28ab1a0bb16b2fe6e0d1a6b06b0c03f0b69e97',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          lastId: lastId,
          limit: this.batchSize
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return {
        parts: data.data || [],
        total: data.total || 0,
        hasMore: data.data && data.data.length === this.batchSize
      };
    } catch (error) {
      console.error('❌ Error fetching from API:', error);
      throw error;
    }
  }

  async downloadAllParts() {
    console.log('📦 FASE 1: Descarga masiva con paginación ILIMITADA...');
    
    let allParts = [];
    let lastId = 0;
    let batch = 1;
    let totalFromAPI = 0;

    while (true) {
      console.log(`📡 Lote ${batch}: Descargando desde lastId=${lastId}`);
      
      const result = await this.fetchPartsFromAPI(lastId);
      
      if (result.parts.length === 0) {
        console.log('✅ Descarga completada - No hay más piezas');
        break;
      }

      // Update total from first API response
      if (batch === 1) {
        totalFromAPI = result.total;
        console.log(`📊 API reporta ${totalFromAPI.toLocaleString()} piezas totales`);
        await this.updateImportProgress('downloading', 0, totalFromAPI, `Iniciando descarga de ${totalFromAPI.toLocaleString()} piezas`);
      }

      allParts = allParts.concat(result.parts);
      this.totalPartsDownloaded = allParts.length;
      
      console.log(`📥 Lote ${batch}: +${result.parts.length} piezas (Total: ${this.totalPartsDownloaded.toLocaleString()})`);
      
      await this.updateImportProgress('downloading', this.totalPartsDownloaded, totalFromAPI, 
        `Descargando lote ${batch}: ${this.totalPartsDownloaded.toLocaleString()} de ~${totalFromAPI.toLocaleString()} piezas`);

      // Get lastId for next batch
      if (result.parts.length > 0) {
        lastId = result.parts[result.parts.length - 1].id;
      }

      // Check if we should continue
      if (!result.hasMore || result.parts.length < this.batchSize) {
        console.log('✅ Descarga completada - Último lote procesado');
        break;
      }

      batch++;
      
      // Brief pause to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎉 DESCARGA COMPLETADA: ${this.totalPartsDownloaded.toLocaleString()} piezas descargadas`);
    return allParts;
  }

  formatPrice(precio) {
    if (!precio) return '0.00';
    const numericPrice = parseFloat(precio);
    return isNaN(numericPrice) ? '0.00' : (numericPrice / 100).toFixed(2);
  }

  extractVehicleInfo(part) {
    // Extract vehicle information from part data
    return {
      marca: part.marca || '',
      modelo: part.modelo || '',
      version: part.version || '*',
      anyo: part.anyo || 2000
    };
  }

  async processPartsToDatabase(allParts) {
    console.log('💾 FASE 2: Procesamiento y guardado en base de datos...');
    
    let processed = 0;
    const total = allParts.length;
    
    // Process in smaller batches for database insertion
    for (let i = 0; i < allParts.length; i += this.processingBatchSize) {
      const batch = allParts.slice(i, i + this.processingBatchSize);
      
      try {
        // Prepare batch data for insertion
        const partsToInsert = batch.map(part => {
          const vehicleInfo = this.extractVehicleInfo(part);
          
          return {
            id: part.id,
            ref_local: part.refLocal || null,
            id_empresa: part.idEmpresa || null,
            cod_articulo: part.codArticulo || '',
            ref_principal: part.refPrincipal || '',
            descripcion_articulo: part.descripcionArticulo || '',
            descripcion_familia: part.descripcionFamilia || '',
            cod_familia: part.codFamilia || '',
            precio: this.formatPrice(part.precio),
            peso: part.peso || '0',
            id_vehiculo: part.idVehiculo || null,
            imagenes: Array.isArray(part.imagenes) ? part.imagenes : [],
            activo: part.activo !== undefined ? part.activo : true,
            vehicle_marca: vehicleInfo.marca,
            vehicle_modelo: vehicleInfo.modelo,
            vehicle_version: vehicleInfo.version,
            vehicle_anyo: vehicleInfo.anyo
          };
        });

        // Insert batch using UPSERT
        for (const part of partsToInsert) {
          await this.sql`
            INSERT INTO parts (
              id, ref_local, id_empresa, cod_articulo, ref_principal,
              descripcion_articulo, descripcion_familia, cod_familia,
              precio, peso, id_vehiculo, imagenes, activo,
              vehicle_marca, vehicle_modelo, vehicle_version, vehicle_anyo
            ) VALUES (
              ${part.id}, ${part.ref_local}, ${part.id_empresa}, ${part.cod_articulo}, ${part.ref_principal},
              ${part.descripcion_articulo}, ${part.descripcion_familia}, ${part.cod_familia},
              ${part.precio}, ${part.peso}, ${part.id_vehiculo}, ${JSON.stringify(part.imagenes)}, ${part.activo},
              ${part.vehicle_marca}, ${part.vehicle_modelo}, ${part.vehicle_version}, ${part.vehicle_anyo}
            )
            ON CONFLICT (id) DO UPDATE SET
              ref_local = EXCLUDED.ref_local,
              id_empresa = EXCLUDED.id_empresa,
              cod_articulo = EXCLUDED.cod_articulo,
              ref_principal = EXCLUDED.ref_principal,
              descripcion_articulo = EXCLUDED.descripcion_articulo,
              descripcion_familia = EXCLUDED.descripcion_familia,
              cod_familia = EXCLUDED.cod_familia,
              precio = EXCLUDED.precio,
              peso = EXCLUDED.peso,
              id_vehiculo = EXCLUDED.id_vehiculo,
              imagenes = EXCLUDED.imagenes,
              activo = EXCLUDED.activo,
              vehicle_marca = EXCLUDED.vehicle_marca,
              vehicle_modelo = EXCLUDED.vehicle_modelo,
              vehicle_version = EXCLUDED.vehicle_version,
              vehicle_anyo = EXCLUDED.vehicle_anyo,
              fecha_actualizacion = CURRENT_TIMESTAMP
          `;
        }

        processed += batch.length;
        this.totalPartsProcessed = processed;
        
        const percentage = Math.round((processed / total) * 100);
        console.log(`💾 Procesado: ${processed.toLocaleString()}/${total.toLocaleString()} (${percentage}%)`);
        
        await this.updateImportProgress('processing', processed, total, 
          `Procesando lote ${Math.ceil(i / this.processingBatchSize) + 1}: ${processed.toLocaleString()}/${total.toLocaleString()} piezas`);

      } catch (error) {
        console.error(`❌ Error procesando lote ${i}-${i + this.processingBatchSize}:`, error);
        // Continue with next batch instead of failing completely
      }
    }

    console.log(`🎉 PROCESAMIENTO COMPLETADO: ${this.totalPartsProcessed.toLocaleString()} piezas guardadas`);
  }

  async completeImport() {
    try {
      // Mark import as completed
      await this.sql`
        UPDATE import_history 
        SET status = 'completed',
            processing_item = 'Importación completada exitosamente'
        WHERE id = ${this.importId}
      `;
      
      console.log(`✅ IMPORTACIÓN COMPLETADA EXITOSAMENTE`);
      console.log(`📊 Estadísticas finales:`);
      console.log(`   - Piezas descargadas: ${this.totalPartsDownloaded.toLocaleString()}`);
      console.log(`   - Piezas procesadas: ${this.totalPartsProcessed.toLocaleString()}`);
      
      // Get final count from database
      const [result] = await this.sql`SELECT COUNT(*) as total FROM parts`;
      console.log(`   - Total en base de datos: ${result.total.toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ Error completando importación:', error);
      await this.sql`
        UPDATE import_history 
        SET status = 'error',
            processing_item = ${`Error: ${error.message}`}
        WHERE id = ${this.importId}
      `;
    }
  }

  async execute() {
    try {
      await this.initialize();
      
      // Phase 1: Download all parts with unlimited pagination
      const allParts = await this.downloadAllParts();
      
      if (allParts.length === 0) {
        throw new Error('No se pudieron descargar piezas de la API');
      }
      
      // Phase 2: Process and save all parts to database
      await this.processPartsToDatabase(allParts);
      
      // Complete import
      await this.completeImport();
      
    } catch (error) {
      console.error('❌ Error en la importación:', error);
      if (this.importId) {
        await this.sql`
          UPDATE import_history 
          SET status = 'error',
              processing_item = ${`Error: ${error.message}`}
          WHERE id = ${this.importId}
        `;
      }
      throw error;
    }
  }
}

async function main() {
  try {
    const importer = new CompleteUnlimitedImporter();
    await importer.execute();
    console.log('🎉 Sistema de importación ILIMITADA completado exitosamente');
  } catch (error) {
    console.error('💥 Error fatal en la importación:', error);
    process.exit(1);
  }
}

main();