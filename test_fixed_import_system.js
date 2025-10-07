// Test del sistema de importación arreglado
async function testFixedImportSystem() {
  console.log('🧪 Probando sistema de importación con bug ARREGLADO...');
  
  try {
    // Lanzar importación incremental que debería ser súper rápida
    const response = await fetch('http://localhost:5000/api/metasync-optimized/import/parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullImport: false,  // Incremental
        skipExisting: false // Permitir detección automática
      })
    });
    
    const result = await response.json();
    console.log('📊 Respuesta del servidor:', result);
    
    if (result.success) {
      console.log(`✅ Importación ${result.importId} iniciada`);
      console.log('🎯 Con bug arreglado, skipExisting se activará automáticamente');
      console.log('⏱️  Monitoreando por 10 segundos...');
      
      // Monitorear progreso por 10 segundos
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`http://localhost:5000/api/metasync-optimized/import/${result.importId}/status`);
        const statusData = await statusResponse.json();
        
        if (statusData.success && statusData.data.length > 0) {
          const importData = statusData.data[0];
          console.log(`Segundo ${i+1}: ${importData.status} - ${importData.processed_items || 0} procesadas`);
          
          if (importData.status === 'completed') {
            console.log(`🎉 COMPLETADA: ${importData.processed_items} piezas en ${i+1} segundos`);
            break;
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFixedImportSystem();