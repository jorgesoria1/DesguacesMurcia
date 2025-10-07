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
  // Obtener información de sync_control
  const sqlResult = execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT type, last_sync_date, last_id, records_processed FROM sync_control WHERE active = true ORDER BY type;" -t`, 
    { encoding: 'utf8' });
  
  const lines = sqlResult.trim().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const [type, lastSyncDate, lastId, recordsProcessed] = line.split('|').map(s => s.trim());
    
    const typeLabel = type === 'parts' ? 'PIEZAS' : 'VEHÍCULOS';
    const formattedDate = formatDate(lastSyncDate);
    const timeAgo = getTimeAgo(lastSyncDate);
    
    console.log(`📋 ${typeLabel}:`);
    console.log(`   └─ Última sincronización: ${formattedDate} (${timeAgo})`);
    console.log(`   └─ Último ID procesado: ${lastId}`);
    console.log(`   └─ Registros procesados: ${recordsProcessed}`);
    console.log('');
  }
  
} catch (error) {
  console.log('❌ Error obteniendo datos de sync_control:', error.message);
}

console.log('🧪 PROBANDO IMPORTACIÓN INCREMENTAL DE PIEZAS...');
console.log('-'.repeat(65));

try {
  // Lanzar importación incremental de piezas para ver la fecha
  const result = execSync(`curl -s -X POST "http://localhost:5000/api/metasync-optimized/import/parts" -H "Content-Type: application/json" -d '{"fullImport": false}'`,
    { encoding: 'utf8' });
  
  const response = JSON.parse(result);
  
  if (response.success) {
    console.log(`✅ Importación incremental iniciada (ID: ${response.importId})`);
    
    // Esperar un momento para que aparezcan los logs
    console.log('⏳ Esperando logs de fecha de inicio...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Intentar capturar los logs más recientes (esto puede variar según el sistema)
    try {
      // En sistemas con journalctl
      const logs = execSync('journalctl -u replit --since "1 minute ago" | grep "IMPORTACIÓN INCREMENTAL.*usando fecha" | tail -1', 
        { encoding: 'utf8' }).trim();
      
      if (logs) {
        const match = logs.match(/usando fecha (\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/);
        if (match) {
          console.log(`📤 Fecha de inicio detectada: ${match[1]}`);
        }
      }
    } catch (logError) {
      console.log('ℹ️ No se pudieron capturar logs del sistema');
    }
    
  } else {
    console.log(`❌ Error iniciando importación: ${response.message}`);
  }
  
} catch (error) {
  console.log('❌ Error probando importación:', error.message);
}

console.log('\n💡 EXPLICACIÓN DEL SISTEMA:');
console.log('-'.repeat(65));
console.log('• Las importaciones INCREMENTALES usan la fecha de last_sync_date');
console.log('• Las importaciones COMPLETAS usan fecha 01/01/1900 (todo el catálogo)');
console.log('• Los botones "Incremental" importan solo cambios desde la última vez');
console.log('• El botón "Completo" importa todo desde el principio');
console.log('=' .repeat(65));