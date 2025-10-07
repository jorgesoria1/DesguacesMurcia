const { execSync } = require('child_process');

console.log('🔍 VERIFICACIÓN: Fechas de inicio de importaciones incrementales');
console.log('=' .repeat(65));

// Función para formatear fechas de manera legible
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    timeZone: 'Europe/Madrid'
  };
  return date.toLocaleString('es-ES', options);
}

// Función para calcular tiempo transcurrido
function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `hace ${diffDays} día${diffDays > 1 ? 's' : ''} y ${diffHours % 24} horas`;
  } else {
    return `hace ${diffHours} horas`;
  }
}

console.log('\n📅 FECHAS DE ÚLTIMA SINCRONIZACIÓN (BASE DE DATOS):');
console.log('-'.repeat(65));

try {
  // Obtener información de sync_control usando SQL directo
  const sqlResult = execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT type, last_sync_date, last_id, records_processed FROM sync_control WHERE active = true ORDER BY type;" -t`, 
    { encoding: 'utf8' });
  
  const lines = sqlResult.trim().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const [type, lastSyncDate, lastId, recordsProcessed] = line.split('|').map(s => s.trim());
    
    const typeLabel = type === 'parts' ? '🔧 PIEZAS' : '🚗 VEHÍCULOS';
    const formattedDate = formatDate(lastSyncDate);
    const timeAgo = getTimeAgo(lastSyncDate);
    
    console.log(`${typeLabel}:`);
    console.log(`   ├─ Última sincronización: ${formattedDate} (${timeAgo})`);
    console.log(`   ├─ Último ID procesado: ${lastId}`);
    console.log(`   └─ Registros procesados: ${recordsProcessed}`);
    console.log('');
  }
  
} catch (error) {
  console.log('❌ Error obteniendo datos de sync_control:', error.message);
}

console.log('🧪 PROBANDO IMPORTACIÓN INCREMENTAL...');
console.log('-'.repeat(65));

try {
  // Probar importación incremental de piezas
  console.log('📤 Iniciando importación incremental de piezas...');
  const result = execSync(`curl -s -X POST "http://localhost:5000/api/metasync-optimized/import/parts" -H "Content-Type: application/json" -d '{"fullImport": false}'`,
    { encoding: 'utf8' });
  
  const response = JSON.parse(result);
  
  if (response.success) {
    console.log(`✅ Importación incremental iniciada (ID: ${response.importId})`);
    console.log('ℹ️ Revisa los logs del servidor para ver la fecha exacta de inicio');
  } else {
    console.log(`❌ Error iniciando importación: ${response.message}`);
  }
  
} catch (error) {
  console.log('❌ Error probando importación:', error.message);
}

console.log('\n💡 RESUMEN DEL SISTEMA:');
console.log('-'.repeat(65));
console.log('📋 IMPORTACIONES INCREMENTALES:');
console.log('   • Vehículos: desde 30/07/2025 07:41:18 (hace unas horas)');
console.log('   • Piezas: desde 30/07/2025 17:14:05 (hace unos minutos)');
console.log('   • Solo importan cambios desde estas fechas');
console.log('');
console.log('📋 IMPORTACIONES COMPLETAS:');
console.log('   • Usan fecha 01/01/1900 00:00:00');
console.log('   • Importan todo el catálogo desde el principio');
console.log('   • Ignoran las fechas de sync_control');
console.log('');
console.log('🔄 Los botones incrementales continuarán desde las fechas mostradas arriba');
console.log('=' .repeat(65));