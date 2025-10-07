/**
 * Script para probar y comparar el rendimiento de importación
 * Base vacía vs Base con datos existentes
 */

const { db } = require('./server/db.js');
const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service.js');

async function testImportPerformance() {
  console.log('🚀 INICIANDO PRUEBA COMPARATIVA DE RENDIMIENTO');
  console.log('='.repeat(60));
  
  const importService = new MetasyncOptimizedImportService();
  await importService.configure();
  
  // Test 1: Importación en base vacía (simulación con datos pequeños)
  console.log('\n📊 TEST 1: Importación en Base Vacía');
  console.log('-'.repeat(40));
  
  const startTime1 = Date.now();
  
  // Crear datos simulados para el test
  const testVehicles = Array.from({ length: 1000 }, (_, i) => ({
    idLocal: i + 1,
    idEmpresa: 1236,
    descripcion: `Vehículo Test ${i + 1}`,
    marca: 'Toyota',
    modelo: 'Corolla',
    version: '1.8',
    anyo: 2020,
    combustible: 'Gasolina',
    bastidor: `VIN${i + 1}`,
    matricula: `TEST${i + 1}`,
    color: 'Blanco',
    kilometraje: 50000,
    potencia: 120,
    puertas: 4,
    imagenes: ['https://example.com/image1.jpg'],
    activo: true,
    fechaActualizacion: new Date()
  }));
  
  try {
    const result1 = await importService.processVehicleBatch(testVehicles);
    const endTime1 = Date.now();
    const duration1 = (endTime1 - startTime1) / 1000;
    const speed1 = testVehicles.length / duration1;
    
    console.log(`✅ Resultado Test 1 (Base Vacía):`);
    console.log(`   - Vehículos procesados: ${testVehicles.length}`);
    console.log(`   - Insertados: ${result1.inserted}`);
    console.log(`   - Actualizados: ${result1.updated}`);
    console.log(`   - Tiempo: ${duration1.toFixed(2)} segundos`);
    console.log(`   - Velocidad: ${speed1.toFixed(2)} vehículos/segundo`);
    console.log(`   - Errores: ${result1.errorMessages.length}`);
    
    // Test 2: Importación con datos existentes (mismos datos, debería hacer UPDATE)
    console.log('\n📊 TEST 2: Importación con Datos Existentes');
    console.log('-'.repeat(40));
    
    const startTime2 = Date.now();
    
    // Modificar ligeramente los datos para simular actualizaciones
    const updatedVehicles = testVehicles.map(v => ({
      ...v,
      descripcion: `${v.descripcion} (Actualizado)`,
      kilometraje: v.kilometraje + 1000,
      fechaActualizacion: new Date()
    }));
    
    const result2 = await importService.processVehicleBatch(updatedVehicles);
    const endTime2 = Date.now();
    const duration2 = (endTime2 - startTime2) / 1000;
    const speed2 = updatedVehicles.length / duration2;
    
    console.log(`✅ Resultado Test 2 (Con Datos Existentes):`);
    console.log(`   - Vehículos procesados: ${updatedVehicles.length}`);
    console.log(`   - Insertados: ${result2.inserted}`);
    console.log(`   - Actualizados: ${result2.updated}`);
    console.log(`   - Tiempo: ${duration2.toFixed(2)} segundos`);
    console.log(`   - Velocidad: ${speed2.toFixed(2)} vehículos/segundo`);
    console.log(`   - Errores: ${result2.errorMessages.length}`);
    
    // Comparación
    console.log('\n📈 COMPARACIÓN DE RENDIMIENTO');
    console.log('='.repeat(60));
    const speedRatio = speed1 / speed2;
    const timeDifference = ((duration2 - duration1) / duration1) * 100;
    
    console.log(`🏁 Base Vacía:        ${speed1.toFixed(2)} veh/seg`);
    console.log(`🏁 Con Datos:         ${speed2.toFixed(2)} veh/seg`);
    console.log(`📊 Ratio:             ${speedRatio.toFixed(2)}x ${speedRatio > 1 ? 'más lenta' : 'más rápida'}`);
    console.log(`⏱️  Diferencia tiempo: ${timeDifference >= 0 ? '+' : ''}${timeDifference.toFixed(1)}%`);
    
    if (speedRatio < 2) {
      console.log('✅ OPTIMIZACIÓN EXITOSA: Diferencia de rendimiento mínima');
    } else if (speedRatio < 5) {
      console.log('⚠️  OPTIMIZACIÓN PARCIAL: Aún hay diferencias significativas');
    } else {
      console.log('❌ OPTIMIZACIÓN INSUFICIENTE: Grandes diferencias de rendimiento');
    }
    
    // Análisis de fragmentación
    console.log('\n🔍 ANÁLISIS DE FRAGMENTACIÓN');
    console.log('-'.repeat(40));
    
    const stats = await db.execute(`
      SELECT 
        n_live_tup as vivas,
        n_dead_tup as muertas,
        CASE 
          WHEN n_live_tup > 0 
          THEN CAST((n_dead_tup::float / n_live_tup) * 100 AS DECIMAL(10,2))
          ELSE 0 
        END as fragmentacion_porcentaje
      FROM pg_stat_user_tables 
      WHERE relname = 'vehicles'
    `);
    
    if (stats.rows && stats.rows.length > 0) {
      const stat = stats.rows[0];
      console.log(`   - Filas vivas: ${stat.vivas}`);
      console.log(`   - Filas muertas: ${stat.muertas}`);
      console.log(`   - Fragmentación: ${stat.fragmentacion_porcentaje}%`);
      
      if (stat.fragmentacion_porcentaje > 20) {
        console.log('⚠️  RECOMENDACIÓN: Ejecutar VACUUM para reducir fragmentación');
      }
    }
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testImportPerformance()
    .then(() => {
      console.log('\n🎯 Pruebas completadas');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testImportPerformance };