#!/usr/bin/env node

/**
 * Script para verificar que las piezas procesadas están protegidas correctamente
 */

import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { sql } from 'drizzle-orm';

console.log('🔍 Verificando protección de piezas procesadas...');

async function verifyProcessedPartsProtection() {
  try {
    console.log('🔗 Database connection established');

    // Estadísticas generales
    const [generalStats] = await db
      .select({
        totalPiezas: sql`COUNT(*)`,
        totalActivas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
        procesadasActivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`,
        procesadasInactivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = false THEN 1 END)`,
        conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        conPrecioMenosUno: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.precio} = '-1' THEN 1 END)`
      })
      .from(parts);

    console.log('\n📊 Estadísticas de Piezas Procesadas:');
    console.log('=====================================');
    console.log(`📦 Total piezas en BD: ${generalStats.totalPiezas}`);
    console.log(`✅ Piezas activas: ${generalStats.totalActivas}`);
    console.log(`🔧 Piezas procesadas: ${generalStats.totalProcesadas}`);
    console.log(`✅ Procesadas activas: ${generalStats.procesadasActivas}`);
    console.log(`❌ Procesadas inactivas: ${generalStats.procesadasInactivas}`);
    console.log(`🚗 Con datos de vehículo: ${generalStats.conDatosVehiculo}`);
    console.log(`💰 Con precio -1 (válido): ${generalStats.conPrecioMenosUno}`);

    // Calcular porcentajes
    if (generalStats.totalProcesadas > 0) {
      const protectionRate = ((generalStats.procesadasActivas / generalStats.totalProcesadas) * 100).toFixed(2);
      const vehicleDataRate = ((generalStats.conDatosVehiculo / generalStats.procesadasActivas) * 100).toFixed(2);
      
      console.log('\n📈 Análisis de Protección:');
      console.log('==========================');
      console.log(`🛡️ Tasa de protección: ${protectionRate}%`);
      console.log(`📋 Tasa con datos de vehículo: ${vehicleDataRate}%`);
      
      // Evaluar el éxito
      if (generalStats.procesadasActivas > 90000) {
        console.log('🎉 ¡PROTECCIÓN EXITOSA! Las piezas procesadas están correctamente preservadas');
      } else if (generalStats.procesadasActivas > 50000) {
        console.log('✅ PROTECCIÓN PARCIAL: La mayoría de piezas procesadas están activas');
      } else {
        console.log('⚠️ PROBLEMA DE PROTECCIÓN: Muchas piezas procesadas fueron desactivadas');
      }
    }

    // Muestra de piezas procesadas por marca
    console.log('\n🔍 Distribución por Marca (Top 10):');
    console.log('===================================');
    
    const brandDistribution = await db
      .select({
        marca: parts.vehicleMarca,
        cantidad: sql`COUNT(*)`
      })
      .from(parts)
      .where(
        sql`${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != ''`
      )
      .groupBy(parts.vehicleMarca)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    brandDistribution.forEach((brand, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${brand.marca?.padEnd(15)} ${brand.cantidad} piezas`);
    });

    // Muestra de piezas procesadas activas
    console.log('\n📋 Muestra de Piezas Procesadas Activas:');
    console.log('=======================================');
    
    const sampleParts = await db
      .select({
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio,
        descripcionArticulo: parts.descripcionArticulo
      })
      .from(parts)
      .where(
        sql`${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != ''`
      )
      .limit(8);

    sampleParts.forEach((part, index) => {
      const marca = part.vehicleMarca || 'N/A';
      const modelo = part.vehicleModelo || 'N/A';
      const precio = part.precio || 'N/A';
      const descripcion = (part.descripcionArticulo || '').substring(0, 30);
      
      console.log(`${(index + 1).toString().padStart(2)}. ${part.refLocal} | ${marca} ${modelo} | €${precio} | ${descripcion}`);
    });

    // Verificar piezas problemáticas
    console.log('\n⚠️ Verificando Piezas Problemáticas:');
    console.log('====================================');
    
    const problematicParts = await db
      .select({
        sinDatos: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND (${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '') THEN 1 END)`,
        preciosInvalidos: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.precio} NOT IN ('-1', '0') AND (${parts.precio} < '0' OR ${parts.precio} = '') THEN 1 END)`,
        noIdentificadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.descripcionArticulo} LIKE '%NO IDENTIFICADO%' THEN 1 END)`
      })
      .from(parts);

    console.log(`🔍 Sin datos de vehículo: ${problematicParts[0].sinDatos}`);
    console.log(`💰 Precios inválidos: ${problematicParts[0].preciosInvalidos}`);
    console.log(`❓ "NO IDENTIFICADO": ${problematicParts[0].noIdentificadas}`);

    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    
    return {
      success: generalStats.procesadasActivas > 90000,
      stats: generalStats,
      brandDistribution,
      sampleParts
    };

  } catch (error) {
    console.error('❌ Error verificando protección:', error);
    return { success: false, error: error.message };
  }
}

// Ejecutar verificación
verifyProcessedPartsProtection()
  .then((result) => {
    if (result.success) {
      console.log('\n🎉 PROTECCIÓN EXITOSA: Las piezas procesadas están correctamente preservadas');
    } else {
      console.log('\n⚠️ Se detectaron problemas en la protección de piezas procesadas');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  });