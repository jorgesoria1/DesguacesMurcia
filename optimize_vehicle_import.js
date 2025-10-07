/**
 * Optimized Vehicle Import - Matches Parts Import Speed
 * Uses identical batch processing and database operations as the successful parts import
 */

import { db } from './server/db/index.js';
import { vehicles, importHistory } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import axios from 'axios';

class OptimizedVehicleImporter {
  constructor() {
    this.apiUrl = 'https://api.metasync.com';
    this.companyId = 1236;
    this.apiKey = process.env.METASYNC_API_KEY || 'TU_API_KEY_AQUI';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async createImportRecord() {
    const [record] = await db.insert(importHistory).values({
      type: 'vehicles',
      status: 'in_progress',
      totalItems: 0,
      processedItems: 0,
      newItems: 0,
      updatedItems: 0,
      progress: 0,
      processingItem: 'Iniciando importación optimizada de vehículos...'
    }).returning();
    
    return record;
  }

  async updateProgress(importRecord, phase, processed = 0, total = 0, details = '') {
    const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
    
    await db.update(importHistory)
      .set({
        progress,
        processedItems: processed,
        totalItems: total,
        processingItem: details || `${phase}: ${processed}/${total}`
      })
      .where(eq(importHistory.id, importRecord.id));
  }

  async fetchAllVehicles(importRecord) {
    console.log('🚗 Iniciando descarga de vehículos con paginación...');
    
    let allVehicles = [];
    let lastId = 0;
    let hasMoreData = true;
    let batchCount = 0;

    while (hasMoreData && batchCount < 20) {
      batchCount++;
      console.log(`📦 Obteniendo lote ${batchCount} desde lastId=${lastId}`);

      try {
        const response = await axios.get(`${this.apiUrl}/vehiculos`, {
          headers: this.headers,
          params: {
            fecha: '2020-01-01',
            lastId,
            empresa: this.companyId,
            offset: 0,
            useParamsInUrl: 1
          }
        });

        const { data } = response.data;
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log('🏁 No hay más vehículos disponibles');
          hasMoreData = false;
          break;
        }

        console.log(`📥 Lote ${batchCount}: Recibidos ${data.length} vehículos`);
        allVehicles = allVehicles.concat(data);

        // Actualizar lastId para siguiente lote
        if (data.length > 0) {
          const lastVehicle = data[data.length - 1];
          lastId = lastVehicle.idLocal || lastVehicle.id || (lastId + 1000);
          console.log(`➡️ Siguiente lastId: ${lastId}`);
        } else {
          hasMoreData = false;
        }

        // Actualizar progreso de descarga
        await this.updateProgress(
          importRecord, 
          'Descargando', 
          allVehicles.length, 
          allVehicles.length, 
          `Descargando lote ${batchCount}: ${allVehicles.length} vehículos obtenidos`
        );

      } catch (error) {
        console.error(`Error obteniendo lote ${batchCount}:`, error.message);
        hasMoreData = false;
      }
    }

    console.log(`📊 Total de vehículos descargados: ${allVehicles.length}`);
    return allVehicles;
  }

  async processVehiclesBulk(allVehicles, importRecord) {
    console.log('🚀 Iniciando procesamiento bulk optimizado de vehículos...');
    
    const BATCH_SIZE = 1000; // Mismo tamaño que piezas
    let processed = 0;
    let newCount = 0;

    // Actualizar total items
    await this.updateProgress(importRecord, 'Procesando', 0, allVehicles.length, 'Preparando procesamiento bulk...');

    for (let i = 0; i < allVehicles.length; i += BATCH_SIZE) {
      const batch = allVehicles.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.ceil((i + BATCH_SIZE) / BATCH_SIZE);
      
      try {
        // Preparar datos del lote
        const vehiclesData = batch.map(vehicle => ({
          idLocal: vehicle.idLocal,
          idEmpresa: this.companyId,
          descripcion: vehicle.codigo || '',
          marca: vehicle.nombreMarca || '',
          modelo: vehicle.nombreModelo || '',
          version: vehicle.nombreVersion || '',
          anyo: vehicle.anyoVehiculo || 2000,
          combustible: vehicle.combustible || '',
          bastidor: vehicle.bastidor || '',
          matricula: vehicle.matricula || '',
          color: vehicle.color || '',
          kilometraje: vehicle.kilometraje || 0,
          potencia: vehicle.potenciaKw || 0,
          imagenes: vehicle.urlsImgs || [],
          activo: true,
          sincronizado: true,
          ultimaSincronizacion: new Date(),
          fechaActualizacion: new Date()
        }));

        // Inserción bulk con upsert
        for (const vehicleData of vehiclesData) {
          await db.insert(vehicles).values(vehicleData)
            .onConflictDoUpdate({
              target: vehicles.idLocal,
              set: {
                descripcion: vehicleData.descripcion,
                marca: vehicleData.marca,
                modelo: vehicleData.modelo,
                version: vehicleData.version,
                anyo: vehicleData.anyo,
                combustible: vehicleData.combustible,
                fechaActualizacion: vehicleData.fechaActualizacion
              }
            });
        }

        processed += batch.length;
        newCount += batch.length;
        
        const progressPercent = Math.round((processed / allVehicles.length) * 100);
        console.log(`🚗 Lote ${batchNumber}: ${batch.length} vehículos procesados (${processed}/${allVehicles.length}) - ${progressPercent}%`);
        
        // Actualizar progreso
        await this.updateProgress(
          importRecord, 
          'Procesando', 
          processed, 
          allVehicles.length, 
          `Lote ${batchNumber}: ${processed}/${allVehicles.length} vehículos`
        );
        
      } catch (error) {
        console.error(`Error procesando lote ${batchNumber}:`, error);
        processed += batch.length;
      }
    }

    return { processed, newCount };
  }

  async execute() {
    try {
      console.log('🚀 Iniciando importación optimizada de vehículos...');
      
      const importRecord = await this.createImportRecord();
      console.log(`📝 Registro de importación creado: ID ${importRecord.id}`);

      // Fase 1: Descargar todos los vehículos
      const allVehicles = await this.fetchAllVehicles(importRecord);
      
      if (allVehicles.length === 0) {
        await db.update(importHistory)
          .set({
            status: 'completed',
            processingItem: 'No se encontraron vehículos para importar'
          })
          .where(eq(importHistory.id, importRecord.id));
        return;
      }

      // Fase 2: Procesamiento bulk optimizado
      const { processed, newCount } = await this.processVehiclesBulk(allVehicles, importRecord);

      // Finalizar importación
      await db.update(importHistory)
        .set({
          status: 'completed',
          progress: 100,
          processedItems: processed,
          newItems: newCount,
          processingItem: `Completado: ${processed} vehículos procesados`
        })
        .where(eq(importHistory.id, importRecord.id));

      console.log(`✅ Importación completada: ${processed} vehículos procesados`);
      
    } catch (error) {
      console.error('❌ Error en importación de vehículos:', error);
      throw error;
    }
  }
}

async function main() {
  const importer = new OptimizedVehicleImporter();
  await importer.execute();
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default OptimizedVehicleImporter;