/**
 * Script para probar el proceso completo de importación:
 * 1. Importar vehículos
 * 2. Importar piezas
 * 3. Crear asociaciones automáticamente
 */

async function testCompleteImport() {
  console.log('🚀 Iniciando prueba de importación completa...');
  
  try {
    // 1. Crear programación de prueba
    const scheduleResponse = await fetch('http://localhost:5000/api/import/schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'all',
        frequency: '24h',
        active: true,
        startTime: '18:45', // 5 minutos después de la hora actual
        isFullImport: true
      })
    });
    
    const scheduleData = await scheduleResponse.json();
    
    if (scheduleData.success) {
      console.log('✅ Programación creada:', scheduleData.schedule);
      console.log('⏰ Programado para:', scheduleData.schedule.startTime);
      
      // El scheduler debería detectar y programar automáticamente
      console.log('📅 El scheduler detectará y programará automáticamente en los próximos segundos...');
      
    } else {
      console.error('❌ Error creando programación:', scheduleData);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar prueba
testCompleteImport();