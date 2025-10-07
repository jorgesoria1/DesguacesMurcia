#!/usr/bin/env node

/**
 * Monitor del Sistema de Importaciones
 * Verifica el estado de las importaciones programadas, detecta problemas y proporciona información de estado
 */

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function checkImportStatus() {
  console.log('🔍 MONITOR DEL SISTEMA DE IMPORTACIONES');
  console.log('======================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // 1. Verificar importaciones en progreso
    console.log('📊 ESTADO ACTUAL:');
    const activeImports = await db.execute(sql`
      SELECT id, type, status, progress, start_time, 
             EXTRACT(EPOCH FROM (NOW() - start_time))/60 as minutes_running
      FROM import_history 
      WHERE status = 'in_progress'
    `);

    if (activeImports.length > 0) {
      console.log('⚠️  IMPORTACIONES EN PROGRESO:');
      activeImports.forEach(imp => {
        const minutesRunning = Math.floor(imp.minutes_running);
        console.log(`   - ID ${imp.id} (${imp.type}): ${imp.progress}% - ${minutesRunning} minutos ejecutándose`);
        
        // Detectar importaciones atascadas (más de 60 minutos)
        if (minutesRunning > 60) {
          console.log(`   ⚠️  POSIBLE IMPORTACIÓN ATASCADA - Ejecutándose ${minutesRunning} minutos`);
        }
      });
    } else {
      console.log('✅ No hay importaciones en progreso');
    }

    // 2. Verificar programaciones activas
    console.log('\n📅 PROGRAMACIONES ACTIVAS:');
    const schedulesResult = await db.execute(sql`
      SELECT id, type, frequency, next_run, active, start_time, is_full_import
      FROM import_schedule 
      WHERE active = true
      ORDER BY next_run
    `);

    const schedules = schedulesResult || [];
    schedules.forEach(schedule => {
      const nextRun = new Date(schedule.next_run);
      const timeUntilNext = Math.floor((nextRun - new Date()) / (1000 * 60));
      const scheduleType = schedule.is_full_import ? 'COMPLETA' : 'INCREMENTAL';
      
      console.log(`   - ID ${schedule.id} (${schedule.type.toUpperCase()} ${scheduleType}): ${schedule.start_time}`);
      console.log(`     Próxima ejecución: ${nextRun.toLocaleString()} (en ${timeUntilNext} minutos)`);
    });

    // 3. Historial reciente (últimas 24 horas)
    console.log('\n📋 HISTORIAL RECIENTE (24h):');
    const recentImportsResult = await db.execute(sql`
      SELECT id, type, status, progress, start_time, end_time,
             EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))/60 as duration_minutes,
             new_items, updated_items, error_count
      FROM import_history 
      WHERE start_time >= NOW() - INTERVAL '24 hours'
      ORDER BY start_time DESC
      LIMIT 10
    `);

    const recentImports = recentImportsResult || [];
    if (recentImports.length > 0) {
      recentImports.forEach(imp => {
        const duration = Math.floor(imp.duration_minutes);
        const statusIcon = imp.status === 'completed' ? '✅' : 
                          imp.status === 'failed' ? '❌' : 
                          imp.status === 'in_progress' ? '🔄' : '⚪';
        
        console.log(`   ${statusIcon} ID ${imp.id} (${imp.type}): ${imp.status} - ${duration}min`);
        if (imp.status === 'completed') {
          console.log(`     Nuevos: ${imp.new_items || 0}, Actualizados: ${imp.updated_items || 0}, Errores: ${imp.error_count || 0}`);
        }
        if (imp.error_count > 0) {
          console.log(`     ⚠️  ${imp.error_count} errores detectados`);
        }
      });
    } else {
      console.log('   No hay importaciones en las últimas 24 horas');
    }

    // 4. Estadísticas del sistema
    console.log('\n📈 ESTADÍSTICAS DEL SISTEMA:');
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles WHERE activo = true) as vehicles_count,
        (SELECT COUNT(*) FROM parts WHERE activo = true) as active_parts_count,
        (SELECT COUNT(*) FROM parts) as total_parts_count,
        (SELECT COUNT(*) FROM import_history WHERE status = 'completed' AND start_time >= NOW() - INTERVAL '7 days') as successful_imports_week,
        (SELECT COUNT(*) FROM import_history WHERE status = 'failed' AND start_time >= NOW() - INTERVAL '7 days') as failed_imports_week
    `);

    const systemStats = stats[0];
    console.log(`   Vehículos activos: ${systemStats.vehicles_count}`);
    console.log(`   Piezas activas: ${systemStats.active_parts_count} / ${systemStats.total_parts_count}`);
    console.log(`   Importaciones exitosas (7 días): ${systemStats.successful_imports_week}`);
    console.log(`   Importaciones fallidas (7 días): ${systemStats.failed_imports_week}`);

    // 5. Verificaciones de salud
    console.log('\n🏥 VERIFICACIONES DE SALUD:');
    
    // Verificar importaciones atascadas
    const stuckImports = await db.execute(sql`
      SELECT COUNT(*) as count FROM import_history 
      WHERE status = 'in_progress' 
      AND start_time < NOW() - INTERVAL '2 hours'
    `);
    
    if (stuckImports[0].count > 0) {
      console.log(`   ❌ ${stuckImports[0].count} importación(es) atascada(s) detectada(s)`);
    } else {
      console.log('   ✅ No hay importaciones atascadas');
    }

    // Verificar si las programaciones están funcionando
    const lastScheduledRun = await db.execute(sql`
      SELECT MAX(start_time) as last_run FROM import_history 
      WHERE start_time >= NOW() - INTERVAL '25 hours'
    `);
    
    if (lastScheduledRun[0].last_run) {
      const hoursAgo = Math.floor((new Date() - new Date(lastScheduledRun[0].last_run)) / (1000 * 60 * 60));
      console.log(`   ✅ Última importación programada: hace ${hoursAgo} horas`);
    } else {
      console.log('   ⚠️  No se han ejecutado importaciones programadas en las últimas 25 horas');
    }

    console.log('\n======================================');
    console.log('✅ Monitor completado exitosamente');

  } catch (error) {
    console.error('❌ Error ejecutando monitor:', error);
    process.exit(1);
  }
}

// Ejecutar monitoreo
checkImportStatus().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

export { checkImportStatus };