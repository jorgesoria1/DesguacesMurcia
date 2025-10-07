#!/usr/bin/env node

/**
 * Script para monitorear el progreso de la importación actual
 */

import { db } from './server/db.js';
import { importHistory, parts } from './shared/schema.js';
import { eq, sql, desc } from 'drizzle-orm';

console.log('📊 Monitoreando progreso de importación...');

async function monitorImportProgress() {
  try {
    // Obtener la importación más reciente
    const [latestImport] = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.id))
      .limit(1);

    if (!latestImport) {
      console.log('❌ No se encontraron importaciones');
      return;
    }

    console.log(`\n🔍 Importación ID: ${latestImport.id}`);
    console.log(`📅 Iniciada: ${latestImport.startTime}`);
    console.log(`📊 Estado: ${latestImport.status}`);
    console.log(`🔄 Progreso: ${latestImport.progress}%`);
    console.log(`📦 Procesados: ${latestImport.processedItems || 0}`);
    console.log(`➕ Nuevos: ${latestImport.newItems || 0}`);
    console.log(`🔄 Actualizados: ${latestImport.updatedItems || 0}`);
    console.log(`⚡ Acción actual: ${latestImport.processingItem || 'N/A'}`);

    if (latestImport.status === 'completed' || latestImport.status === 'failed' || latestImport.status === 'partial') {
      console.log(`\n✅ Importación ${latestImport.status.toUpperCase()}`);
      
      // Verificar estado de piezas procesadas
      console.log('\n📊 Verificando estado de piezas procesadas...');
      
      const [stats] = await db
        .select({
          totalPiezas: sql`COUNT(*)`,
          totalActivas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
          totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
          procesadasActivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`,
          conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`
        })
        .from(parts);

      console.log(`\n📈 Estadísticas finales:`);
      console.log(`   • Total piezas: ${stats.totalPiezas}`);
      console.log(`   • Piezas activas: ${stats.totalActivas}`);
      console.log(`   • Piezas procesadas: ${stats.totalProcesadas}`);
      console.log(`   • Procesadas activas: ${stats.procesadasActivas}`);
      console.log(`   • Con datos de vehículo: ${stats.conDatosVehiculo}`);

      // Verificar éxito de la protección
      const successRate = stats.totalProcesadas > 0 ? 
        ((stats.procesadasActivas / stats.totalProcesadas) * 100).toFixed(2) : '0.00';
      
      console.log(`\n🎯 Análisis de protección:`);
      console.log(`   • Tasa de piezas procesadas activas: ${successRate}%`);
      
      if (stats.procesadasActivas > 90000) {
        console.log(`   🎉 ¡ÉXITO TOTAL! Las piezas procesadas se mantuvieron activas`);
      } else if (stats.procesadasActivas > 50000) {
        console.log(`   ✅ ÉXITO PARCIAL: La mayoría de piezas procesadas están activas`);
      } else {
        console.log(`   ⚠️ PROBLEMA: Muchas piezas procesadas fueron desactivadas`);
      }

      // Mostrar muestra de piezas procesadas activas
      console.log(`\n🔍 Muestra de piezas procesadas activas:`);
      
      const sampleProcessed = await db
        .select({
          refLocal: parts.refLocal,
          idVehiculo: parts.idVehiculo,
          vehicleMarca: parts.vehicleMarca,
          vehicleModelo: parts.vehicleModelo,
          precio: parts.precio
        })
        .from(parts)
        .where(
          sql`${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != ''`
        )
        .limit(5);

      sampleProcessed.forEach((part, index) => {
        console.log(`   ${index + 1}. ${part.refLocal} - ${part.vehicleMarca} ${part.vehicleModelo} (€${part.precio})`);
      });

    } else {
      console.log(`\n🔄 Importación en progreso... Estado: ${latestImport.status}`);
      
      if (latestImport.errors && latestImport.errors.length > 0) {
        console.log(`\n⚠️ Errores encontrados (${latestImport.errorCount}):`);
        latestImport.errors.slice(0, 3).forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
        if (latestImport.errors.length > 3) {
          console.log(`   ... y ${latestImport.errors.length - 3} errores más`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error monitoreando importación:', error);
  }
}

// Ejecutar monitoreo
monitorImportProgress()
  .then(() => {
    console.log('\n✅ Monitoreo completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en monitoreo:', error);
    process.exit(1);
  });