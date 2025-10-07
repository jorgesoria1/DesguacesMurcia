// Monitor de importación de piezas con seguimiento optimizado
async function monitorPartsImport() {
  console.log('📊 MONITOREANDO IMPORTACIÓN COMPLETA DE PIEZAS');
  console.log('');
  
  try {
    // Verificar importación en progreso
    console.log('🔍 Verificando importaciones activas...');
    const historyResponse = await fetch('http://localhost:5000/api/admin/import-history');
    const history = await historyResponse.json();
    
    console.log(`📋 Historial encontrado: ${history.data?.length || 0} registros`);
    
    const activeImports = history.data?.filter(imp => 
      imp.status === 'running' || imp.status === 'in_progress'
    ) || [];
    
    if (activeImports.length > 0) {
      console.log(`🔄 ${activeImports.length} importación(es) activa(s):`);
      for (const imp of activeImports) {
        console.log(`   - ID ${imp.id}: ${imp.type} (${imp.status}) - ${imp.processed_items || 0} procesados`);
      }
      console.log('');
      
      // Monitorear hasta completar
      let monitoringMins = 0;
      const maxMinutes = 20; // Máximo 20 minutos para piezas
      
      while (monitoringMins < maxMinutes) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
        monitoringMins += 0.17; // 10/60 = 0.167
        
        // Verificar estado de todas las importaciones activas
        let stillRunning = 0;
        for (const imp of activeImports) {
          try {
            const statusResponse = await fetch(`http://localhost:5000/api/metasync-optimized/import/${imp.id}/status`);
            const statusData = await statusResponse.json();
            
            if (statusData.success && statusData.data.length > 0) {
              const importData = statusData.data[0];
              const processed = importData.processed_items || 0;
              const rate = processed > 0 ? Math.round(processed / (monitoringMins || 0.1)) : 0;
              
              console.log(`  ${monitoringMins.toFixed(1)}min - ID ${imp.id}: ${importData.status} (${processed} procesados, ~${rate}/min)`);
              
              if (importData.status === 'running' || importData.status === 'in_progress') {
                stillRunning++;
              } else if (importData.status === 'completed') {
                console.log(`  🎉 Importación ${imp.id} COMPLETADA: ${processed} ${imp.type}`);
              } else if (importData.status === 'failed') {
                console.log(`  ❌ Importación ${imp.id} FALLÓ`);
              }
            }
          } catch (err) {
            console.log(`  ⚠️ Error verificando ID ${imp.id}: ${err.message}`);
          }
        }
        
        if (stillRunning === 0) {
          console.log(`✅ Todas las importaciones completadas en ${monitoringMins.toFixed(1)} minutos`);
          break;
        }
      }
      
      if (monitoringMins >= maxMinutes) {
        console.log(`⏰ Tiempo límite alcanzado (${maxMinutes} minutos)`);
      }
    } else {
      console.log('📝 No hay importaciones activas actualmente');
    }
    
    // Estado final
    console.log('');
    console.log('📊 Verificando estado final...');
    const finalDashboard = await fetch('http://localhost:5000/api/dashboard/stats');
    const finalStats = await finalDashboard.json();
    
    console.log('');
    console.log('📊 ESTADO FINAL:');
    console.log(`   - Vehículos: ${finalStats.vehicles?.total || 0} (${finalStats.vehicles?.active || 0} activos)`);
    console.log(`   - Piezas: ${finalStats.parts?.total || 0} (${finalStats.parts?.active || 0} activas)`);
    console.log('');
    
    const vehiclesCount = finalStats.vehicles?.total || 0;
    const partsCount = finalStats.parts?.total || 0;
    
    if (vehiclesCount > 4000 && partsCount > 100000) {
      console.log('🎉 IMPORTACIÓN COMPLETA EXITOSA - Base totalmente poblada');
      console.log('✅ Sistema listo para prueba de importación incremental');
    } else if (vehiclesCount > 4000 && partsCount === 0) {
      console.log('🔄 Vehículos completos, piezas aún pendientes');
    } else {
      console.log('📋 Importación aún en progreso o incompleta');
    }
    
  } catch (error) {
    console.error('❌ Error monitoreando:', error.message);
  }
}

monitorPartsImport();