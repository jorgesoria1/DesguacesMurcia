// Prueba de velocidad de importación incremental
async function testIncrementalSpeed() {
  console.log('⚡ PRUEBA DE VELOCIDAD: Importación incremental sobre base poblada');
  console.log('');
  
  const importId = process.argv[2];
  if (!importId) {
    console.log('❌ Proporcione el ID de importación como argumento');
    return;
  }
  
  console.log(`🔍 Monitoreando importación ID: ${importId}`);
  
  const startTime = Date.now();
  let lastProcessed = 0;
  
  for (let i = 0; i < 30; i++) { // 30 checks máximo (1 minuto)
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos
    
    try {
      const response = await fetch(`http://localhost:5000/api/metasync-optimized/import/${importId}/status`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const importData = data.data[0];
        const processed = importData.processed_items || 0;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = processed > 0 ? Math.round(processed / (elapsed / 60)) : 0;
        
        console.log(`${elapsed}s: ${importData.status} - ${processed} procesados (~${rate}/min)`);
        
        if (importData.status === 'completed') {
          console.log('');
          console.log('🎉 IMPORTACIÓN INCREMENTAL COMPLETADA');
          console.log(`⏱️ Tiempo total: ${elapsed} segundos`);
          console.log(`📦 Total procesado: ${processed} elementos`);
          console.log(`⚡ Velocidad promedio: ${rate} elementos/minuto`);
          
          if (elapsed < 10) {
            console.log('✅ OPTIMIZACIÓN skipExisting CONFIRMADA - Velocidad máxima');
          } else if (elapsed < 30) {
            console.log('✅ Velocidad buena - Optimización funcionando');
          } else {
            console.log('⚠️ Velocidad normal - Posible mejora pendiente');
          }
          break;
        } else if (importData.status === 'failed') {
          console.log('❌ Importación falló');
          break;
        }
        
        lastProcessed = processed;
      }
    } catch (error) {
      console.log(`⚠️ Error verificando estado: ${error.message}`);
    }
  }
}

testIncrementalSpeed();