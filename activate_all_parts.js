#!/usr/bin/env node

/**
 * Script para activar todas las piezas y verificar el estado de la importación
 */

import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { eq, sql, and, or, isNull } from 'drizzle-orm';

console.log('🔄 Activando todas las piezas para verificar importación...');

async function activateAllParts() {
  try {
    // Primero ver estadísticas antes de activar
    console.log('\n📊 Estado ANTES de activar todas las piezas:');
    
    const [beforeStats] = await db
      .select({
        total: sql`COUNT(*)`,
        activas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        inactivas: sql`COUNT(CASE WHEN ${parts.activo} = false THEN 1 END)`,
        conVehiculo: sql`COUNT(CASE WHEN ${parts.idVehiculo} > 0 THEN 1 END)`,
        procesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
        conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        precioMenosUno: sql`COUNT(CASE WHEN CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = -1 THEN 1 END)`
      })
      .from(parts);

    console.log(`   • Total piezas: ${beforeStats.total}`);
    console.log(`   • Activas: ${beforeStats.activas}`);
    console.log(`   • Inactivas: ${beforeStats.inactivas}`);
    console.log(`   • Con vehículo asociado (>0): ${beforeStats.conVehiculo}`);
    console.log(`   • Procesadas (<0): ${beforeStats.procesadas}`);
    console.log(`   • Con datos de vehículo: ${beforeStats.conDatosVehiculo}`);
    console.log(`   • Con precio -1: ${beforeStats.precioMenosUno}`);

    // Activar TODAS las piezas
    console.log('\n🔄 Activando todas las piezas...');
    
    const activateResult = await db
      .update(parts)
      .set({ 
        activo: true,
        fechaActualizacion: sql`NOW()`
      })
      .where(eq(parts.activo, false));

    console.log(`✅ Activadas ${activateResult.rowCount || 0} piezas`);

    // Ver estadísticas después de activar
    console.log('\n📊 Estado DESPUÉS de activar todas las piezas:');
    
    const [afterStats] = await db
      .select({
        total: sql`COUNT(*)`,
        activas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        inactivas: sql`COUNT(CASE WHEN ${parts.activo} = false THEN 1 END)`,
        conVehiculo: sql`COUNT(CASE WHEN ${parts.idVehiculo} > 0 THEN 1 END)`,
        procesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
        conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        precioMenosUno: sql`COUNT(CASE WHEN CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = -1 THEN 1 END)`,
        procesadasActivas: sql`COUNT(CASE WHEN ${parts.activo} = true AND ${parts.idVehiculo} < 0 THEN 1 END)`,
        procesadasConDatos: sql`COUNT(CASE WHEN ${parts.activo} = true AND ${parts.idVehiculo} < 0 AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`
      })
      .from(parts);

    console.log(`   • Total piezas: ${afterStats.total}`);
    console.log(`   • Activas: ${afterStats.activas}`);
    console.log(`   • Inactivas: ${afterStats.inactivas}`);
    console.log(`   • Con vehículo asociado (>0): ${afterStats.conVehiculo}`);
    console.log(`   • Procesadas (<0): ${afterStats.procesadas}`);
    console.log(`   • Con datos de vehículo: ${afterStats.conDatosVehiculo}`);
    console.log(`   • Con precio -1: ${afterStats.precioMenosUno}`);
    console.log(`   • Procesadas activas: ${afterStats.procesadasActivas}`);
    console.log(`   • Procesadas con datos: ${afterStats.procesadasConDatos}`);

    // Análisis detallado de piezas procesadas
    console.log('\n🔍 Análisis detallado de piezas procesadas:');
    
    const processedSample = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio,
        activo: parts.activo,
        descripcionFamilia: parts.descripcionFamilia
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`
        )
      )
      .limit(10);

    console.log(`📝 Muestra de 10 piezas procesadas activas:`);
    processedSample.forEach((part, index) => {
      const hasVehicleData = part.vehicleMarca && part.vehicleMarca.trim() !== '';
      console.log(`   ${index + 1}. ${part.refLocal} (ID: ${part.idVehiculo})`);
      console.log(`      Marca: "${part.vehicleMarca}" | Modelo: "${part.vehicleModelo}"`);
      console.log(`      Precio: ${part.precio} | Datos vehículo: ${hasVehicleData ? '✅' : '❌'}`);
      console.log(`      Familia: ${part.descripcionFamilia?.substring(0, 50)}...`);
      console.log('');
    });

    // Verificar distribución por familias
    console.log('\n📊 Top 10 familias de piezas procesadas:');
    
    const familyStats = await db
      .select({
        familia: parts.descripcionFamilia,
        count: sql`COUNT(*)`
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`,
          sql`${parts.descripcionFamilia} IS NOT NULL`
        )
      )
      .groupBy(parts.descripcionFamilia)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    familyStats.forEach((stat, index) => {
      console.log(`   ${index + 1}. ${stat.familia?.substring(0, 40)}... (${stat.count} piezas)`);
    });

    // Calcular tasas de éxito
    const successRate = afterStats.procesadasActivas > 0 ? 
      ((afterStats.procesadasConDatos / afterStats.procesadasActivas) * 100).toFixed(2) : '0.00';

    console.log('\n🎯 Resumen de la verificación:');
    console.log(`   • Piezas activadas: ${activateResult.rowCount || 0}`);
    console.log(`   • Total piezas procesadas activas: ${afterStats.procesadasActivas}`);
    console.log(`   • Piezas procesadas con datos de vehículo: ${afterStats.procesadasConDatos}`);
    console.log(`   • Tasa de éxito en datos de vehículo: ${successRate}%`);
    console.log(`   • Sistema de importación: ${afterStats.procesadas > 100000 ? '✅ FUNCIONANDO' : '⚠️ PENDIENTE'}`);

  } catch (error) {
    console.error('❌ Error al activar piezas:', error);
  }
}

// Ejecutar activación
activateAllParts()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  });