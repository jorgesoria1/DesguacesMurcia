#!/usr/bin/env node

/**
 * Script para reactivar todas las piezas procesadas que fueron incorrectamente desactivadas
 */

import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { eq, sql, and, or, isNull } from 'drizzle-orm';

console.log('🔄 Reactivando piezas procesadas incorrectamente desactivadas...');

async function reactivateProcessedParts() {
  try {
    console.log('\n📊 Analizando piezas procesadas que deben reactivarse...');
    
    // Contar piezas procesadas que deben reactivarse
    const [toReactivate] = await db
      .select({
        count: sql`COUNT(*)`
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, false),
          sql`${parts.idVehiculo} < 0`,
          // Condiciones que NO justifican desactivación
          sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) >= -1`, // Precio -1 o superior
          sql`UPPER(${parts.descripcionArticulo}) NOT LIKE '%NO IDENTIFICADO%'`,
          sql`UPPER(${parts.vehicleMarca}) NOT LIKE '%NO IDENTIFICADO%'`
        )
      );

    console.log(`📝 Piezas procesadas a reactivar: ${toReactivate.count}`);
    
    if (toReactivate.count === 0) {
      console.log('✅ No hay piezas procesadas que requieran reactivación');
      return 0;
    }

    // Reactivar piezas procesadas válidas
    console.log('\n🔄 Reactivando piezas procesadas válidas...');
    
    const reactivateResult = await db
      .update(parts)
      .set({ 
        activo: true,
        fechaActualizacion: sql`NOW()`
      })
      .where(
        and(
          eq(parts.activo, false),
          sql`${parts.idVehiculo} < 0`,
          // Solo reactivar piezas que NO tienen problemas válidos
          sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) >= -1`,
          sql`UPPER(${parts.descripcionArticulo}) NOT LIKE '%NO IDENTIFICADO%'`,
          sql`UPPER(${parts.vehicleMarca}) NOT LIKE '%NO IDENTIFICADO%'`
        )
      );

    console.log(`✅ Reactivadas ${reactivateResult.rowCount || 0} piezas procesadas`);

    // Verificar estadísticas finales
    console.log('\n📊 Estado final después de reactivación...');
    
    const [finalStats] = await db
      .select({
        totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
        procesadasActivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`,
        procesadasInactivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = false THEN 1 END)`,
        conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`
      })
      .from(parts);

    console.log(`   • Total piezas procesadas: ${finalStats.totalProcesadas}`);
    console.log(`   • Procesadas activas: ${finalStats.procesadasActivas}`);
    console.log(`   • Procesadas inactivas: ${finalStats.procesadasInactivas}`);
    console.log(`   • Con datos de vehículo: ${finalStats.conDatosVehiculo}`);

    // Muestra de piezas reactivadas
    console.log('\n✅ Muestra de piezas procesadas reactivadas:');
    
    const sampleReactivated = await db
      .select({
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`,
          sql`${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != ''`
        )
      )
      .limit(5);

    sampleReactivated.forEach((part, index) => {
      console.log(`   ${index + 1}. ${part.refLocal} - ${part.vehicleMarca} ${part.vehicleModelo} (€${part.precio})`);
    });

    const successRate = finalStats.procesadasActivas > 0 ? 
      ((finalStats.conDatosVehiculo / finalStats.procesadasActivas) * 100).toFixed(2) : '0.00';

    console.log('\n🎯 Resumen de la reactivación:');
    console.log(`   • Piezas reactivadas: ${reactivateResult.rowCount || 0}`);
    console.log(`   • Total piezas procesadas activas: ${finalStats.procesadasActivas}`);
    console.log(`   • Tasa de éxito en datos de vehículo: ${successRate}%`);
    console.log(`   • Sistema restaurado: ${finalStats.procesadasActivas > 90000 ? '✅ CORRECTAMENTE' : '⚠️ PARCIALMENTE'}`);

    return reactivateResult.rowCount || 0;

  } catch (error) {
    console.error('❌ Error en reactivación:', error);
    throw error;
  }
}

// Ejecutar reactivación
reactivateProcessedParts()
  .then(result => {
    console.log(`\n✅ Reactivación completada: ${result} piezas procesadas reactivadas`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en reactivación:', error);
    process.exit(1);
  });