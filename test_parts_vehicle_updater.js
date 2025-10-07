// Script para probar el PartsVehicleUpdater mejorado con pattern matching
import fetch from 'node-fetch';

async function testPartsVehicleUpdater() {
  console.log('🧪 Probando PartsVehicleUpdater mejorado...\n');

  try {
    // Obtener estadísticas antes
    console.log('📊 Obteniendo estadísticas antes de la corrección...');
    
    const statsBefore = await fetch('http://localhost:5000/api/parts/processed-vehicles-stats');
    if (statsBefore.ok) {
      const stats = await statsBefore.json();
      console.log('📊 ESTADÍSTICAS ANTES:');
      console.log(`  Total piezas procesadas: ${stats.totalProcessed || 'N/A'}`);
      console.log(`  Con marca extraída: ${stats.withBrand || 'N/A'}`);
      console.log(`  Con modelo extraído: ${stats.withModel || 'N/A'}`);
      console.log(`  Tasa de éxito: ${stats.successRate || 'N/A'}%`);
    }

    // Ejecutar corrección
    console.log('\n🔧 Ejecutando corrección con PartsVehicleUpdater...');
    
    const response = await fetch('http://localhost:5000/api/fix-parts-vehicle-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('\n✅ Corrección completada:', result);
    
    // Esperar un momento para que se complete
    console.log('⏳ Esperando 10 segundos para que se complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Obtener estadísticas después
    console.log('\n📊 Obteniendo estadísticas después de la corrección...');
    
    const statsAfter = await fetch('http://localhost:5000/api/parts/processed-vehicles-stats');
    if (statsAfter.ok) {
      const stats = await statsAfter.json();
      console.log('📊 ESTADÍSTICAS DESPUÉS:');
      console.log(`  Total piezas procesadas: ${stats.totalProcessed || 'N/A'}`);
      console.log(`  Con marca extraída: ${stats.withBrand || 'N/A'}`);
      console.log(`  Con modelo extraído: ${stats.withModel || 'N/A'}`);
      console.log(`  Tasa de éxito: ${stats.successRate || 'N/A'}%`);
      
      if (stats.successRate > 15) {
        console.log('\n🎉 ¡GRAN MEJORA DETECTADA! El pattern matching está funcionando');
      } else {
        console.log('\n⚠️ Mejora modesta, puede necesitar más ajustes');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPartsVehicleUpdater();