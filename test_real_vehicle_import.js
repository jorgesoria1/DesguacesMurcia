/**
 * Script para probar la importación real con la corrección de extracción de datos de vehículo
 * Importa un lote pequeño de piezas y verifica que los datos de vehículo se extraen correctamente
 */

console.log('🚀 Iniciando prueba de importación real con datos de vehículo corregidos...');

async function testRealImport() {
  try {
    // Hacer una importación de prueba usando el endpoint del administrador
    console.log('📤 Enviando solicitud de importación de piezas...');
    
    const response = await fetch('http://localhost:5000/api/metasync-optimized/import/parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'incremental',
        limit: 10 // Solo importar 10 piezas para prueba
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Importación completada');
    console.log('📊 Resultado:', {
      status: result.status,
      message: result.message,
      newParts: result.newParts,
      updatedParts: result.updatedParts
    });
    
    // Esperar un momento para que la importación se complete
    console.log('⏳ Esperando 3 segundos para que la importación se procese...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar las piezas procesadas recientes con datos de vehículo
    console.log('🔍 Verificando piezas procesadas con datos de vehículo...');
    
    const checkResponse = await fetch('http://localhost:5000/api/search-parts?vehicleType=processed&limit=5');
    if (!checkResponse.ok) {
      throw new Error(`Error verificando piezas: ${checkResponse.status}`);
    }
    
    const partsData = await checkResponse.json();
    
    if (partsData.data && partsData.data.length > 0) {
      console.log('\n📋 PIEZAS PROCESADAS ENCONTRADAS:');
      console.log('='.repeat(70));
      
      let withVehicleData = 0;
      
      partsData.data.forEach((part, index) => {
        console.log(`\nPieza ${index + 1}:`);
        console.log(`  ID: ${part.id}`);
        console.log(`  RefLocal: ${part.refLocal}`);
        console.log(`  idVehiculo: ${part.idVehiculo}`);
        console.log(`  Descripción: ${part.descripcionArticulo}`);
        console.log(`  Marca: '${part.vehicleMarca || 'NO DEFINIDA'}'`);
        console.log(`  Modelo: '${part.vehicleModelo || 'NO DEFINIDO'}'`);
        console.log(`  Precio: ${part.precio}`);
        console.log(`  Activo: ${part.activo}`);
        
        if (part.vehicleMarca && part.vehicleMarca.trim() !== '') {
          withVehicleData++;
          console.log(`  ✅ TIENE DATOS DE VEHÍCULO`);
        } else {
          console.log(`  ❌ SIN DATOS DE VEHÍCULO`);
        }
      });
      
      console.log('\n📈 ESTADÍSTICAS:');
      console.log('='.repeat(70));
      console.log(`Total piezas revisadas: ${partsData.data.length}`);
      console.log(`Piezas con datos de vehículo: ${withVehicleData}`);
      console.log(`Tasa de éxito: ${((withVehicleData / partsData.data.length) * 100).toFixed(1)}%`);
      
      if (withVehicleData > 0) {
        console.log('\n🎉 ¡ÉXITO! La corrección de extracción de datos de vehículo está funcionando');
      } else {
        console.log('\n⚠️  ADVERTENCIA: Ninguna pieza tiene datos de vehículo extraídos');
      }
      
    } else {
      console.log('❌ No se encontraron piezas procesadas para verificar');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  }
}

testRealImport().then(() => {
  console.log('\n✅ Prueba de importación real completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});