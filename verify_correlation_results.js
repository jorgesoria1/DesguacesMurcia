#!/usr/bin/env node

// Script para verificar el éxito de la correlación API implementada
const { spawn } = require('child_process');

function execSQL(query) {
  return new Promise((resolve, reject) => {
    const psql = spawn('psql', [process.env.DATABASE_URL, '-c', query, '--csv']);
    let output = '';
    
    psql.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    psql.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`psql exited with code ${code}`));
      }
    });
  });
}

async function verifyCorrelationResults() {
  console.log('🔍 VERIFICANDO RESULTADOS DE LA CORRELACIÓN API\n');
  
  try {
    // 1. Estado de la importación 1667
    console.log('📊 ESTADO DE LA IMPORTACIÓN 1667:');
    const importStatus = await execSQL(`
      SELECT id, status, progress, total_items, processed_items, new_items, updated_items, processing_item
      FROM import_history 
      WHERE id = 1667;
    `);
    console.log(importStatus);
    console.log();
    
    // 2. Estadísticas generales de piezas procesadas
    console.log('📈 ESTADÍSTICAS PIEZAS PROCESADAS (ID_VEHICULO < 0):');
    const processedStats = await execSQL(`
      SELECT 
        COUNT(*) as total_piezas_procesadas,
        COUNT(CASE WHEN vehicle_marca IS NOT NULL AND vehicle_marca != '' THEN 1 END) as con_datos_vehiculo,
        COUNT(CASE WHEN vehicle_marca IS NULL OR vehicle_marca = '' THEN 1 END) as sin_datos_vehiculo,
        ROUND(
          (COUNT(CASE WHEN vehicle_marca IS NOT NULL AND vehicle_marca != '' THEN 1 END) * 100.0 / COUNT(*)), 
          2
        ) as porcentaje_exito
      FROM parts 
      WHERE id_vehiculo < 0 AND activo = true;
    `);
    console.log(processedStats);
    console.log();
    
    // 3. Piezas con datos extraídos recientemente
    console.log('🆕 PIEZAS PROCESADAS CON DATOS RECIENTES (ÚLTIMA HORA):');
    const recentlyUpdated = await execSQL(`
      SELECT 
        COUNT(*) as piezas_actualizadas_recientes,
        COUNT(CASE WHEN vehicle_marca IS NOT NULL AND vehicle_marca != '' THEN 1 END) as con_datos_vehiculo_nuevos
      FROM parts 
      WHERE id_vehiculo < 0 
        AND activo = true 
        AND ultima_sincronizacion >= NOW() - INTERVAL '1 hour';
    `);
    console.log(recentlyUpdated);
    console.log();
    
    // 4. Muestra de piezas con datos de vehículo exitosos
    console.log('✅ MUESTRA DE PIEZAS CON CORRELACIÓN EXITOSA:');
    const successfulSamples = await execSQL(`
      SELECT ref_local, id_vehiculo, vehicle_marca, vehicle_modelo, vehicle_version
      FROM parts 
      WHERE id_vehiculo < 0 
        AND activo = true 
        AND vehicle_marca IS NOT NULL 
        AND vehicle_marca != ''
        AND ultima_sincronizacion >= NOW() - INTERVAL '1 hour'
      LIMIT 10;
    `);
    console.log(successfulSamples);
    console.log();
    
    // 5. Distribución de marcas encontradas
    console.log('🚗 DISTRIBUCIÓN DE MARCAS EN PIEZAS PROCESADAS:');
    const brandDistribution = await execSQL(`
      SELECT vehicle_marca, COUNT(*) as cantidad
      FROM parts 
      WHERE id_vehiculo < 0 
        AND activo = true 
        AND vehicle_marca IS NOT NULL 
        AND vehicle_marca != ''
      GROUP BY vehicle_marca
      ORDER BY cantidad DESC
      LIMIT 15;
    `);
    console.log(brandDistribution);
    console.log();
    
    // 6. Verificar si hay mejora significativa
    const lines = processedStats.split('\n');
    if (lines.length >= 2) {
      const data = lines[1].split(',');
      const successRate = parseFloat(data[3]);
      
      console.log('🎯 EVALUACIÓN DE RESULTADOS:');
      console.log(`Tasa de éxito actual: ${successRate}%`);
      
      if (successRate > 50) {
        console.log('🎉 ¡ÉXITO TOTAL! La correlación con el array API está funcionando perfectamente');
      } else if (successRate > 20) {
        console.log('✅ Mejora significativa detectada, la correlación está parcialmente funcionando');
      } else if (successRate > 10) {
        console.log('⚡ Mejora marginal, la correlación necesita más ajustes');
      } else {
        console.log('⚠️ No se detectó mejora significativa, revisar implementación');
      }
    }
    
  } catch (error) {
    console.error('❌ Error al verificar resultados:', error.message);
  }
}

verifyCorrelationResults();