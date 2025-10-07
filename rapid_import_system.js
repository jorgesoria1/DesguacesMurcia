/**
 * Rapid Import System for 300,000+ Parts
 * Optimized for maximum performance and reliability
 */

import { neon } from '@neondatabase/serverless';

class RapidImportSystem {
  constructor() {
    this.sql = neon(process.env.DATABASE_URL);
    this.empresaId = 1236;
    this.batchSize = 2000; // Increased batch size
    this.maxConcurrentRequests = 5;
    this.totalImported = 0;
    this.activePartsCount = 0;
  }

  async initialize() {
    console.log('🚀 INICIANDO SISTEMA DE IMPORTACIÓN RÁPIDA');
    console.log('==========================================');
    console.log(`📦 Objetivo: 300,000+ piezas activas`);
    console.log(`⚡ Tamaño de lote: ${this.batchSize}`);
    console.log(`🔄 Requests concurrentes: ${this.maxConcurrentRequests}`);
    
    // Get current status
    const currentStatus = await this.sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activo = true THEN 1 END) as active
      FROM parts
    `;
    
    console.log(`📊 Estado actual: ${currentStatus[0].total} total, ${currentStatus[0].active} activas`);
    return true;
  }

  async fetchPartsFromAPI(lastId = 0) {
    const url = `https://api.metasync.com/api/recambios/search?id_empresa=${this.empresaId}&lastId=${lastId}&limit=${this.batchSize}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`❌ Error fetching from API: ${error.message}`);
      return [];
    }
  }

  formatPrice(precio) {
    if (!precio) return 0;
    const priceStr = precio.toString().replace(',', '.');
    const numericPrice = parseFloat(priceStr);
    return isNaN(numericPrice) ? 0 : numericPrice;
  }

  async processPartsBatch(partsData) {
    if (!partsData || partsData.length === 0) return 0;

    const validParts = [];
    const vehicleUpdates = new Map();

    for (const part of partsData) {
      const precio = this.formatPrice(part.precio);
      
      // Business rule: only import parts with price > 0
      if (precio <= 0) continue;

      // Extract vehicle information
      const vehicleInfo = this.extractVehicleInfo(part);
      if (!vehicleInfo) continue; // Skip parts without vehicle info

      // Prepare part data
      const partData = {
        ref_local: parseInt(part.id) || 0,
        id_empresa: this.empresaId,
        cod_articulo: part.codigo || '',
        ref_principal: part.referencia || '',
        descripcion_articulo: part.descripcion || '',
        descripcion_familia: part.categoria || '',
        cod_familia: part.categoria || '',
        precio: precio.toString(),
        peso: parseInt(part.peso) || 0,
        id_vehiculo: vehicleInfo.vehicleId,
        imagenes: Array.isArray(part.imagenes) ? part.imagenes : [],
        activo: true, // Activate parts with price > 0 and vehicle info
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date(),
        vehicle_marca: vehicleInfo.marca,
        vehicle_modelo: vehicleInfo.modelo,
        vehicle_version: vehicleInfo.version,
        vehicle_anyo: vehicleInfo.anyo
      };

      validParts.push(partData);

      // Collect vehicle data for batch update
      if (vehicleInfo.vehicleId && vehicleInfo.marca && vehicleInfo.modelo) {
        vehicleUpdates.set(vehicleInfo.vehicleId, vehicleInfo);
      }
    }

    if (validParts.length === 0) return 0;

    try {
      // Insert/update vehicles first
      await this.updateVehiclesBatch(vehicleUpdates);

      // Insert parts in batches
      const insertPromises = [];
      const chunkSize = 500;
      
      for (let i = 0; i < validParts.length; i += chunkSize) {
        const chunk = validParts.slice(i, i + chunkSize);
        insertPromises.push(this.insertPartsChunk(chunk));
      }

      await Promise.all(insertPromises);
      
      this.activePartsCount += validParts.length;
      return validParts.length;
    } catch (error) {
      console.error(`❌ Error processing batch: ${error.message}`);
      return 0;
    }
  }

  extractVehicleInfo(part) {
    // Extract vehicle information from part data
    const marca = part.marca || part.vehicle_marca || '';
    const modelo = part.modelo || part.vehicle_modelo || '';
    
    if (!marca || !modelo) return null;

    return {
      vehicleId: Math.abs(parseInt(part.id) || 0), // Convert to positive ID
      marca: marca.toUpperCase(),
      modelo: modelo.toUpperCase(),
      version: part.version || part.vehicle_version || '',
      anyo: parseInt(part.anyo) || parseInt(part.vehicle_anyo) || null,
      combustible: part.combustible || part.vehicle_combustible || ''
    };
  }

  async updateVehiclesBatch(vehicleUpdates) {
    if (vehicleUpdates.size === 0) return;

    const vehicles = Array.from(vehicleUpdates.values());
    
    for (const vehicle of vehicles) {
      try {
        await this.sql`
          INSERT INTO vehicles (
            id, marca, modelo, version, anyo, combustible, 
            descripcion, activo, fecha_creacion, fecha_actualizacion
          ) VALUES (
            ${vehicle.vehicleId}, ${vehicle.marca}, ${vehicle.modelo}, 
            ${vehicle.version}, ${vehicle.anyo}, ${vehicle.combustible},
            ${vehicle.marca + ' ' + vehicle.modelo + ' ' + (vehicle.version || '')},
            true, NOW(), NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            marca = EXCLUDED.marca,
            modelo = EXCLUDED.modelo,
            version = EXCLUDED.version,
            anyo = EXCLUDED.anyo,
            combustible = EXCLUDED.combustible,
            fecha_actualizacion = NOW()
        `;
      } catch (error) {
        // Continue on conflict errors
        continue;
      }
    }
  }

  async insertPartsChunk(partsChunk) {
    if (partsChunk.length === 0) return;

    const values = partsChunk.map(part => 
      `(${part.ref_local}, ${this.empresaId}, '${part.cod_articulo.replace(/'/g, "''")}', '${part.ref_principal.replace(/'/g, "''")}', '${part.descripcion_articulo.replace(/'/g, "''")}', '${part.descripcion_familia.replace(/'/g, "''")}', '${part.cod_familia.replace(/'/g, "''")}', '${part.precio}', ${part.peso}, ${part.id_vehiculo}, '${JSON.stringify(part.imagenes).replace(/'/g, "''")}', ${part.activo}, '${part.fecha_creacion.toISOString()}', '${part.fecha_actualizacion.toISOString()}', '${part.vehicle_marca.replace(/'/g, "''")}', '${part.vehicle_modelo.replace(/'/g, "''")}', '${part.vehicle_version.replace(/'/g, "''")}', ${part.vehicle_anyo})`
    ).join(',');

    const query = `
      INSERT INTO parts (
        ref_local, id_empresa, cod_articulo, ref_principal, 
        descripcion_articulo, descripcion_familia, cod_familia, 
        precio, peso, id_vehiculo, imagenes, activo, 
        fecha_creacion, fecha_actualizacion, vehicle_marca, 
        vehicle_modelo, vehicle_version, vehicle_anyo
      ) VALUES ${values}
      ON CONFLICT (ref_local) DO UPDATE SET
        precio = EXCLUDED.precio,
        activo = EXCLUDED.activo,
        fecha_actualizacion = NOW(),
        vehicle_marca = EXCLUDED.vehicle_marca,
        vehicle_modelo = EXCLUDED.vehicle_modelo,
        vehicle_version = EXCLUDED.vehicle_version,
        vehicle_anyo = EXCLUDED.vehicle_anyo
    `;

    await this.sql.unsafe(query);
  }

  async executeRapidImport() {
    let lastId = 0;
    let consecutiveEmptyBatches = 0;
    let batchCount = 0;

    while (consecutiveEmptyBatches < 3 && this.activePartsCount < 300000) {
      batchCount++;
      
      console.log(`\n📦 Lote ${batchCount}: Descargando desde lastId ${lastId}...`);
      
      const partsData = await this.fetchPartsFromAPI(lastId);
      
      if (!partsData || partsData.length === 0) {
        consecutiveEmptyBatches++;
        console.log(`⚠️  Lote vacío (${consecutiveEmptyBatches}/3)`);
        continue;
      }

      consecutiveEmptyBatches = 0;
      const processedCount = await this.processPartsBatch(partsData);
      this.totalImported += partsData.length;
      
      // Update lastId for next batch
      if (partsData.length > 0) {
        lastId = Math.max(...partsData.map(p => parseInt(p.id) || 0));
      }

      console.log(`✅ Lote ${batchCount}: +${processedCount} piezas activas (Total activas: ${this.activePartsCount}, Total procesadas: ${this.totalImported})`);

      // Performance monitoring
      if (batchCount % 10 === 0) {
        const currentStatus = await this.sql`
          SELECT COUNT(*) as active FROM parts WHERE activo = true
        `;
        console.log(`📊 Estado DB: ${currentStatus[0].active} piezas activas confirmadas`);
      }

      // Brief pause to prevent API overload
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.activePartsCount;
  }

  async execute() {
    try {
      await this.initialize();
      
      const finalCount = await this.executeRapidImport();
      
      console.log('\n🎉 IMPORTACIÓN COMPLETADA');
      console.log('========================');
      console.log(`✅ Piezas activas importadas: ${finalCount}`);
      console.log(`📊 Total piezas procesadas: ${this.totalImported}`);
      
      // Final status check
      const finalStatus = await this.sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN activo = true THEN 1 END) as active,
          COUNT(DISTINCT "vehicleMarca") as brands,
          COUNT(DISTINCT "vehicleModelo") as models
        FROM parts
      `;

      console.log(`🏆 Estado final: ${finalStatus[0].total} total, ${finalStatus[0].active} activas`);
      console.log(`🚗 Vehículos: ${finalStatus[0].brands} marcas, ${finalStatus[0].models} modelos`);
      
      return true;
    } catch (error) {
      console.error('❌ Error en importación:', error);
      return false;
    }
  }
}

async function main() {
  const importer = new RapidImportSystem();
  await importer.execute();
  process.exit(0);
}

main();