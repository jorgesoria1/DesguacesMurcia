import { db } from './server/db.js';
import { importSchedule } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function cleanupSchedules() {
  console.log('=== CLEANING UP IMPORT SCHEDULES ===');
  
  try {
    // Desactivar todas las programaciones activas
    await db.update(importSchedule)
      .set({ active: false })
      .where(eq(importSchedule.active, true));

    console.log('✅ Todas las programaciones desactivadas');

    // Crear una sola programación para piezas cada 2 horas
    const result = await db.insert(importSchedule).values({
      type: 'parts',
      frequency: '2h',
      active: true,
      isFullImport: false,
      days: null,
      options: {},
      startTime: '10:30'
    }).returning();

    console.log('✅ Nueva programación creada:', result[0]);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanupSchedules();