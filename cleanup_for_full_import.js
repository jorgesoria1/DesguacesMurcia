#!/usr/bin/env node

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function cleanupForFullImport() {
  console.log('🧹 Limpiando base de datos para importación completa...');
  
  try {
    // 1. Limpiar tabla de asociaciones
    console.log('🗑️ Limpiando asociaciones vehículo-piezas...');
    await db.execute(sql`TRUNCATE TABLE vehicle_parts CASCADE`);
    
    // 2. Limpiar tabla de piezas 
    console.log('🗑️ Limpiando tabla de piezas...');
    await db.execute(sql`TRUNCATE TABLE parts CASCADE`);
    
    // 3. Limpiar tabla de vehículos
    console.log('🗑️ Limpiando tabla de vehículos...');
    await db.execute(sql`TRUNCATE TABLE vehicles CASCADE`);
    
    // 4. Limpiar historial de importaciones
    console.log('🗑️ Limpiando historial de importaciones...');
    await db.execute(sql`TRUNCATE TABLE import_history CASCADE`);
    
    // 5. Restablecer control de sincronización
    console.log('🔄 Restableciendo control de sincronización...');
    await db.execute(sql`TRUNCATE TABLE sync_control CASCADE`);
    
    // 6. Marcar todas las programaciones como inactivas
    console.log('⏸️ Desactivando programaciones de importación...');
    await db.execute(sql`UPDATE import_schedule SET active = false`);
    
    // 7. Verificar limpieza
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles) as vehicles_count,
        (SELECT COUNT(*) FROM parts) as parts_count,
        (SELECT COUNT(*) FROM vehicle_parts) as associations_count,
        (SELECT COUNT(*) FROM import_history) as import_history_count,
        (SELECT COUNT(*) FROM sync_control) as sync_control_count
    `);
    
    console.log('📊 Estado después de la limpieza:');
    const row = stats.rows[0];
    console.log(`  Vehículos: ${row.vehicles_count}`);
    console.log(`  Piezas: ${row.parts_count}`);
    console.log(`  Asociaciones: ${row.associations_count}`);
    console.log(`  Historial importaciones: ${row.import_history_count}`);
    console.log(`  Control sincronización: ${row.sync_control_count}`);
    
    console.log('✅ Limpieza completada exitosamente');
    console.log('🚀 Base de datos lista para importación completa');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

cleanupForFullImport();