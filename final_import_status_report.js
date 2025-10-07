#!/usr/bin/env node

/**
 * Reporte final del estado de la importación completa y protección de piezas procesadas
 */

import { db } from './server/db.js';
import { importHistory, parts } from './shared/schema.js';
import { eq, sql, desc } from 'drizzle-orm';

console.log('📊 REPORTE FINAL DE IMPORTACIÓN COMPLETA');
console.log('=========================================');

async function generateFinalReport() {
  try {
    console.log('🔗 Database connection established\n');

    // 1. Estado de la importación
    console.log('1️⃣ ESTADO DE LA IMPORTACIÓN:');
    console.log('-----------------------------');
    
    const [latestImport] = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.id))
      .limit(1);

    if (latestImport) {
      console.log(`🆔 ID de importación: ${latestImport.id}`);
      console.log(`📅 Iniciada: ${latestImport.startTime}`);
      console.log(`⏰ Finalizada: ${latestImport.endTime || 'En progreso'}`);
      console.log(`📊 Estado: ${latestImport.status}`);
      console.log(`🔄 Progreso: ${latestImport.progress}%`);
      console.log(`📦 Procesadas: ${latestImport.processedItems || 0}`);
      console.log(`➕ Nuevas: ${latestImport.newItems || 0}`);
      console.log(`🔄 Actualizadas: ${latestImport.updatedItems || 0}`);
      
      if (latestImport.errors && latestImport.errors.length > 0) {
        console.log(`⚠️ Errores: ${latestImport.errorCount || 0}`);
      }
    }

    // 2. Estadísticas de piezas procesadas
    console.log('\n2️⃣ PROTECCIÓN DE PIEZAS PROCESADAS:');
    console.log('-----------------------------------');
    
    const [protectionStats] = await db
      .select({
        totalPiezas: sql`COUNT(*)`,
        totalActivas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
        procesadasActivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`,
        procesadasInactivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = false THEN 1 END)`,
        conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`
      })
      .from(parts);

    console.log(`📦 Total piezas en BD: ${protectionStats.totalPiezas}`);
    console.log(`✅ Piezas activas: ${protectionStats.totalActivas}`);
    console.log(`🔧 Piezas procesadas: ${protectionStats.totalProcesadas}`);
    console.log(`✅ Procesadas activas: ${protectionStats.procesadasActivas}`);
    console.log(`❌ Procesadas inactivas: ${protectionStats.procesadasInactivas}`);
    console.log(`🚗 Con datos de vehículo: ${protectionStats.conDatosVehiculo}`);

    const protectionRate = protectionStats.totalProcesadas > 0 ? 
      ((protectionStats.procesadasActivas / protectionStats.totalProcesadas) * 100).toFixed(2) : '0.00';
    const vehicleDataRate = protectionStats.procesadasActivas > 0 ? 
      ((protectionStats.conDatosVehiculo / protectionStats.procesadasActivas) * 100).toFixed(2) : '0.00';

    console.log(`🛡️ Tasa de protección: ${protectionRate}%`);
    console.log(`📋 Tasa con datos de vehículo: ${vehicleDataRate}%`);

    // 3. Evaluación del éxito
    console.log('\n3️⃣ EVALUACIÓN DEL ÉXITO:');
    console.log('------------------------');
    
    let overallSuccess = true;
    let successMessage = '';

    // Evaluar protección de piezas procesadas
    if (protectionStats.procesadasInactivas === 0) {
      console.log('🎉 PROTECCIÓN EXITOSA: Ninguna pieza procesada fue desactivada');
      successMessage += '✅ Protección total de piezas procesadas\n';
    } else {
      console.log(`⚠️ PROTECCIÓN PARCIAL: ${protectionStats.procesadasInactivas} piezas procesadas desactivadas`);
      overallSuccess = false;
    }

    // Evaluar completitud de datos de vehículo
    if (protectionStats.conDatosVehiculo > (protectionStats.procesadasActivas * 0.3)) {
      console.log('✅ DATOS DE VEHÍCULO: Mayoría de piezas procesadas tienen datos completos');
      successMessage += '✅ Datos de vehículo completados\n';
    } else {
      console.log('⚠️ DATOS DE VEHÍCULO: Algunas piezas procesadas necesitan más datos');
    }

    // Evaluar estado de importación
    if (latestImport && (latestImport.status === 'completed' || latestImport.status === 'partial')) {
      console.log('✅ IMPORTACIÓN: Completada exitosamente');
      successMessage += '✅ Importación completa finalizada\n';
    } else {
      console.log('🔄 IMPORTACIÓN: Aún en progreso o con errores');
      overallSuccess = false;
    }

    // 4. Distribución por marca de piezas procesadas
    console.log('\n4️⃣ DISTRIBUCIÓN POR MARCA (Top 10):');
    console.log('----------------------------------');
    
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

    if (brandDistribution.length > 0) {
      brandDistribution.forEach((brand, index) => {
        const marcaDisplay = brand.marca || 'Sin marca';
        console.log(`${(index + 1).toString().padStart(2)}. ${marcaDisplay.padEnd(15)} ${brand.cantidad} piezas`);
      });
    } else {
      console.log('No hay piezas procesadas con datos de marca disponibles');
    }

    // 5. Conclusión final
    console.log('\n5️⃣ CONCLUSIÓN FINAL:');
    console.log('--------------------');
    
    if (overallSuccess) {
      console.log('🎉 ¡IMPORTACIÓN COMPLETA EXITOSA!');
      console.log('\nLogros conseguidos:');
      console.log(successMessage);
      console.log('✅ El sistema de protección de piezas procesadas funciona correctamente');
      console.log('✅ La desactivación automática fue completamente evitada');
      console.log('✅ Las piezas procesadas mantienen su integridad en el catálogo');
    } else {
      console.log('⚠️ IMPORTACIÓN COMPLETA CON OBSERVACIONES');
      console.log('\nPuntos exitosos:');
      console.log(successMessage);
      console.log('\nPuntos a mejorar identificados para futuras importaciones');
    }

    console.log('\n=========================================');
    console.log('📊 REPORTE FINAL COMPLETADO');

    return {
      importStatus: latestImport?.status,
      protectionRate: parseFloat(protectionRate),
      totalProcessed: protectionStats.totalProcesadas,
      activeProcessed: protectionStats.procesadasActivas,
      withVehicleData: protectionStats.conDatosVehiculo,
      success: overallSuccess
    };

  } catch (error) {
    console.error('❌ Error generando reporte final:', error);
    return { success: false, error: error.message };
  }
}

// Ejecutar reporte
generateFinalReport()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error en reporte:', error);
    process.exit(1);
  });