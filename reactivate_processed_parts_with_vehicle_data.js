/**
 * RECUPERACIÓN CRÍTICA DE PIEZAS PROCESADAS CON DATOS DE VEHÍCULO
 * 
 * Según la documentación crítica (línea 388), el 29 de julio de 2025 se desactivaron
 * incorrectamente 90,462 piezas de vehículos procesados que tenían datos válidos.
 * 
 * Este script reactiva las 662 piezas procesadas que mantuvieron sus datos de vehículo
 * válidos después de la desactivación incorrecta.
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { parts } from './shared/schema.js';
import { sql, and, eq, notInArray } from 'drizzle-orm';

const db = drizzle(neon(process.env.DATABASE_URL));

async function reactivateProcessedPartsWithVehicleData() {
  console.log('🔄 INICIANDO RECUPERACIÓN DE PIEZAS PROCESADAS CON DATOS DE VEHÍCULO');
  console.log('📋 Basado en documentación crítica línea 388 - July 29, 2025 Fix');
  
  try {
    // Paso 1: Identificar piezas procesadas desactivadas con datos válidos de vehículo
    console.log('\n📊 Paso 1: Identificando piezas procesadas desactivadas con datos válidos...');
    
    const invalidMarcas = [
      'ELECTRICIDAD', 'CARROCERÍA TRASERA', 'INTERIOR', 'SUSPENSIÓN / FRENOS',
      'DIRECCIÓN / TRANSMISIÓN', 'MOTOR / ADMISIÓN / ESCAPE', 'ALUMBRADO',
      'CLIMATIZACIÓN', 'ACCESORIOS', 'CARROCERÍA FRONTAL', 'CARROCERÍA LATERALES'
    ];
    
    const candidateParts = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        vehicleVersion: parts.vehicleVersion,
        precio: parts.precio
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, false),
          sql`${parts.idVehiculo} < 0`,
          sql`${parts.vehicleMarca} IS NOT NULL`,
          sql`${parts.vehicleMarca} != ''`,
          notInArray(parts.vehicleMarca, invalidMarcas)
        )
      );
    
    console.log(`✅ Encontradas ${candidateParts.length} piezas procesadas con datos válidos de vehículo`);
    
    if (candidateParts.length === 0) {
      console.log('ℹ️ No hay piezas procesadas para reactivar');
      return;
    }
    
    // Paso 2: Mostrar ejemplos de lo que se va a reactivar
    console.log('\n📋 Ejemplos de piezas que se van a reactivar:');
    candidateParts.slice(0, 10).forEach(part => {
      console.log(`  - ${part.refLocal}: ${part.vehicleMarca} ${part.vehicleModelo} ${part.vehicleVersion} (€${part.precio})`);
    });
    
    // Paso 3: Reactivar las piezas en lotes
    console.log(`\n🔄 Paso 2: Reactivando ${candidateParts.length} piezas procesadas...`);
    
    const BATCH_SIZE = 1000;
    let reactivatedCount = 0;
    
    for (let i = 0; i < candidateParts.length; i += BATCH_SIZE) {
      const batch = candidateParts.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(p => p.id);
      
      const result = await db
        .update(parts)
        .set({
          activo: true,
          ultimaSincronizacion: sql`NOW()`
        })
        .where(sql`${parts.id} = ANY(${batchIds})`);
      
      const batchCount = result.rowCount || 0;
      reactivatedCount += batchCount;
      
      console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batchCount} piezas reactivadas`);
    }
    
    // Paso 4: Verificar resultado
    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`✅ Total de piezas procesadas reactivadas: ${reactivatedCount}`);
    
    // Verificar el estado actual
    const currentStats = await db
      .select({
        totalProcessed: sql<number>`COUNT(*)`,
        activeProcessed: sql<number>`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        withVehicleData: sql<number>`COUNT(CASE WHEN ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`
      })
      .from(parts)
      .where(sql`${parts.idVehiculo} < 0`);
    
    const stats = currentStats[0];
    console.log(`📈 ESTADÍSTICAS ACTUALIZADAS:`);
    console.log(`  - Total piezas procesadas: ${stats.totalProcessed}`);
    console.log(`  - Piezas procesadas activas: ${stats.activeProcessed}`);
    console.log(`  - Con datos de vehículo: ${stats.withVehicleData}`);
    console.log(`  - Porcentaje activas: ${((stats.activeProcessed / stats.totalProcessed) * 100).toFixed(1)}%`);
    
    console.log('\n🎉 RECUPERACIÓN COMPLETADA EXITOSAMENTE');
    console.log('📝 Las piezas procesadas con datos válidos de vehículo han sido reactivadas');
    console.log('🔍 Los usuarios ahora pueden ver el catálogo expandido de piezas procesadas');
    
  } catch (error) {
    console.error('❌ Error durante la recuperación:', error);
    throw error;
  }
}

// Ejecutar el script
reactivateProcessedPartsWithVehicleData();