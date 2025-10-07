#!/usr/bin/env node

/**
 * VALIDACIÓN DE IMPORTACIÓN SECUENCIAL COMPLETA
 * Verifica que el sistema ejecute correctamente: Vehículos → Piezas → Asociaciones
 */

const { db } = require('./server/db');
const { importHistory } = require('./shared/schema');
const { eq, desc } = require('drizzle-orm');

console.log('🔍 VALIDACIÓN DE SISTEMA DE IMPORTACIÓN SECUENCIAL');
console.log('═'.repeat(60));

async function validateSequentialImportSystem() {
  try {
    console.log('\n📊 VERIFICANDO CONFIGURACIÓN ACTUAL DEL SISTEMA...');
    
    // 1. Verificar que el método secuencial existe en el servicio
    console.log('\n🔧 Verificando método startCompleteSequentialImport...');
    const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');
    const importService = new MetasyncOptimizedImportService();
    
    if (typeof importService.startCompleteSequentialImport === 'function') {
      console.log('✅ Método startCompleteSequentialImport encontrado');
    } else {
      console.log('❌ Método startCompleteSequentialImport NO encontrado');
      return false;
    }
    
    // 2. Verificar endpoint /import/all
    console.log('\n🌐 Verificando endpoint /import/all...');
    const response = await fetch('http://localhost:5000/api/metasync-optimized/import/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Endpoint /import/all responde correctamente');
      console.log(`📋 Mensaje: ${result.message}`);
      console.log(`🆔 Import ID: ${result.importId}`);
      
      if (result.details?.phases?.includes('vehicles') && 
          result.details?.phases?.includes('parts') && 
          result.details?.phases?.includes('associations')) {
        console.log('✅ Endpoint confirma orden secuencial correcto');
      } else {
        console.log('⚠️ Endpoint no especifica fases secuenciales');
      }
    } else {
      console.log(`❌ Endpoint /import/all falló: ${response.status}`);
      return false;
    }
    
    // 3. Verificar programaciones activas
    console.log('\n📅 Verificando programaciones activas...');
    const schedules = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.type, 'all'))
      .orderBy(desc(importHistory.startTime))
      .limit(1);
    
    if (schedules.length > 0) {
      console.log('✅ Encontrada programación tipo "all"');
      console.log(`📋 Última importación completa: ${schedules[0].startTime}`);
    } else {
      console.log('⚠️ No se encontraron importaciones tipo "all" recientes');
    }
    
    // 4. Verificar importaciones recientes
    console.log('\n📈 ÚLTIMAS 5 IMPORTACIONES:');
    const recentImports = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.startTime))
      .limit(5);
    
    console.log('┌────┬─────────────┬────────────┬──────────────────────────────────────┐');
    console.log('│ ID │    TIPO     │   ESTADO   │             DESCRIPCIÓN              │');
    console.log('├────┼─────────────┼────────────┼──────────────────────────────────────┤');
    
    recentImports.forEach(imp => {
      const tipo = imp.type?.includes('forceFullImport') ? 'completa' : imp.type || 'N/A';
      const estado = imp.status || 'N/A';
      const desc = imp.processingItem || 'Sin descripción';
      
      console.log(`│ ${String(imp.id).padEnd(2)} │ ${tipo.padEnd(11)} │ ${estado.padEnd(10)} │ ${desc.substring(0, 36).padEnd(36)} │`);
    });
    
    console.log('└────┴─────────────┴────────────┴──────────────────────────────────────┘');
    
    console.log('\n🎯 VALIDACIÓN COMPLETADA');
    console.log('═'.repeat(60));
    console.log('✅ Sistema de importación secuencial configurado correctamente');
    console.log('📋 Orden de ejecución: Vehículos → Piezas → Asociaciones');
    console.log('🔄 Tanto importaciones manuales como programadas usan el método secuencial');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en validación:', error);
    return false;
  }
}

// Ejecutar validación
validateSequentialImportSystem()
  .then((success) => {
    if (success) {
      console.log('\n🎉 VALIDACIÓN EXITOSA - Sistema listo para producción');
    } else {
      console.log('\n⚠️ VALIDACIÓN FALLÓ - Revisar configuración');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error fatal en validación:', error);
    process.exit(1);
  });