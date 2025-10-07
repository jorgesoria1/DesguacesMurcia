/**
 * Script para probar la importación completa con corrección automática
 * de datos de vehículo para piezas procesadas
 */

console.log('🚀 Iniciando prueba completa de importación con corrección automática...');

async function testCompleteVehicleImport() {
  try {
    // Verificar estado inicial
    console.log('📊 Verificando estado inicial de piezas procesadas...');
    
    const initialResponse = await fetch('http://localhost:5000/api/search-parts?vehicleType=processed&limit=5');
    if (!initialResponse.ok) {
      throw new Error(`Error verificando estado inicial: ${initialResponse.status}`);
    }
    
    const initialData = await initialResponse.json();
    let initialWithVehicleData = 0;
    
    if (initialData.data && initialData.data.length > 0) {
      initialWithVehicleData = initialData.data.filter(part => 
        part.vehicleMarca && part.vehicleMarca.trim() !== '' && 
        !part.vehicleMarca.match(/^\d+$/) // No códigos numéricos
      ).length;
    }
    
    console.log(`📋 Estado inicial: ${initialWithVehicleData}/${initialData.data?.length || 0} piezas con datos de vehículo válidos`);
    
    // Hacer una importación de prueba
    console.log('\n📤 Iniciando importación de prueba...');
    
    const importResponse = await fetch('http://localhost:5000/api/metasync-optimized/import/parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'incremental',
        limit: 20 // Importar 20 piezas para prueba más amplia
      })
    });
    
    if (!importResponse.ok) {
      throw new Error(`HTTP ${importResponse.status}: ${importResponse.statusText}`);
    }
    
    const importResult = await importResponse.json();
    console.log('✅ Importación iniciada:', importResult.message);
    
    // Esperar a que la importación se complete (máximo 30 segundos)
    console.log('⏳ Esperando a que la importación se complete...');
    let attempts = 0;
    const maxAttempts = 15; // 30 segundos
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      // Verificar si la importación terminó mirando los logs
      try {
        const statusResponse = await fetch('http://localhost:5000/api/import/history?limit=1');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.imports && statusData.imports.length > 0) {
            const latestImport = statusData.imports[0];
            if (latestImport.status === 'completed' || latestImport.status === 'failed') {
              console.log(`📊 Importación ${latestImport.status}: ${latestImport.processingItem || 'Completada'}`);
              break;
            }
          }
        }
      } catch (statusError) {
        console.log(`⏳ Intento ${attempts}/${maxAttempts} - Importación en progreso...`);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️ Tiempo de espera agotado, verificando resultados actuales...');
    }
    
    // Verificar resultados después de la importación
    console.log('\n🔍 Verificando resultados después de la importación...');
    
    const finalResponse = await fetch('http://localhost:5000/api/search-parts?vehicleType=processed&limit=10');
    if (!finalResponse.ok) {
      throw new Error(`Error verificando resultados finales: ${finalResponse.status}`);
    }
    
    const finalData = await finalResponse.json();
    
    if (finalData.data && finalData.data.length > 0) {
      console.log('\n📋 RESULTADOS DESPUÉS DE LA IMPORTACIÓN:');
      console.log('='.repeat(70));
      
      let finalWithVehicleData = 0;
      let directExtractionCount = 0;
      let updaterCorrectionCount = 0;
      
      finalData.data.forEach((part, index) => {
        const hasValidVehicleData = part.vehicleMarca && 
          part.vehicleMarca.trim() !== '' && 
          !part.vehicleMarca.match(/^\d+$/); // No códigos numéricos
        
        console.log(`\nPieza ${index + 1}:`);
        console.log(`  RefLocal: ${part.refLocal}`);
        console.log(`  Descripción: ${part.descripcionArticulo}`);
        console.log(`  Marca: '${part.vehicleMarca || 'NO DEFINIDA'}'`);
        console.log(`  Modelo: '${part.vehicleModelo || 'NO DEFINIDO'}'`);
        console.log(`  Activo: ${part.activo}`);
        
        if (hasValidVehicleData) {
          finalWithVehicleData++;
          
          // Determinar si es extracción directa o corrección posterior
          if (part.vehicleMarca && part.vehicleMarca.includes(' ')) {
            // Probablemente extracción directa de descripcionFamilia
            directExtractionCount++;
            console.log(`  ✅ EXTRACCIÓN DIRECTA DE API`);
          } else {
            // Probablemente corrección por PartsVehicleUpdater
            updaterCorrectionCount++;
            console.log(`  ✅ CORRECCIÓN AUTOMÁTICA`);
          }
        } else {
          console.log(`  ❌ SIN DATOS DE VEHÍCULO VÁLIDOS`);
        }
      });
      
      console.log('\n📈 ESTADÍSTICAS FINALES:');
      console.log('='.repeat(70));
      console.log(`Estado inicial: ${initialWithVehicleData}/${initialData.data?.length || 0} piezas con datos válidos`);
      console.log(`Estado final: ${finalWithVehicleData}/${finalData.data.length} piezas con datos válidos`);
      console.log(`Extracción directa de API: ${directExtractionCount} piezas`);
      console.log(`Corrección automática: ${updaterCorrectionCount} piezas`);
      console.log(`Mejora total: ${finalWithVehicleData - initialWithVehicleData} piezas`);
      console.log(`Tasa de éxito final: ${((finalWithVehicleData / finalData.data.length) * 100).toFixed(1)}%`);
      
      if (finalWithVehicleData > initialWithVehicleData) {
        console.log('\n🎉 ¡ÉXITO! El sistema de corrección automática está funcionando correctamente');
        console.log('✅ La combinación de extracción directa + corrección automática está mejorando los datos');
      } else if (finalWithVehicleData === initialWithVehicleData) {
        console.log('\n⚠️ ESTABLE: No se detectaron cambios, el sistema mantiene los datos existentes');
      } else {
        console.log('\n❌ PROBLEMA: Se perdieron datos de vehículo durante la importación');
      }
      
    } else {
      console.log('❌ No se encontraron piezas procesadas para verificar');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba completa:', error.message);
  }
}

testCompleteVehicleImport().then(() => {
  console.log('\n✅ Prueba completa de importación finalizada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});