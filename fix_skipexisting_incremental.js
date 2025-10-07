// Script para lanzar importación incremental con skipExisting forzado
// Esto solucionará el problema de rendimiento inmediatamente

async function launchIncrementalWithSkipExisting() {
  console.log('🎯 Lanzando importación incremental con skipExisting FORZADO...');
  
  try {
    const response = await fetch('http://localhost:5000/api/metasync-optimized/import/parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullImport: false,  // Incremental para rendimiento
        skipExisting: true  // FORZAR skipExisting para base poblada
      })
    });
    
    const result = await response.json();
    console.log('📊 Respuesta del servidor:', result);
    
    if (result.success) {
      console.log(`✅ Importación ${result.importId} iniciada con skipExisting ACTIVO`);
      console.log('🚀 Esto debería ser 15x más rápido (solo procesar piezas nuevas/modificadas)');
    } else {
      console.error('❌ Error:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error lanzando importación:', error.message);
  }
}

launchIncrementalWithSkipExisting();