#!/usr/bin/env node

import { db } from './server/db.js';
import { importSchedule } from './shared/schema.js';
import { sql } from 'drizzle-orm';

async function createFullImportSchedule() {
  console.log('📅 Creando programación de importación completa...');
  
  try {
    // Crear programación para importación completa en 2 minutos
    const now = new Date();
    const startTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutos desde ahora
    
    const schedule = {
      type: 'all',
      frequency: '24h', // Cada 24 horas
      active: true,
      isFullImport: true,
      startTime: startTime.toTimeString().slice(0, 5), // Formato HH:MM
      nextRun: startTime
    };
    
    const [newSchedule] = await db
      .insert(importSchedule)
      .values(schedule)
      .returning();
    
    console.log('✅ Programación creada exitosamente:');
    console.log(`  ID: ${newSchedule.id}`);
    console.log(`  Tipo: ${newSchedule.type} (importación completa)`);
    console.log(`  Frecuencia: ${newSchedule.frequency}`);
    console.log(`  Activa: ${newSchedule.active}`);
    console.log(`  Hora de inicio: ${newSchedule.startTime}`);
    console.log(`  Próxima ejecución: ${newSchedule.nextRun?.toLocaleString()}`);
    
    // Verificar que el scheduler está funcionando
    console.log('🔍 Verificando estado del scheduler...');
    const allSchedules = await db
      .select()
      .from(importSchedule);
    
    console.log(`📊 Total de programaciones: ${allSchedules.length}`);
    allSchedules.forEach(s => {
      console.log(`  ${s.id}: ${s.type} - ${s.active ? 'ACTIVA' : 'INACTIVA'} - próxima: ${s.nextRun?.toLocaleString()}`);
    });
    
    console.log('🚀 Programación lista. La importación comenzará automáticamente en 2 minutos...');
    
  } catch (error) {
    console.error('❌ Error creando programación:', error);
  }
}

createFullImportSchedule();