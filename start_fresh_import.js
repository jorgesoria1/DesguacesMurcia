#!/usr/bin/env node

import { db } from './server/db.js';
import { importSchedule } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function startFreshImport() {
  console.log('🚀 Iniciando importación completa desde cero...');
  
  try {
    // Desactivar todas las programaciones existentes
    await db
      .update(importSchedule)
      .set({ active: false })
      .where(eq(importSchedule.active, true));
    
    console.log('⏸️ Programaciones existentes desactivadas');
    
    // Crear nueva programación para importación completa inmediata
    const now = new Date();
    const startTime = new Date(now.getTime() + 30 * 1000); // 30 segundos desde ahora
    
    const [newSchedule] = await db
      .insert(importSchedule)
      .values({
        type: 'all',
        frequency: '24h',
        active: true,
        isFullImport: true,
        startTime: startTime.toTimeString().slice(0, 5),
        nextRun: startTime
      })
      .returning();
    
    console.log('✅ Nueva programación creada:');
    console.log(`  ID: ${newSchedule.id}`);
    console.log(`  Tipo: ${newSchedule.type} (importación completa)`);
    console.log(`  Próxima ejecución: ${newSchedule.nextRun?.toLocaleString()}`);
    console.log(`  Iniciará automáticamente en 30 segundos...`);
    
  } catch (error) {
    console.error('❌ Error creando nueva programación:', error);
  }
}

startFreshImport();