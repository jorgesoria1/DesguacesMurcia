// Verificación rápida del estado de importación
async function quickImportStatus() {
  try {
    console.log('📊 ESTADO RÁPIDO DE IMPORTACIÓN');
    
    // Estado de importación específica
    const statusResponse = await fetch('http://localhost:5000/api/metasync-optimized/import/1792/status');
    const statusData = await statusResponse.json();
    
    if (statusData.success && statusData.data.length > 0) {
      const importData = statusData.data[0];
      const processed = importData.processed_items || 0;
      console.log(`🔄 Importación 1792: ${importData.status}`);
      console.log(`📦 Procesados: ${processed} piezas`);
      console.log(`📅 Inicio: ${importData.start_time}`);
      if (importData.end_time) {
        console.log(`🏁 Fin: ${importData.end_time}`);
      }
    }
    
    // Estado del dashboard
    const dashResponse = await fetch('http://localhost:5000/api/dashboard/stats');
    const dashData = await dashResponse.json();
    
    console.log('');
    console.log('📊 ESTADO ACTUAL BASE DE DATOS:');
    console.log(`🚗 Vehículos: ${dashData.vehicles?.total || 0} (${dashData.vehicles?.active || 0} activos)`);
    console.log(`🔧 Piezas: ${dashData.parts?.total || 0} (${dashData.parts?.active || 0} activas)`);
    
    const targetParts = 152331;
    const currentParts = dashData.parts?.total || 0;
    const progress = targetParts > 0 ? Math.round((currentParts / targetParts) * 100) : 0;
    console.log(`📈 Progreso estimado: ${progress}% (${currentParts}/${targetParts})`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickImportStatus();