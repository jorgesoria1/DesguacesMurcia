/**
 * Test directo del scheduler
 */

// Esperar que el servidor termine de inicializar
setTimeout(async () => {
  console.log('🔍 PRUEBA DIRECTA DEL SCHEDULER');
  console.log('================================');
  
  try {
    // Verificar global
    console.log('1. Global scheduler:', !!global.importScheduler);
    
    // Intentar acceso directo al módulo
    console.log('2. Intentando importar módulo...');
    
    // Simular una prueba de importación directa
    const testUrl = 'http://localhost:5000/api/metasync-optimized/start-import';
    console.log('3. Ejecutando importación de prueba vía API...');
    
    const fetch = await import('node-fetch');
    const response = await fetch.default(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'vehicles', skipExisting: true })
    });
    
    if (response.ok) {
      console.log('✅ API de importación responde correctamente');
    } else {
      console.log('❌ API de importación no responde:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
  }
  
  console.log('================================');
  
}, 10000); // 10 segundos

console.log('🧪 Test del scheduler programado para ejecutarse en 10 segundos...');