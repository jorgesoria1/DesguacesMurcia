#!/usr/bin/env node

import { db } from './server/db.js';
import { importSchedule } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function debugScheduler() {
  console.log('🔍 Diagnosticando scheduler de importaciones...');
  
  try {
    // Verificar programaciones activas
    const activeSchedules = await db
      .select()
      .from(importSchedule)
      .where(eq(importSchedule.active, true));
    
    console.log(`📅 Programaciones activas: ${activeSchedules.length}`);
    
    activeSchedules.forEach(schedule => {
      const now = new Date();
      const nextRun = new Date(schedule.nextRun);
      const isPastDue = nextRun <= now;
      
      console.log(`\n📋 Programación ID ${schedule.id}:`);
      console.log(`  Tipo: ${schedule.type}`);
      console.log(`  Frecuencia: ${schedule.frequency}`);
      console.log(`  Activa: ${schedule.active}`);
      console.log(`  Última ejecución: ${schedule.lastRun || 'Nunca'}`);
      console.log(`  Próxima ejecución: ${nextRun.toLocaleString()}`);
      console.log(`  Hora actual: ${now.toLocaleString()}`);
      console.log(`  ¿Debería ejecutarse?: ${isPastDue ? 'SÍ' : 'NO'}`);
      console.log(`  Diferencia: ${Math.round((nextRun.getTime() - now.getTime()) / 1000)} segundos`);
    });
    
    // Verificar si hay importaciones en curso
    const runningImports = await db.execute(sql`
      SELECT * FROM import_history 
      WHERE status = 'in_progress' 
      ORDER BY id DESC
    `);
    
    console.log(`\n🔄 Importaciones en progreso: ${runningImports.rows.length}`);
    
    if (runningImports.rows.length > 0) {
      console.log('📊 Importaciones en progreso:');
      runningImports.rows.forEach(imp => {
        console.log(`  ID ${imp.id}: ${imp.type} - ${imp.progress}% - ${imp.processing_item}`);
      });
    }
    
    // Verificar configuración de API
    const apiConfig = await db.execute(sql`
      SELECT * FROM api_config WHERE active = true LIMIT 1
    `);
    
    console.log(`\n⚙️ Configuración de API activa: ${apiConfig.rows.length > 0 ? 'SÍ' : 'NO'}`);
    
    if (apiConfig.rows.length > 0) {
      const config = apiConfig.rows[0];
      console.log(`  Company ID: ${config.company_id}`);
      console.log(`  Channel: ${config.channel}`);
      console.log(`  API Key: ${config.api_key?.substring(0, 10)}...`);
    }
    
    // Forzar ejecución de importación si está pendiente
    if (activeSchedules.length > 0) {
      const schedule = activeSchedules[0];
      const now = new Date();
      const nextRun = new Date(schedule.nextRun);
      
      if (nextRun <= now) {
        console.log('\n🚀 Forzando ejecución de importación pendiente...');
        
        // Importar y ejecutar el scheduler manualmente
        try {
          const { ImportScheduler } = await import('./server/services/scheduler.js');
          const scheduler = new ImportScheduler();
          const result = await scheduler.runScheduledImport(schedule);
          
          console.log(`✅ Importación ejecutada: ${JSON.stringify(result)}`);
        } catch (error) {
          console.error('❌ Error ejecutando importación:', error);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

debugScheduler();