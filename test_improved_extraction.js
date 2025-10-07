// Script para probar las mejoras en extracción de datos de vehículos procesados
import fetch from 'node-fetch';

async function testImprovedExtraction() {
  console.log('🧪 Probando mejoras en extracción de datos de vehículos...\n');

  try {
    console.log('📡 Ejecutando importación manual de piezas...');
    
    const response = await fetch('http://localhost:5000/api/metasync-optimized/import/parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        incremental: true, // Importación incremental para probar
        forceUpdate: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('\n✅ Importación iniciada:', result);
    
    if (result.importId) {
      console.log(`📊 Importación ID: ${result.importId}`);
      console.log('⏳ Esperando 15 segundos para que se procese...');
      
      // Esperar 15 segundos para que se complete
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      // Verificar estado de la importación
      const statusResponse = await fetch(`http://localhost:5000/api/import/history/${result.importId}`);
      if (statusResponse.ok) {
        const importStatus = await statusResponse.json();
        console.log('\n📈 Estado de la importación:');
        console.log(`  Status: ${importStatus.status}`);
        console.log(`  Progreso: ${importStatus.progress}%`);
        console.log(`  Procesados: ${importStatus.processedItems}`);
        console.log(`  Nuevos: ${importStatus.newItems}`);
        console.log(`  Item actual: ${importStatus.processingItem}`);
      }
      
      // Verificar mejoras en extracción de datos
      console.log('\n🔍 Verificando mejoras en extracción...');
      
      const statsResponse = await fetch('http://localhost:5000/api/parts/processed-vehicles-stats');
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        console.log('\n📊 ESTADÍSTICAS POST-MEJORA:');
        console.log(`  Total piezas procesadas: ${stats.totalProcessed}`);
        console.log(`  Con marca extraída: ${stats.withBrand}`);
        console.log(`  Con modelo extraído: ${stats.withModel}`);
        console.log(`  Tasa de éxito: ${stats.successRate}%`);
        
        if (stats.successRate > 10) {
          console.log('\n🎉 ¡MEJORA DETECTADA! La tasa de éxito ha aumentado');
        } else {
          console.log('\n⚠️ La tasa de éxito sigue siendo baja, pueden necesitarse más ajustes');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testImprovedExtraction();