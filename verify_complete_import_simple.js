#!/usr/bin/env node

/**
 * Script simple de verificación del sistema de importación completa
 */

const { Pool } = require('pg');

// Configurar conexión directa a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function verifyCompleteImportSystem() {
  console.log('🔍 VERIFICACIÓN DEL SISTEMA DE IMPORTACIÓN COMPLETA');
  console.log('='.repeat(60));

  try {
    // 1. Verificar importaciones completas recientes (última hora)
    console.log('\n1️⃣ VERIFICANDO IMPORTACIONES COMPLETAS RECIENTES...');
    
    const recentImportsQuery = `
      SELECT id, type, status, progress, total_items, processed_items, 
             new_items, updated_items, start_time, processing_item,
             EXTRACT(EPOCH FROM (NOW() - start_time)) as seconds_running
      FROM import_history 
      WHERE start_time >= NOW() - INTERVAL '1 hour'
      ORDER BY start_time DESC
      LIMIT 10;
    `;
    
    const recentImports = await pool.query(recentImportsQuery);
    
    if (recentImports.rows.length === 0) {
      console.log('❌ No hay importaciones en la última hora');
      return false;
    }

    console.log(`✅ Encontradas ${recentImports.rows.length} importaciones recientes:`);
    
    for (const imp of recentImports.rows) {
      const runtime = Math.round(imp.seconds_running);
      console.log(`   ${imp.type.toUpperCase()} ID ${imp.id}: ${imp.status} (${imp.progress}%) - ${runtime}s ejecutándose`);
      if (imp.new_items > 0 || imp.updated_items > 0) {
        console.log(`     → ${imp.new_items} nuevos, ${imp.updated_items} actualizados`);
      }
    }

    // 2. Verificar contadores actuales
    console.log('\n2️⃣ VERIFICANDO CONTADORES ACTUALES...');
    
    const countersQuery = `
      SELECT 
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM vehicles WHERE activo = true) as active_vehicles,
        (SELECT COUNT(*) FROM parts) as total_parts,
        (SELECT COUNT(*) FROM parts WHERE activo = true) as active_parts,
        (SELECT COUNT(*) FROM parts WHERE id_vehiculo < 0) as processed_parts,
        (SELECT COUNT(*) FROM parts WHERE id_vehiculo < 0 AND vehicle_marca IS NOT NULL AND vehicle_marca != 'NO IDENTIFICADO') as processed_parts_with_data;
    `;
    
    const counters = await pool.query(countersQuery);
    const data = counters.rows[0];
    
    console.log(`📊 Vehículos: ${data.total_vehicles} total (${data.active_vehicles} activos)`);
    console.log(`📊 Piezas: ${data.total_parts} total (${data.active_parts} activas)`);
    console.log(`📊 Piezas procesadas: ${data.processed_parts}`);
    
    const dataPercentage = data.processed_parts > 0 ? 
      ((data.processed_parts_with_data / data.processed_parts) * 100).toFixed(2) : 0;
    console.log(`📈 Piezas procesadas con datos: ${data.processed_parts_with_data}/${data.processed_parts} (${dataPercentage}%)`);

    // 3. Verificar importaciones completas específicamente
    console.log('\n3️⃣ VERIFICANDO IMPORTACIONES COMPLETAS...');
    
    const completeImportsQuery = `
      SELECT id, status, progress, new_items, updated_items, start_time,
             EXTRACT(EPOCH FROM (NOW() - start_time)) as seconds_running
      FROM import_history 
      WHERE type = 'all' AND start_time >= NOW() - INTERVAL '1 hour'
      ORDER BY start_time DESC
      LIMIT 3;
    `;
    
    const completeImports = await pool.query(completeImportsQuery);
    
    if (completeImports.rows.length > 0) {
      console.log(`✅ Importaciones completas encontradas: ${completeImports.rows.length}`);
      
      for (const imp of completeImports.rows) {
        const runtime = Math.round(imp.seconds_running);
        console.log(`   ID ${imp.id}: ${imp.status} (${imp.progress}%) - ${runtime}s`);
      }
    } else {
      console.log('⚠️ No hay importaciones completas recientes');
    }

    // 4. Verificar estado de sync_control
    console.log('\n4️⃣ VERIFICANDO CONTROL DE SINCRONIZACIÓN...');
    
    const syncQuery = `
      SELECT type, last_sync_date, last_id, records_processed, active, updated_at
      FROM sync_control 
      ORDER BY type;
    `;
    
    const syncData = await pool.query(syncQuery);
    
    for (const sync of syncData.rows) {
      console.log(`📅 Sync ${sync.type}: ${sync.last_sync_date} (ID: ${sync.last_id}, procesados: ${sync.records_processed})`);
    }

    // 5. Resumen final
    console.log('\n5️⃣ RESUMEN DE VERIFICACIÓN');
    console.log('='.repeat(40));
    
    const hasRecentImports = recentImports.rows.length > 0;
    const hasCompleteImports = completeImports.rows.length > 0;
    const goodDataPercentage = parseFloat(dataPercentage) > 50;
    const hasActiveData = data.active_parts > 100000; // Esperamos >100k piezas activas
    
    const systemHealthy = hasRecentImports && (hasCompleteImports || hasActiveData) && goodDataPercentage;

    if (systemHealthy) {
      console.log('✅ SISTEMA DE IMPORTACIÓN COMPLETA: OPERACIONAL');
      console.log('   - Importaciones funcionando correctamente');
      console.log('   - Datos de vehículos en buen estado');
      console.log('   - Inventario actualizado');
    } else {
      console.log('❌ SISTEMA DE IMPORTACIÓN COMPLETA: REQUIERE ATENCIÓN');
      if (!hasRecentImports) console.log('   - Sin importaciones recientes');
      if (!goodDataPercentage) console.log('   - Baja calidad de datos de vehículos');
      if (!hasActiveData) console.log('   - Inventario incompleto');
    }

    return systemHealthy;

  } catch (error) {
    console.error('❌ Error durante verificación:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
verifyCompleteImportSystem()
  .then(success => {
    console.log(`\n🏁 Verificación ${success ? 'EXITOSA' : 'FALLÓ'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  });