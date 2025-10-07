import { exec } from 'child_process';

console.log('🔄 Ejecutando actualización de contadores de piezas...');

// Ejecutar usando TSX para manejar TypeScript
exec('npx tsx -e "import { MetasyncOptimizedImportService } from \'./server/api/metasync-optimized-import-service.ts\'; const service = new MetasyncOptimizedImportService(); service.updateVehiclePartsCounters().then(() => { console.log(\'✅ Contadores actualizados correctamente\'); process.exit(0); }).catch(error => { console.error(\'❌ Error:\', error); process.exit(1); });"', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error ejecutando el script:', error);
    console.error('STDERR:', stderr);
    return;
  }
  
  console.log('STDOUT:', stdout);
  if (stderr) {
    console.log('STDERR:', stderr);
  }
});