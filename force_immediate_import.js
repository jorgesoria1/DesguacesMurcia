#!/usr/bin/env node

import { db } from './server/db.js';
import { importSchedule } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function forceImmediateImport() {
  console.log('⚡ Forzando ejecución inmediata de importación...');
  
  try {
    // Actualizar la programación para que se ejecute ahora
    const now = new Date();
    const [updated] = await db
      .update(importSchedule)
      .set({
        nextRun: now,
        active: true
      })
      .where(eq(importSchedule.id, 45))
      .returning();
    
    console.log('✅ Programación actualizada para ejecutarse inmediatamente');
    console.log(`  ID: ${updated.id}`);
    console.log(`  Próxima ejecución: ${updated.nextRun}`);
    console.log(`  Activa: ${updated.active}`);
    
    // Iniciar importación manual usando el servicio
    const { MetasyncOptimizedImportService } = await import('./server/api/metasync-optimized-import-service.js');
    const service = new MetasyncOptimizedImportService();
    await service.configure();
    
    console.log('🚀 Iniciando importación manual completa...');
    const result = await service.startImport('all', true);
    
    if (result.success) {
      console.log('✅ Importación iniciada exitosamente');
      console.log(`  Import ID: ${result.importId}`);
      console.log(`  Tipo: ${result.type}`);
      console.log(`  Estado: ${result.status}`);
    } else {
      console.error('❌ Error iniciando importación:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error forzando importación:', error);
  }
}

forceImmediateImport();