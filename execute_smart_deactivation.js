#!/usr/bin/env node

/**
 * Script para ejecutar la desactivación inteligente de piezas problemáticas
 */

import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { eq, sql, and, or, isNull } from 'drizzle-orm';

console.log('🧹 Ejecutando desactivación inteligente de piezas problemáticas...');

async function executeSmartDeactivation() {
  try {
    console.log('\n📊 Estado inicial de piezas...');
    
    // Estadísticas iniciales
    const [initialStats] = await db
      .select({
        total: sql`COUNT(*)`,
        activas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        procesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`
      })
      .from(parts);

    console.log(`   • Total piezas: ${initialStats.total}`);
    console.log(`   • Activas: ${initialStats.activas}`);
    console.log(`   • Procesadas activas: ${initialStats.procesadas}`);

    // Desactivar piezas problemáticas
    console.log('\n🔄 Desactivando piezas problemáticas...');
    
    const deactivateResult = await db
      .update(parts)
      .set({ 
        activo: false,
        fechaActualizacion: sql`NOW()`
      })
      .where(
        and(
          eq(parts.activo, true),
          or(
            // Piezas regulares con precio cero/nulo
            and(
              sql`${parts.idVehiculo} > 0`,
              or(
                sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = 0`,
                isNull(parts.precio),
                eq(parts.precio, ''),
                eq(parts.precio, '0'),
                eq(parts.precio, '0,00')
              )
            ),
            // Piezas procesadas con precio negativo (excepto -1) o nombre "NO IDENTIFICADO"
            and(
              sql`${parts.idVehiculo} < 0`,
              or(
                sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) < -1`,
                sql`UPPER(${parts.descripcionArticulo}) LIKE '%NO IDENTIFICADO%'`,
                sql`UPPER(${parts.vehicleMarca}) LIKE '%NO IDENTIFICADO%'`
              )
            )
          )
        )
      );

    console.log(`✅ Desactivadas ${deactivateResult.rowCount || 0} piezas problemáticas`);

    // Estadísticas finales
    console.log('\n📊 Estado final de piezas...');
    
    const [finalStats] = await db
      .select({
        total: sql`COUNT(*)`,
        activas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        procesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`,
        procesadasConDatos: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`
      })
      .from(parts);

    console.log(`   • Total piezas: ${finalStats.total}`);
    console.log(`   • Activas: ${finalStats.activas}`);
    console.log(`   • Procesadas activas: ${finalStats.procesadas}`);
    console.log(`   • Procesadas con datos: ${finalStats.procesadasConDatos}`);

    // Verificar algunos ejemplos de piezas procesadas válidas que quedan activas
    console.log('\n✅ Muestra de piezas procesadas válidas que se mantienen activas:');
    
    const validSamples = await db
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

    validSamples.forEach((part, index) => {
      console.log(`   ${index + 1}. ${part.refLocal} - ${part.vehicleMarca} ${part.vehicleModelo} (Precio: ${part.precio})`);
    });

    const successRate = finalStats.procesadas > 0 ? 
      ((finalStats.procesadasConDatos / finalStats.procesadas) * 100).toFixed(2) : '0.00';

    console.log('\n🎯 Resumen final:');
    console.log(`   • Piezas desactivadas: ${deactivateResult.rowCount || 0}`);
    console.log(`   • Piezas procesadas conservadas: ${finalStats.procesadas}`);
    console.log(`   • Tasa de éxito en datos de vehículo: ${successRate}%`);
    console.log(`   • Sistema funcionando: ${finalStats.procesadas > 90000 ? '✅ CORRECTAMENTE' : '⚠️ REVISAR'}`);

    return deactivateResult.rowCount || 0;

  } catch (error) {
    console.error('❌ Error en desactivación inteligente:', error);
    throw error;
  }
}

// Ejecutar desactivación
executeSmartDeactivation()
  .then(result => {
    console.log(`\n✅ Desactivación inteligente completada: ${result} piezas desactivadas`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en desactivación:', error);
    process.exit(1);
  });