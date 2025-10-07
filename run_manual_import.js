// Script para ejecutar importación manual usando la API del servidor
// Compensa la importación perdida de esta madrugada

console.log('🚀 Ejecutando importación manual...');

async function runManualImport() {
  try {
    console.log('📡 Iniciando importación completa via API...');
    
    const response = await fetch('http://localhost:5000/api/import-optimized/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'all',  // Importación completa
        force: true   // Forzar importación
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Importación iniciada exitosamente:', result);
      
      // Monitorear progreso
      console.log('🔍 Monitoreando progreso...');
      setTimeout(async () => {
        try {
          const statusResponse = await fetch('http://localhost:5000/api/import-optimized/status');
          const status = await statusResponse.json();
          console.log('📊 Estado actual:', status);
        } catch (error) {
          console.log('⚠️ No se pudo obtener estado:', error.message);
        }
      }, 10000);
      
      return result;
    } else {
      const errorText = await response.text();
      console.error('❌ Error en la respuesta:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando importación manual:', error);
    
    // Fallback: verificar si hay un endpoint alternativo
    console.log('🔄 Intentando endpoint alternativo...');
    try {
      const altResponse = await fetch('http://localhost:5000/api/import/start-all', {
        method: 'POST'
      });
      
      if (altResponse.ok) {
        const result = await altResponse.json();
        console.log('✅ Importación iniciada via endpoint alternativo:', result);
        return result;
      }
    } catch (altError) {
      console.log('⚠️ Endpoint alternativo tampoco disponible');
    }
    
    throw error;
  }
}

runManualImport()
  .then((result) => {
    console.log('\n🎯 Importación manual completada:', result);
    console.log('💡 Puede monitorear el progreso con: node monitor_imports.js');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fallo en importación manual:', error.message);
    console.log('📋 El scheduler automático seguirá funcionando:');
    console.log('  - Incremental: hoy 12:00');
    console.log('  - Completa: mañana 02:00');
    process.exit(1);
  });