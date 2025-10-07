// Script para ejecutar la importación que se perdió esta madrugada
// y verificar el estado del scheduler

import { db } from './server/db.js';
import { importSchedule } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function runMissedImport() {
  console.log('🔧 Reprogramando importaciones perdidas...');
  
  try {
    // Actualizar la programación para mañana a las 02:00
    console.log('📅 Reprogramando importación completa para mañana a las 02:00...');
    await db.update(importSchedule)
      .set({ 
        nextRun: new Date('2025-08-02T02:00:00.000Z'),
        lastRun: null  // Resetear para indicar que no se ejecutó hoy
      })
      .where(eq(importSchedule.id, 59));
    
    console.log('✅ Importación completa reprogramada para mañana 02:00');
    
    // Verificar el estado de las programaciones
    const schedules = await db.select().from(importSchedule).where(eq(importSchedule.active, true));
    console.log('\n📋 Estado actual de programaciones:');
    schedules.forEach(schedule => {
      const nextRun = new Date(schedule.nextRun);
      const now = new Date();
      const hoursUntil = Math.round((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10;
      
      console.log(`  - ID ${schedule.id}: ${schedule.type} (${schedule.isFullImport ? 'Completa' : 'Incremental'})`);
      console.log(`    Próxima ejecución: ${nextRun.toLocaleString()}`);
      console.log(`    Tiempo restante: ${hoursUntil} horas`);
      console.log(`    Última ejecución: ${schedule.lastRun || 'Nunca'}`);
    });
    
    return 'reprogrammed';
    
  } catch (error) {
    console.error('❌ Error reprogramando importaciones:', error);
    throw error;
  }
}

// Ejecutar script
runMissedImport()
  .then((importId) => {
    console.log(`\n🎯 Importación ${importId} en progreso. Puede monitorear el progreso en:`);
    console.log('  - Panel de admin: /admin/import-optimized');
    console.log('  - Comando: node monitor_imports.js');
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });