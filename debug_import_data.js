// Script para depurar qué datos están llegando en las importaciones reales
import { db } from './server/db.js';
import { importHistory } from './shared/schema.js';
import { desc, eq } from 'drizzle-orm';

async function debugImportData() {
  console.log('🔍 Analizando datos de importaciones recientes...\n');

  try {
    // Obtener la importación más reciente
    const [latestImport] = await db.select()
      .from(importHistory)
      .orderBy(desc(importHistory.startTime))
      .limit(1);

    if (!latestImport) {
      console.log('❌ No se encontraron importaciones recientes');
      return;
    }

    console.log(`📊 Última importación: ${latestImport.type} (ID: ${latestImport.id})`);
    console.log(`Status: ${latestImport.status}`);
    console.log(`Progreso: ${latestImport.progress}%`);
    console.log(`Procesados: ${latestImport.processedItems}`);
    console.log(`Nuevos: ${latestImport.newItems}`);
    console.log(`Actualizados: ${latestImport.updatedItems}`);
    
    if (latestImport.errors && latestImport.errors.length > 0) {
      console.log(`\n⚠️ Errores encontrados (${latestImport.errors.length}):`);
      latestImport.errors.slice(0, 10).forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    // Buscar piezas procesadas recientes para analizar estructura
    const recentProcessedParts = await db.execute(`
      SELECT 
        ref_local, id_vehiculo, vehicle_marca, vehicle_modelo,
        descripcion_articulo, cod_familia, descripcion_familia,
        fecha_actualizacion
      FROM parts 
      WHERE id_vehiculo < 0 
      AND activo = true
      AND fecha_actualizacion >= NOW() - INTERVAL '2 hours'
      ORDER BY fecha_actualizacion DESC
      LIMIT 10
    `);

    console.log(`\n📋 Piezas procesadas recientes (últimas 2 horas): ${recentProcessedParts.length}`);
    
    recentProcessedParts.forEach((part, i) => {
      console.log(`\n--- PIEZA ${i + 1} ---`);
      console.log(`refLocal: ${part.ref_local}`);
      console.log(`idVehiculo: ${part.id_vehiculo}`);
      console.log(`vehicleMarca: '${part.vehicle_marca || 'VACÍO'}'`);
      console.log(`vehicleModelo: '${part.vehicle_modelo || 'VACÍO'}'`);
      console.log(`descripcionArticulo: '${part.descripcion_articulo}'`);
      console.log(`descripcionFamilia: '${part.descripcion_familia}'`);
      console.log(`fechaActualizacion: ${part.fecha_actualizacion}`);
    });

    // Estadísticas generales de extracción
    const statsResult = await db.execute(`
      SELECT 
        COUNT(*) as total_procesadas,
        COUNT(CASE WHEN vehicle_marca IS NOT NULL AND vehicle_marca != '' AND vehicle_marca != 'CAMBIO' THEN 1 END) as con_marca,
        COUNT(CASE WHEN vehicle_modelo IS NOT NULL AND vehicle_modelo != '' THEN 1 END) as con_modelo
      FROM parts 
      WHERE id_vehiculo < 0 AND activo = true
    `);

    const stats = statsResult[0];
    const successRate = ((stats.con_marca / stats.total_procesadas) * 100).toFixed(2);
    
    console.log(`\n📊 ESTADÍSTICAS DE EXTRACCIÓN DE DATOS DE VEHÍCULOS:`);
    console.log(`  Total piezas procesadas: ${stats.total_procesadas}`);
    console.log(`  Con marca extraída: ${stats.con_marca}`);
    console.log(`  Con modelo extraído: ${stats.con_modelo}`);
    console.log(`  Tasa de éxito: ${successRate}%`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

debugImportData();