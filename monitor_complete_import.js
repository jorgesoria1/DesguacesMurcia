// Monitor de importación completa con seguimiento detallado
async function monitorCompleteImport() {
  console.log('📊 MONITOREANDO IMPORTACIÓN COMPLETA DESDE BASE LIMPIA');
  console.log('');
  
  try {
    // Obtener estado actual
    const dashboardResponse = await fetch('http://localhost:5000/api/dashboard/stats');
    const dashboard = await dashboardResponse.json();
    
    console.log('📋 Estado actual de la base de datos:');
    console.log(`   - Vehículos: ${dashboard.vehicles?.total || 0}`);
    console.log(`   - Piezas: ${dashboard.parts?.total || 0}`);
    console.log('');
    
    // Verificar importación en progreso
    const historyResponse = await fetch('http://localhost:5000/api/admin/import-history');
    const history = await historyResponse.json();
    
    const activeImports = history.data?.filter(imp => 
      imp.status === 'running' || imp.status === 'in_progress'
    ) || [];
    
    if (activeImports.length > 0) {
      console.log(`🔄 ${activeImports.length} importación(es) activa(s):`);
      for (const imp of activeImports) {
        console.log(`   - ID ${imp.id}: ${imp.type} (${imp.status})`);
      }
      console.log('');
      
      // Monitorear hasta completar
      let monitoringMins = 0;
      while (monitoringMins < 30) { // Máximo 30 minutos
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 segundos
        monitoringMins += 0.25;
        
        // Verificar estado de todas las importaciones activas
        let allCompleted = true;
        for (const imp of activeImports) {
          const statusResponse = await fetch(`http://localhost:5000/api/metasync-optimized/import/${imp.id}/status`);
          const statusData = await statusResponse.json();
          
          if (statusData.success && statusData.data.length > 0) {
            const importData = statusData.data[0];
            const processed = importData.processed_items || 0;
            
            console.log(`  ${monitoringMins}min - ID ${imp.id}: ${importData.status} (${processed} procesados)`);
            
            if (importData.status === 'running' || importData.status === 'in_progress') {
              allCompleted = false;
            } else if (importData.status === 'completed') {
              console.log(`  🎉 Importación ${imp.id} COMPLETADA: ${processed} ${imp.type}`);
            } else if (importData.status === 'failed') {
              console.log(`  ❌ Importación ${imp.id} FALLÓ`);
            }
          }
        }
        
        if (allCompleted) {
          console.log(`✅ Todas las importaciones completadas en ${monitoringMins} minutos`);
          break;
        }
      }
    } else {
      console.log('📝 No hay importaciones activas actualmente');
    }
    
    // Estado final
    const finalDashboard = await fetch('http://localhost:5000/api/dashboard/stats');
    const finalStats = await finalDashboard.json();
    
    console.log('');
    console.log('📊 ESTADO FINAL:');
    console.log(`   - Vehículos: ${finalStats.vehicles?.total || 0}`);
    console.log(`   - Piezas: ${finalStats.parts?.total || 0}`);
    console.log('');
    
    if ((finalStats.vehicles?.total || 0) > 0) {
      console.log('✅ Base poblada exitosamente, lista para importación incremental');
    } else {
      console.log('📋 Base aún vacía, importación en progreso o pendiente');
    }
    
  } catch (error) {
    console.error('❌ Error monitoreando:', error.message);
  }
}

monitorCompleteImport();