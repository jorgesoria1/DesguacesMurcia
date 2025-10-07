#!/usr/bin/env node

// Prueba simple del sistema de programación de importaciones
console.log('🧪 Probando sistema de programación de importaciones...\n');

async function testSchedulerStatus() {
  try {
    // Test 1: Verificar endpoint de schedules
    const response = await fetch('http://localhost:5000/api/import/schedules');
    
    if (response.ok) {
      const schedules = await response.json();
      console.log('✅ API de schedules funciona');
      console.log(`📊 Programaciones encontradas: ${schedules.length}`);
      
      if (schedules.length > 0) {
        console.log('📋 Programaciones disponibles:');
        schedules.forEach(schedule => {
          console.log(`   - ${schedule.type}: ${schedule.frequency} (${schedule.active ? 'activa' : 'inactiva'})`);
        });
      } else {
        console.log('⚠️  No hay programaciones configuradas');
      }
    } else {
      console.log(`❌ Error en API: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Error conectando con API:', error.message);
  }
}

// Test 2: Verificar si scheduler está inicializado
async function testSchedulerInitialization() {
  try {
    console.log('\n🔍 Verificando inicialización del scheduler...');
    
    // Verificar logs del servidor
    const logLines = await fetch('http://localhost:5000/api/diagnostic')
      .then(res => res.ok ? res.json() : null)
      .catch(() => null);
    
    if (logLines) {
      console.log('✅ Endpoint de diagnóstico disponible');
    } else {
      console.log('⚠️  Endpoint de diagnóstico no disponible');
    }
    
  } catch (error) {
    console.log('⚠️  No se pudo verificar inicialización:', error.message);
  }
}

console.log('🚀 Iniciando pruebas...');
testSchedulerStatus().then(() => {
  return testSchedulerInitialization();
}).then(() => {
  console.log('\n✅ Pruebas completadas');
}).catch(error => {
  console.error('\n❌ Error en pruebas:', error);
});