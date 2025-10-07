#!/usr/bin/env node

/**
 * Script para investigar por qué se han desactivado las piezas procesadas
 */

import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { eq, sql, and, or, isNull } from 'drizzle-orm';

console.log('🔍 Investigando desactivación de piezas procesadas...');

async function investigateDeactivation() {
  try {
    console.log('\n📊 Estado actual de piezas procesadas...');
    
    // Estadísticas actuales
    const [currentStats] = await db
      .select({
        totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
        procesadasActivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`,
        procesadasInactivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = false THEN 1 END)`,
        conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        precioMenosUno: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = -1 THEN 1 END)`
      })
      .from(parts);

    console.log(`   • Total piezas procesadas: ${currentStats.totalProcesadas}`);
    console.log(`   • Procesadas activas: ${currentStats.procesadasActivas}`);
    console.log(`   • Procesadas inactivas: ${currentStats.procesadasInactivas}`);
    console.log(`   • Con datos de vehículo: ${currentStats.conDatosVehiculo}`);
    console.log(`   • Con precio -1: ${currentStats.precioMenosUno}`);

    // Verificar si hay piezas procesadas válidas que están inactivas
    console.log('\n🔍 Analizando piezas procesadas inactivas que deberían estar activas...');
    
    const wronglyDeactivated = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio,
        descripcionArticulo: parts.descripcionArticulo,
        fechaActualizacion: parts.fechaActualizacion
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, false),
          sql`${parts.idVehiculo} < 0`,
          // Condiciones que NO deberían desactivar
          sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) >= -1`, // Precio -1 o superior
          sql`UPPER(${parts.descripcionArticulo}) NOT LIKE '%NO IDENTIFICADO%'`
        )
      )
      .limit(10);

    console.log(`📝 Encontradas ${wronglyDeactivated.length} piezas procesadas incorrectamente desactivadas:`);
    
    if (wronglyDeactivated.length > 0) {
      wronglyDeactivated.forEach((part, index) => {
        const hasVehicleData = part.vehicleMarca && part.vehicleMarca.trim() !== '';
        console.log(`   ${index + 1}. ${part.refLocal} (ID: ${part.idVehiculo})`);
        console.log(`      Marca: "${part.vehicleMarca}" | Modelo: "${part.vehicleModelo}"`);
        console.log(`      Precio: ${part.precio} | Datos válidos: ${hasVehicleData ? '✅' : '❌'}`);
        console.log(`      Última actualización: ${part.fechaActualizacion}`);
        console.log(`      Descripción: ${part.descripcionArticulo?.substring(0, 50)}...`);
        console.log('');
      });
    }

    // Verificar piezas que SÍ deberían estar desactivadas
    console.log('\n✅ Verificando piezas que correctamente están desactivadas...');
    
    const correctlyDeactivated = await db
      .select({
        count: sql`COUNT(*)`
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, false),
          sql`${parts.idVehiculo} < 0`,
          or(
            sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) < -1`,
            sql`UPPER(${parts.descripcionArticulo}) LIKE '%NO IDENTIFICADO%'`,
            sql`UPPER(${parts.vehicleMarca}) LIKE '%NO IDENTIFICADO%'`
          )
        )
      );

    console.log(`   • Piezas correctamente desactivadas: ${correctlyDeactivated[0].count}`);

    // Contar el total de piezas procesadas que deberían estar activas
    const [shouldBeActive] = await db
      .select({
        count: sql`COUNT(*)`
      })
      .from(parts)
      .where(
        and(
          sql`${parts.idVehiculo} < 0`,
          sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) >= -1`,
          sql`UPPER(${parts.descripcionArticulo}) NOT LIKE '%NO IDENTIFICADO%'`,
          sql`UPPER(${parts.vehicleMarca}) NOT LIKE '%NO IDENTIFICADO%'`
        )
      );

    console.log(`   • Piezas procesadas que DEBERÍAN estar activas: ${shouldBeActive.count}`);
    console.log(`   • Diferencia con las que están activas: ${shouldBeActive.count - currentStats.procesadasActivas}`);

    // Verificar últimas actualizaciones
    console.log('\n⏰ Verificando actualizaciones recientes...');
    
    const recentUpdates = await db
      .select({
        count: sql`COUNT(*)`,
        lastUpdate: sql`MAX(${parts.fechaActualizacion})`
      })
      .from(parts)
      .where(
        and(
          sql`${parts.idVehiculo} < 0`,
          eq(parts.activo, false),
          sql`${parts.fechaActualizacion} > NOW() - INTERVAL '1 hour'`
        )
      );

    console.log(`   • Piezas procesadas desactivadas en la última hora: ${recentUpdates[0].count}`);
    console.log(`   • Última actualización: ${recentUpdates[0].lastUpdate}`);

    // Análisis del problema
    const problemSeverity = shouldBeActive.count - currentStats.procesadasActivas;
    
    console.log('\n🎯 Diagnóstico del problema:');
    if (problemSeverity > 50000) {
      console.log('   🔴 PROBLEMA GRAVE: Más de 50,000 piezas procesadas válidas están incorrectamente desactivadas');
      console.log('   📋 Posibles causas:');
      console.log('      1. import-finalizer.ts está desactivando piezas procesadas');
      console.log('      2. disable-zero-price-parts.ts tiene lógica incorrecta');
      console.log('      3. Proceso de importación automática ejecutó limpieza');
    } else if (problemSeverity > 1000) {
      console.log('   🟡 PROBLEMA MODERADO: Algunas piezas procesadas están incorrectamente desactivadas');
    } else {
      console.log('   🟢 ESTADO NORMAL: Las piezas procesadas están correctamente gestionadas');
    }

    return {
      totalProcessed: currentStats.totalProcesadas,
      activeProcessed: currentStats.procesadasActivas,
      shouldBeActive: shouldBeActive.count,
      problemCount: problemSeverity
    };

  } catch (error) {
    console.error('❌ Error en investigación:', error);
    throw error;
  }
}

// Ejecutar investigación
investigateDeactivation()
  .then(result => {
    console.log(`\n📊 Resumen de la investigación:`);
    console.log(`   • Piezas procesadas que deberían estar activas: ${result.shouldBeActive}`);
    console.log(`   • Piezas procesadas actualmente activas: ${result.activeProcessed}`);
    console.log(`   • Diferencia (problema): ${result.problemCount}`);
    console.log(`\n${result.problemCount > 50000 ? '🔴 ACCIÓN REQUERIDA' : '✅ INVESTIGACIÓN COMPLETADA'}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en investigación:', error);
    process.exit(1);
  });