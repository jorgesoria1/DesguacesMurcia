#!/usr/bin/env node

/**
 * Monitor de importaciones en tiempo real
 * Monitoriza las importaciones activas y muestra su progreso
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function monitorImports() {
  try {
    console.log('🔍 Monitorizando importaciones en progreso...\n');

    // Obtener importaciones activas
    const activeImports = await sql`
      SELECT 
        id,
        type,
        status,
        progress,
        total_items,
        processed_items,
        new_items,
        processing_item,
        error_count,
        start_time,
        last_updated,
        options
      FROM import_history
      WHERE status IN ('in_progress', 'processing', 'pending')
      ORDER BY start_time DESC
    `;

    if (activeImports.length === 0) {
      console.log('✅ No hay importaciones activas en este momento');
      
      // Mostrar las últimas 3 importaciones completadas
      const recentImports = await sql`
        SELECT 
          id,
          type,
          status,
          progress,
          processed_items,
          new_items,
          start_time,
          end_time,
          processing_item
        FROM import_history
        WHERE status IN ('completed', 'failed')
        ORDER BY start_time DESC
        LIMIT 3
      `;

      console.log('\n📋 Últimas importaciones:');
      recentImports.forEach((imp, index) => {
        const duration = imp.end_time ? 
          Math.round((new Date(imp.end_time) - new Date(imp.start_time)) / 1000) : 0;
        
        console.log(`  ${index + 1}. ID ${imp.id} - ${imp.type} - ${imp.status}`);
        console.log(`     📊 ${imp.processed_items || 0} elementos procesados, ${imp.new_items || 0} nuevos`);
        console.log(`     ⏱️  Duración: ${duration}s - ${new Date(imp.start_time).toLocaleString()}`);
        console.log('');
      });

      return;
    }

    console.log(`📊 ${activeImports.length} importación(es) activa(s):\n`);

    for (const imp of activeImports) {
      const startTime = new Date(imp.start_time);
      const lastUpdate = new Date(imp.last_updated);
      const elapsedMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);
      const lastUpdateMinutes = Math.round((Date.now() - lastUpdate.getTime()) / 60000);

      console.log(`🔄 Importación ID ${imp.id} - ${imp.type.toUpperCase()}`);
      console.log(`   Estado: ${imp.status}`);
      console.log(`   Progreso: ${imp.progress || 0}%`);
      
      if (imp.total_items > 0) {
        console.log(`   Elementos: ${imp.processed_items || 0}/${imp.total_items} (${imp.new_items || 0} nuevos)`);
      } else {
        console.log(`   Procesados: ${imp.processed_items || 0} elementos (${imp.new_items || 0} nuevos)`);
      }
      
      console.log(`   Iniciada: hace ${elapsedMinutes} min (${startTime.toLocaleString()})`);
      console.log(`   Última actualización: hace ${lastUpdateMinutes} min`);
      
      if (imp.processing_item) {
        console.log(`   📋 Estado: ${imp.processing_item}`);
      }
      
      if (imp.error_count > 0) {
        console.log(`   ⚠️  Errores: ${imp.error_count}`);
      }
      
      console.log('');
    }

    // Verificar programaciones próximas
    const upcomingSchedules = await sql`
      SELECT 
        id,
        type,
        frequency,
        next_run,
        active
      FROM import_schedule
      WHERE active = true AND next_run > NOW()
      ORDER BY next_run ASC
      LIMIT 3
    `;

    if (upcomingSchedules.length > 0) {
      console.log('📅 Próximas importaciones programadas:');
      upcomingSchedules.forEach((schedule, index) => {
        const nextRun = new Date(schedule.next_run);
        const minutesToNext = Math.round((nextRun.getTime() - Date.now()) / 60000);
        
        console.log(`  ${index + 1}. ${schedule.type} (${schedule.frequency}) - en ${minutesToNext} min (${nextRun.toLocaleString()})`);
      });
    }

    // Estadísticas rápidas
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status IN ('in_progress', 'processing', 'pending')) as active,
        MAX(start_time) as last_import
      FROM import_history 
      WHERE start_time > NOW() - INTERVAL '24 hours'
    `;

    if (stats[0]) {
      console.log('\n📈 Estadísticas últimas 24h:');
      console.log(`   ✅ Completadas: ${stats[0].completed}`);
      console.log(`   ❌ Fallidas: ${stats[0].failed}`);
      console.log(`   🔄 Activas: ${stats[0].active}`);
      if (stats[0].last_import) {
        console.log(`   🕐 Última importación: ${new Date(stats[0].last_import).toLocaleString()}`);
      }
    }

  } catch (error) {
    console.error('❌ Error monitorizando importaciones:', error.message);
  }
}

// Ejecutar monitoreo
monitorImports()
  .then(() => {
    console.log('\n✅ Monitoreo completado');
  })
  .catch(console.error);