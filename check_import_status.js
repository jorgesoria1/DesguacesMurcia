import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function checkSystemStatus() {
  console.log('🔍 ESTADO DEL SISTEMA DE IMPORTACIONES');
  console.log('=====================================');
  console.log(new Date().toLocaleString('es-ES'));
  console.log('');

  try {
    // 1. Importaciones activas
    const activeImports = await db.execute(
      sql`SELECT id, type, status, progress FROM import_history WHERE status = 'in_progress'`
    );
    
    console.log('📊 IMPORTACIONES ACTIVAS:');
    if (activeImports.length === 0) {
      console.log('   ✅ No hay importaciones en progreso');
    } else {
      activeImports.forEach(imp => {
        console.log(`   🔄 ID ${imp.id} (${imp.type}): ${imp.progress}%`);
      });
    }

    // 2. Programaciones
    const schedules = await db.execute(
      sql`SELECT id, type, start_time, next_run, active FROM import_schedule WHERE active = true`
    );
    
    console.log('\n📅 PROGRAMACIONES ACTIVAS:');
    schedules.forEach(schedule => {
      const nextRun = new Date(schedule.next_run);
      const hoursUntil = Math.round((nextRun - new Date()) / (1000 * 60 * 60 * 24) * 24);
      console.log(`   - ${schedule.type.toUpperCase()} a las ${schedule.start_time}`);
      console.log(`     Próxima: ${nextRun.toLocaleDateString()} ${nextRun.toLocaleTimeString()} (${hoursUntil}h)`);
    });

    // 3. Últimas importaciones
    const recent = await db.execute(
      sql`SELECT id, type, status, start_time FROM import_history ORDER BY start_time DESC LIMIT 5`
    );
    
    console.log('\n📋 ÚLTIMAS IMPORTACIONES:');
    recent.forEach(imp => {
      const date = new Date(imp.start_time);
      const icon = imp.status === 'completed' ? '✅' : imp.status === 'failed' ? '❌' : '🔄';
      console.log(`   ${icon} ${imp.type} - ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    });

    // 4. Conteos del sistema
    const counts = await db.execute(
      sql`SELECT 
        (SELECT COUNT(*) FROM vehicles WHERE activo = true) as vehicles,
        (SELECT COUNT(*) FROM parts WHERE activo = true) as parts_active,
        (SELECT COUNT(*) FROM parts) as parts_total`
    );
    
    console.log('\n📈 ESTADO DEL INVENTARIO:');
    const stats = counts[0];
    console.log(`   Vehículos activos: ${stats.vehicles}`);
    console.log(`   Piezas activas: ${stats.parts_active} / ${stats.parts_total}`);
    
    console.log('\n✅ Monitoreo completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSystemStatus();