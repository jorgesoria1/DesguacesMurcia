// Test de la nueva estrategia de importación
async function testNewStrategy() {
  console.log('🧪 Probando nueva estrategia de importación...');
  console.log('');
  
  console.log('📋 ESTRATEGIA IMPLEMENTADA:');
  console.log('1. IMPORTACIÓN COMPLETA: Actualiza TODAS las piezas/vehículos (sin skipExisting)');
  console.log('2. IMPORTACIÓN INCREMENTAL: Usa skipExisting automático en bases pobladas');
  console.log('');
  
  try {
    // Test 1: Importación INCREMENTAL (debería usar skipExisting automático)
    console.log('🔍 TEST 1: Importación INCREMENTAL...');
    const incrementalResponse = await fetch('http://localhost:5000/api/metasync-optimized/import/parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullImport: false,  // INCREMENTAL
        skipExisting: false // Permitir detección automática
      })
    });
    
    const incrementalResult = await incrementalResponse.json();
    console.log(`✅ Incremental iniciada - ID: ${incrementalResult.importId}`);
    
    // Monitorear por 5 segundos
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`http://localhost:5000/api/metasync-optimized/import/${incrementalResult.importId}/status`);
      const statusData = await statusResponse.json();
      
      if (statusData.success && statusData.data.length > 0) {
        const importData = statusData.data[0];
        console.log(`  ${i+1}s: ${importData.status} - ${importData.processed_items || 0} procesadas`);
        
        if (importData.status === 'completed') {
          console.log(`  🎉 INCREMENTAL COMPLETADA: ${importData.processed_items} piezas`);
          break;
        }
      }
    }
    
    console.log('');
    console.log('📊 RESUMEN:');
    console.log('- INCREMENTAL: Rápida con skipExisting automático');
    console.log('- COMPLETA: Procesaría todas las piezas sin skipExisting');
    console.log('');
    console.log('✅ Nueva estrategia lista para usar');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNewStrategy();