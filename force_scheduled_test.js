#!/usr/bin/env node

/**
 * Script para forzar la ejecución de importaciones programadas para testing
 */

import { db } from './server/db.js';
import { importSchedule } from './shared/schema.js';
import { eq } from 'drizzle-orm';

console.log('🧪 Forzando ejecución de scheduler para testing...');

async function forceScheduledImport() {
  try {
    // Obtener schedules activos
    const schedules = await db.select().from(importSchedule).where(eq(importSchedule.active, true));
    
    console.log(`📅 Se encontraron ${schedules.length} programaciones activas:`);
    schedules.forEach(schedule => {
      console.log(`  - ID ${schedule.id}: ${schedule.type} (${schedule.frequency}) - Próxima: ${schedule.nextRun}`);
    });

    if (schedules.length === 0) {
      console.log('❌ No hay programaciones activas para ejecutar');
      return;
    }

    // Simular que es tiempo de ejecutar la primera programación
    const firstSchedule = schedules[0];
    console.log(`🚀 Forzando ejecución de programación ID ${firstSchedule.id} (${firstSchedule.type})`);
    
    // Actualizar next_run para que sea "ahora" y activar la ejecución
    const now = new Date();
    await db.update(importSchedule)
      .set({ nextRun: now })
      .where(eq(importSchedule.id, firstSchedule.id));
    
    console.log(`✅ Programación ${firstSchedule.id} configurada para ejecutarse ahora`);
    console.log('⏰ El scheduler debería detectar y ejecutar esta importación en el próximo ciclo (1-2 minutos)');
    
    return firstSchedule.id;
  } catch (error) {
    console.error('❌ Error forzando importación programada:', error);
  }
}

forceScheduledImport()
  .then((scheduleId) => {
    if (scheduleId) {
      console.log(`🎯 Programación ${scheduleId} lista para ejecutar. Monitoree los logs del servidor.`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });