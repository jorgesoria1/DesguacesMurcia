// Lanzar importación completa con skipExisting forzado
// Esto evitará el problema de rendimiento 44x

async function launchCompleteImportOptimized() {
  console.log('🎯 Lanzando importación COMPLETA con skipExisting FORZADO...');
  
  try {
    const response = await fetch('http://localhost:5000/api/metasync-optimized/import/parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullImport: true,   // Completa desde 1900
        skipExisting: true  // FORZAR para evitar 44x lentitud
      })
    });
    
    const result = await response.json();
    console.log('📊 Respuesta del servidor:', result);
    
    if (result.success) {
      console.log(`✅ Importación completa ${result.importId} iniciada con skipExisting ACTIVO`);
      console.log('🚀 Esto evitará procesar las 152,331 piezas existentes innecesariamente');
      console.log('⚡ Solo procesará piezas realmente nuevas desde 1900-01-01');
    } else {
      console.error('❌ Error:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error lanzando importación:', error.message);
  }
}

launchCompleteImportOptimized();