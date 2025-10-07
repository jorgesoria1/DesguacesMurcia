#!/usr/bin/env node

import { db } from './server/db.js';
import { importHistory, vehicles, parts, vehicleParts } from './shared/schema.js';
import { desc, sql } from 'drizzle-orm';

async function monitorImportStatus() {
  console.log('=== ESTADO DE LA IMPORTACIÓN ===');
  
  try {
    // Últimas importaciones
    const history = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.id))
      .limit(3);
    
    console.log('📊 Últimas importaciones:');
    history.forEach(h => {
      console.log(`  ${h.id}: ${h.type} - ${h.status} - ${h.progress}% - ${h.processingItem || 'N/A'}`);
    });
    
    // Estadísticas actuales
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM parts) as parts,
        (SELECT COUNT(*) FROM vehicle_parts) as associations,
        (SELECT COUNT(*) FROM parts WHERE activo = true) as active_parts,
        (SELECT COUNT(*) FROM parts WHERE is_pending_relation = true) as pending_parts
    `);
    
    console.log('📈 Estadísticas actuales:');
    const row = stats.rows[0];
    console.log(`  Vehículos: ${row.vehicles}`);
    console.log(`  Piezas: ${row.parts}`);
    console.log(`  Piezas activas: ${row.active_parts}`);
    console.log(`  Piezas pendientes: ${row.pending_parts}`);
    console.log(`  Asociaciones: ${row.associations}`);
    
    // Verificar próxima importación programada
    const nextImport = await db.execute(sql`
      SELECT * FROM import_schedule 
      WHERE active = true 
      ORDER BY next_run 
      LIMIT 1
    `);
    
    if (nextImport.rows.length > 0) {
      const schedule = nextImport.rows[0];
      const now = new Date();
      const nextRun = new Date(schedule.next_run);
      const timeUntil = Math.max(0, nextRun.getTime() - now.getTime());
      const minutesUntil = Math.round(timeUntil / 1000 / 60);
      
      console.log('⏰ Próxima importación programada:');
      console.log(`  Tipo: ${schedule.type}`);
      console.log(`  Programada para: ${nextRun.toLocaleString()}`);
      console.log(`  Tiempo restante: ${minutesUntil} minutos`);
    }
    
    console.log(`\n🕒 Actualizado: ${new Date().toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error monitoreando importación:', error);
  }
}

monitorImportStatus();