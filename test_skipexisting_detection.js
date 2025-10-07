// Test para verificar por qué skipExisting no se activa automáticamente  
import { db } from './server/db.js';
import { parts, vehicles } from './shared/schema.js';
import { sql } from 'drizzle-orm';

async function testSkipExistingDetection() {
  console.log('🔍 Probando detección automática de skipExisting...');
  
  try {
    // Contar piezas
    const partsResult = await db.select({ count: sql`count(*)` }).from(parts);
    const partsCount = partsResult[0]?.count || 0;
    
    // Contar vehículos  
    const vehiclesResult = await db.select({ count: sql`count(*)` }).from(vehicles);
    const vehiclesCount = vehiclesResult[0]?.count || 0;
    
    console.log(`📊 Piezas en BD: ${partsCount.toLocaleString()}`);
    console.log(`🚗 Vehículos en BD: ${vehiclesCount.toLocaleString()}`);
    
    // Calcular recomendaciones según la lógica
    const partsThreshold = 10000;
    const vehiclesThreshold = 1000;
    
    const shouldSkipParts = partsCount >= partsThreshold;
    const shouldSkipVehicles = vehiclesCount >= vehiclesThreshold;
    
    console.log(`\n🎯 RECOMENDACIONES:`);
    console.log(`Piezas: ${shouldSkipParts ? 'SÍ' : 'NO'} activar skipExisting (${partsCount} >= ${partsThreshold})`);
    console.log(`Vehículos: ${shouldSkipVehicles ? 'SÍ' : 'NO'} activar skipExisting (${vehiclesCount} >= ${vehiclesThreshold})`);
    
    if (shouldSkipParts) {
      console.log(`⚠️  PROBLEMA: Base poblada pero skipExisting no se activó en importación ID 1770`);
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

testSkipExistingDetection();