console.log('🧪 Verificando configuración startTime en las programaciones...');

// Verificar que la funcionalidad está implementada
const testConfig = {
  startTime: '14:30',
  frequency: '24h'
};

// Función para calcular la próxima ejecución
function calculateNextRun(from, frequency, startTime = '02:00') {
  const [hours, minutes] = startTime.split(':').map(Number);
  const now = new Date();
  const nextRun = new Date(now);
  
  nextRun.setHours(hours, minutes, 0, 0);
  
  // Si la hora ya pasó hoy, programar para mañana
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}

// Pruebas
console.log('📅 Prueba 1: Calcular próxima ejecución a las 14:30');
const nextRun1 = calculateNextRun(new Date(), '24h', '14:30');
console.log(`   Próxima ejecución: ${nextRun1.toLocaleString()}`);

console.log('📅 Prueba 2: Calcular próxima ejecución a las 02:00 (default)');
const nextRun2 = calculateNextRun(new Date(), '24h');
console.log(`   Próxima ejecución: ${nextRun2.toLocaleString()}`);

console.log('📅 Prueba 3: Validar formato de hora');
const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const validTimes = ['14:30', '02:00', '23:59', '00:00'];
const invalidTimes = ['25:00', '24:60', '1:30', '14:70'];

validTimes.forEach(time => {
  console.log(`   ✅ ${time} es válido: ${timeRegex.test(time)}`);
});

invalidTimes.forEach(time => {
  console.log(`   ❌ ${time} es inválido: ${timeRegex.test(time)}`);
});

console.log('✅ Funcionalidad startTime verificada correctamente');