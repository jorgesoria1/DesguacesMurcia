#!/usr/bin/env node

import { db } from './server/db.js';
import { importHistory } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function fixStuckImport() {
  console.log('🔧 Solucionando importación bloqueada...');
  
  try {
    // Obtener importación bloqueada
    const [stuckImport] = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.id, 1215));
    
    if (!stuckImport) {
      console.log('❌ No se encontró la importación 1215');
      return;
    }
    
    console.log(`📊 Estado actual: ${stuckImport.status} - ${stuckImport.progress}%`);
    
    // Marcar como completada
    await db
      .update(importHistory)
      .set({
        status: 'completed',
        progress: 100,
        processingItem: 'Importación completada manualmente',
        endTime: new Date()
      })
      .where(eq(importHistory.id, 1215));
    
    console.log('✅ Importación marcada como completada');
    
    // Ejecutar procesamiento de relaciones pendientes
    console.log('🔄 Ejecutando procesamiento de relaciones pendientes...');
    
    const { MetasyncOptimizedImportService } = await import('./server/api/metasync-optimized-import-service.js');
    const service = new MetasyncOptimizedImportService();
    await service.configure();
    
    const result = await service.processPendingRelations();
    console.log(`✅ Relaciones procesadas: ${result.resolved}`);
    
    // Verificar estado final
    const finalStats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM parts) as total_parts,
        (SELECT COUNT(*) FROM parts WHERE activo = true) as active_parts,
        (SELECT COUNT(*) FROM parts WHERE is_pending_relation = true) as pending_parts,
        (SELECT COUNT(*) FROM vehicle_parts) as associations
    `);
    
    console.log('📊 Estado final:');
    const row = finalStats.rows[0];
    console.log(`  Vehículos: ${row.total_vehicles}`);
    console.log(`  Piezas: ${row.total_parts}`);
    console.log(`  Piezas activas: ${row.active_parts}`);
    console.log(`  Piezas pendientes: ${row.pending_parts}`);
    console.log(`  Asociaciones: ${row.associations}`);
    
  } catch (error) {
    console.error('❌ Error solucionando importación:', error);
  }
}

fixStuckImport();