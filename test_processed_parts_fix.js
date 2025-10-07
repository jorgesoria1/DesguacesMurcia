#!/usr/bin/env node

/**
 * Script de prueba para verificar que la corrección de piezas procesadas funciona correctamente
 * después de las modificaciones en import-finalizer.ts
 */

import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { eq, sql, and, or, isNull } from 'drizzle-orm';

console.log('🧪 Iniciando prueba de corrección de piezas procesadas...');

async function testProcessedPartsFix() {
  try {
    console.log('\n📊 Verificando estado actual de piezas procesadas...');
    
    // Verificar piezas procesadas activas
    const [processedStats] = await db
      .select({
        total: sql`COUNT(*)`,
        activas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        withVehicleData: sql`COUNT(CASE WHEN ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        withPrice: sql`COUNT(CASE WHEN ${parts.activo} = true AND ${parts.precio} IS NOT NULL AND ${parts.precio} != '' THEN 1 END)`,
        withNegativePrice: sql`COUNT(CASE WHEN ${parts.activo} = true AND CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = -1 THEN 1 END)`
      })
      .from(parts)
      .where(sql`${parts.idVehiculo} < 0`);

    console.log(`\n📈 Estadísticas de piezas procesadas (idVehiculo < 0):`);
    console.log(`   • Total piezas procesadas: ${processedStats.total}`);
    console.log(`   • Piezas activas: ${processedStats.activas}`);
    console.log(`   • Con datos de vehículo: ${processedStats.withVehicleData}`);
    console.log(`   • Con precio válido: ${processedStats.withPrice}`);
    console.log(`   • Con precio -1 (marcador): ${processedStats.withNegativePrice}`);

    // Verificar piezas procesadas sin datos de vehículo
    const processedWithoutVehicleData = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio,
        activo: parts.activo
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`,
          or(
            isNull(parts.vehicleMarca),
            eq(parts.vehicleMarca, ''),
            sql`${parts.vehicleMarca} LIKE 'ELECTRICIDAD%'`,
            sql`${parts.vehicleMarca} LIKE 'CARROCER%'`,
            sql`${parts.vehicleMarca} LIKE 'SUSPENSIÓN%'`,
            sql`${parts.vehicleMarca} LIKE 'FRENOS%'`,
            sql`${parts.vehicleMarca} LIKE 'DIRECCIÓN%'`,
            sql`${parts.vehicleMarca} LIKE 'TRANSMISIÓN%'`,
            sql`${parts.vehicleMarca} LIKE 'MOTOR%'`,
            sql`${parts.vehicleMarca} LIKE 'INTERIOR%'`
          )
        )
      )
      .limit(10);

    console.log(`\n🔍 Piezas procesadas sin datos válidos de vehículo: ${processedWithoutVehicleData.length} (muestra de 10)`);
    
    if (processedWithoutVehicleData.length > 0) {
      console.log('📝 Muestra de piezas que necesitan corrección:');
      processedWithoutVehicleData.forEach((part, index) => {
        console.log(`   ${index + 1}. ${part.refLocal} (ID: ${part.idVehiculo}) - Marca: "${part.vehicleMarca}" - Precio: ${part.precio} - Activo: ${part.activo}`);
      });
    } else {
      console.log('✅ No se encontraron piezas procesadas que requieran corrección');
    }

    // Verificar si import-finalizer está preservando correctamente las piezas procesadas
    const processedWithNegativePrice = await db
      .select({
        count: sql`COUNT(*)`
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`,
          sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = -1`
        )
      );

    console.log(`\n✅ Verificación de protección import-finalizer:`);
    console.log(`   • Piezas procesadas con precio -1 activas: ${processedWithNegativePrice[0].count}`);
    console.log(`   • ${processedWithNegativePrice[0].count > 0 ? '✅ PROTECCIÓN FUNCIONANDO' : '❌ PROTECCIÓN FALLANDO'}`);

    // Verificar piezas regulares con precio cero (estas SÍ deben estar desactivadas)
    const [regularZeroPriceStats] = await db
      .select({
        total: sql`COUNT(*)`,
        activas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`
      })
      .from(parts)
      .where(
        and(
          sql`${parts.idVehiculo} > 0`,
          or(
            eq(parts.precio, "0"),
            eq(parts.precio, "0.00"),
            eq(parts.precio, ""),
            isNull(parts.precio)
          )
        )
      );

    console.log(`\n🔍 Piezas regulares con precio cero (deben estar desactivadas):`);
    console.log(`   • Total piezas regulares precio cero: ${regularZeroPriceStats.total}`);
    console.log(`   • Activas (problema): ${regularZeroPriceStats.activas}`);
    console.log(`   • ${regularZeroPriceStats.activas === 0 ? '✅ CORRECTO' : '⚠️ REQUIERE ATENCIÓN'}`);

    console.log('\n🎯 Resumen de la prueba:');
    const successRate = processedStats.withVehicleData > 0 ? ((processedStats.withVehicleData / processedStats.activas) * 100).toFixed(2) : '0.00';
    console.log(`   • Tasa de éxito en datos de vehículo: ${successRate}%`);
    console.log(`   • Piezas procesadas protegidas: ${processedWithNegativePrice[0].count > 0 ? '✅' : '❌'}`);
    console.log(`   • Sistema funcionando correctamente: ${successRate > 80 && processedWithNegativePrice[0].count > 0 ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar prueba
testProcessedPartsFix()
  .then(() => {
    console.log('\n✅ Prueba completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en prueba:', error);
    process.exit(1);
  });