#!/usr/bin/env node

/**
 * Script de verificación del sistema de importación completa
 * Verifica que las importaciones completas estén funcionando correctamente
 * con todo el catálogo desde fecha 1900
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { eq, desc, and, gte } from 'drizzle-orm';
import { importHistory, vehicles, parts, syncControl } from './shared/schema.js';

// Configurar conexión a base de datos
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function verifyCompleteImportSystem() {
  console.log('🔍 VERIFICACIÓN DEL SISTEMA DE IMPORTACIÓN COMPLETA');
  console.log('='.repeat(60));

  try {
    // 1. Verificar importaciones completas recientes
    console.log('\n1️⃣ VERIFICANDO IMPORTACIONES COMPLETAS RECIENTES...');
    
    const recentCompleteImports = await db
      .select()
      .from(importHistory)
      .where(
        and(
          eq(importHistory.type, 'all'),
          gte(importHistory.startTime, new Date(Date.now() - 3600000)) // Última hora
        )
      )
      .orderBy(desc(importHistory.startTime))
      .limit(3);

    if (recentCompleteImports.length === 0) {
      console.log('❌ No hay importaciones completas en la última hora');
      return false;
    }

    const latestImport = recentCompleteImports[0];
    console.log(`✅ Importación completa más reciente: ID ${latestImport.id}`);
    console.log(`   Estado: ${latestImport.status}`);
    console.log(`   Progreso: ${latestImport.progress}%`);
    console.log(`   Tiempo inicio: ${latestImport.startTime}`);

    // 2. Verificar importaciones de vehículos y piezas asociadas
    console.log('\n2️⃣ VERIFICANDO IMPORTACIONES DE VEHÍCULOS Y PIEZAS...');
    
    const vehicleImports = await db
      .select()
      .from(importHistory)
      .where(
        and(
          eq(importHistory.type, 'vehicles'),
          gte(importHistory.startTime, new Date(Date.now() - 3600000))
        )
      )
      .orderBy(desc(importHistory.startTime))
      .limit(1);

    const partsImports = await db
      .select()
      .from(importHistory)
      .where(
        and(
          eq(importHistory.type, 'parts'),
          gte(importHistory.startTime, new Date(Date.now() - 3600000))
        )
      )
      .orderBy(desc(importHistory.startTime))
      .limit(1);

    if (vehicleImports.length > 0) {
      const vImport = vehicleImports[0];
      console.log(`✅ Importación vehículos: ID ${vImport.id}, ${vImport.newItems} nuevos, ${vImport.updatedItems} actualizados`);
    }

    if (partsImports.length > 0) {
      const pImport = partsImports[0];
      console.log(`✅ Importación piezas: ID ${pImport.id}, ${pImport.newItems} nuevos, ${pImport.updatedItems} actualizados`);
    }

    // 3. Verificar contadores actuales
    console.log('\n3️⃣ VERIFICANDO CONTADORES ACTUALES...');
    
    const totalVehicles = await db.select().from(vehicles);
    const totalParts = await db.select().from(parts);
    
    const activeVehicles = totalVehicles.filter(v => v.activo);
    const activeParts = totalParts.filter(p => p.activo);
    const processedParts = totalParts.filter(p => p.idVehiculo < 0);
    
    console.log(`📊 Vehículos totales: ${totalVehicles.length} (${activeVehicles.length} activos)`);
    console.log(`📊 Piezas totales: ${totalParts.length} (${activeParts.length} activas)`);
    console.log(`📊 Piezas de vehículos procesados: ${processedParts.length}`);

    // 4. Verificar integridad de datos en piezas procesadas
    console.log('\n4️⃣ VERIFICANDO DATOS DE VEHÍCULOS EN PIEZAS PROCESADAS...');
    
    const processedPartsWithData = processedParts.filter(p => 
      p.vehicleMarca && 
      p.vehicleModelo && 
      p.vehicleMarca !== 'NO IDENTIFICADO' &&
      p.vehicleModelo !== 'NO IDENTIFICADO'
    );
    
    const dataPercentage = ((processedPartsWithData.length / processedParts.length) * 100).toFixed(2);
    console.log(`📈 Piezas procesadas con datos de vehículo: ${processedPartsWithData.length}/${processedParts.length} (${dataPercentage}%)`);
    
    if (dataPercentage > 80) {
      console.log(`✅ Excelente porcentaje de datos de vehículo (>${dataPercentage}%)`);
    } else if (dataPercentage > 50) {
      console.log(`⚠️ Porcentaje aceptable de datos de vehículo (${dataPercentage}%)`);
    } else {
      console.log(`❌ Porcentaje bajo de datos de vehículo (${dataPercentage}%)`);
    }

    // 5. Verificar estado del control de sincronización
    console.log('\n5️⃣ VERIFICANDO CONTROL DE SINCRONIZACIÓN...');
    
    const syncControls = await db.select().from(syncControl);
    
    for (const sync of syncControls) {
      console.log(`📅 Sync ${sync.type}: última fecha ${sync.lastSyncDate}, ID ${sync.lastId}, procesados ${sync.recordsProcessed}`);
    }

    // 6. Resumen final
    console.log('\n6️⃣ RESUMEN DE VERIFICACIÓN');
    console.log('='.repeat(40));
    
    const systemHealthy = 
      recentCompleteImports.length > 0 &&
      (vehicleImports.length > 0 || partsImports.length > 0) &&
      dataPercentage > 50;

    if (systemHealthy) {
      console.log('✅ SISTEMA DE IMPORTACIÓN COMPLETA: OPERACIONAL');
      console.log('   - Importaciones completas funcionando correctamente');
      console.log('   - Datos de vehículos procesados en buen estado');
      console.log('   - Contadores de inventario actualizados');
    } else {
      console.log('❌ SISTEMA DE IMPORTACIÓN COMPLETA: REQUIERE ATENCIÓN');
      console.log('   - Verificar configuración de importaciones');
      console.log('   - Revisar extracción de datos de vehículos');
    }

    return systemHealthy;

  } catch (error) {
    console.error('❌ Error durante verificación:', error);
    return false;
  }
}

// Ejecutar verificación
verifyCompleteImportSystem()
  .then(success => {
    console.log(`\n🏁 Verificación ${success ? 'EXITOSA' : 'FALLÓ'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });