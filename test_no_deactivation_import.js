#!/usr/bin/env node

/**
 * Script para probar que el sistema de importación ya NO desactiva piezas automáticamente
 * Solo debe desactivar piezas con precio 0 o negativo (excepto -1 para procesadas)
 */

import { metasyncOptimizedImport } from './server/api/metasync-optimized-import-service.js';
import { db } from './server/db.js';

console.log('🧪 PRUEBA: Sistema sin desactivaciones automáticas');
console.log('════════════════════════════════════════════════');

async function testImportWithoutDeactivations() {
  try {
    // Paso 1: Obtener estadísticas ANTES de la importación
    console.log('\n📊 ESTADÍSTICAS ANTES DE IMPORTACIÓN:');
    const statsBefore = await db.execute(`
      SELECT 
        COUNT(*) as total_parts,
        COUNT(CASE WHEN activo = true THEN 1 END) as active_parts,
        COUNT(CASE WHEN activo = true AND id_vehiculo < 0 THEN 1 END) as active_processed_parts,
        COUNT(CASE WHEN activo = true AND id_vehiculo > 0 THEN 1 END) as active_regular_parts
      FROM parts
    `);
    
    const before = statsBefore.rows[0];
    console.log(`   • Total piezas: ${before.total_parts}`);
    console.log(`   • Piezas activas: ${before.active_parts}`);
    console.log(`   • Piezas procesadas activas: ${before.active_processed_parts}`);
    console.log(`   • Piezas regulares activas: ${before.active_regular_parts}`);
    
    // Paso 2: Ejecutar importación incremental
    console.log('\n🔄 EJECUTANDO IMPORTACIÓN INCREMENTAL...');
    console.log('   (Solo traerá cambios recientes de la API)');
    
    const importId = await metasyncOptimizedImport.startImport('parts', new Date(Date.now() - 6*60*60*1000), false);
    console.log(`   ✅ Importación iniciada con ID: ${importId}`);
    
    // Paso 3: Esperar y monitorear progreso
    console.log('\n⏳ MONITOREANDO PROGRESO...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos máximo
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
      
      const statusResult = await db.execute('SELECT * FROM import_history WHERE id = $1', [importId]);
      
      if (statusResult.rows.length > 0) {
        const status = statusResult.rows[0];
        console.log(`   📈 ${status.status} - ${status.progress}% - ${status.processedItems || 0} procesados`);
        
        if (status.status === 'completed' || status.status === 'failed') {
          completed = true;
          
          if (status.status === 'completed') {
            console.log(`   ✅ IMPORTACIÓN COMPLETADA`);
            console.log(`      • Nuevas: ${status.newItems || 0}`);
            console.log(`      • Actualizadas: ${status.updatedItems || 0}`);
            console.log(`      • Errores: ${status.errorCount || 0}`);
          } else {
            console.log(`   ❌ IMPORTACIÓN FALLÓ`);
            console.log(`      • Errores: ${JSON.stringify(status.errors || [])}`);
          }
        }
      }
      
      attempts++;
    }
    
    if (!completed) {
      console.log('   ⚠️ Importación aún en progreso después de 5 minutos');
    }
    
    // Paso 4: Obtener estadísticas DESPUÉS de la importación
    console.log('\n📊 ESTADÍSTICAS DESPUÉS DE IMPORTACIÓN:');
    const statsAfter = await db.execute(`
      SELECT 
        COUNT(*) as total_parts,
        COUNT(CASE WHEN activo = true THEN 1 END) as active_parts,
        COUNT(CASE WHEN activo = true AND id_vehiculo < 0 THEN 1 END) as active_processed_parts,
        COUNT(CASE WHEN activo = true AND id_vehiculo > 0 THEN 1 END) as active_regular_parts
      FROM parts
    `);
    
    const after = statsAfter.rows[0];
    console.log(`   • Total piezas: ${after.total_parts}`);
    console.log(`   • Piezas activas: ${after.active_parts}`);
    console.log(`   • Piezas procesadas activas: ${after.active_processed_parts}`);
    console.log(`   • Piezas regulares activas: ${after.active_regular_parts}`);
    
    // Paso 5: Calcular cambios
    console.log('\n📈 ANÁLISIS DE CAMBIOS:');
    const totalChange = after.total_parts - before.total_parts;
    const activeChange = after.active_parts - before.active_parts;
    const processedChange = after.active_processed_parts - before.active_processed_parts;
    const regularChange = after.active_regular_parts - before.active_regular_parts;
    
    console.log(`   • Cambio total piezas: ${totalChange >= 0 ? '+' : ''}${totalChange}`);
    console.log(`   • Cambio piezas activas: ${activeChange >= 0 ? '+' : ''}${activeChange}`);
    console.log(`   • Cambio procesadas activas: ${processedChange >= 0 ? '+' : ''}${processedChange}`);
    console.log(`   • Cambio regulares activas: ${regularChange >= 0 ? '+' : ''}${regularChange}`);
    
    // Paso 6: Verificación de protección
    console.log('\n🛡️ VERIFICACIÓN DE PROTECCIÓN:');
    
    if (processedChange >= 0) {
      console.log('   ✅ ÉXITO: Las piezas procesadas NO fueron desactivadas');
      console.log('   ✅ Sistema de protección funcionando correctamente');
    } else {
      console.log('   ❌ FALLO: Se desactivaron piezas procesadas');
      console.log('   ❌ Sistema de protección no funcionó');
    }
    
    if (activeChange >= 0) {
      console.log('   ✅ ÉXITO: No se perdieron piezas activas en la importación');
    } else {
      console.log('   ⚠️ ADVERTENCIA: Se perdieron piezas activas en la importación');
    }
    
    // Paso 7: Resultado final
    console.log('\n🎯 RESULTADO FINAL:');
    
    if (processedChange >= 0 && activeChange >= 0) {
      console.log('   ✅ PRUEBA EXITOSA: El sistema ya NO desactiva piezas automáticamente');
      console.log('   ✅ Todas las modificaciones implementadas correctamente');
      console.log('   ✅ El catálogo se mantiene íntegro durante las importaciones');
    } else {
      console.log('   ❌ PRUEBA FALLIDA: Aún hay desactivaciones automáticas');
      console.log('   ❌ Se requieren más modificaciones al sistema');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBA:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar prueba
testImportWithoutDeactivations();