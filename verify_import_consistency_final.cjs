const { execSync } = require('child_process');

console.log('🔍 VERIFICACIÓN FINAL: Consistencia de endpoints de importación');
console.log('=' .repeat(60));

// Verificar que todos los endpoints usan MetasyncOptimizedImportService
console.log('\n📋 VERIFICANDO ENDPOINTS...');

const endpoints = [
  { name: 'Vehículos incremental', url: '/api/metasync-optimized/import/vehicles', data: '{"fullImport": false}' },
  { name: 'Piezas incremental', url: '/api/metasync-optimized/import/parts', data: '{"fullImport": false}' },
  { name: 'Importación completa', url: '/api/metasync-optimized/import/all', data: '{}' }
];

let allSuccess = true;

for (const endpoint of endpoints) {
  try {
    console.log(`\n🧪 Probando ${endpoint.name}...`);
    
    const result = execSync(`curl -s -X POST "http://localhost:5000${endpoint.url}" -H "Content-Type: application/json" -d '${endpoint.data}'`, { encoding: 'utf8' });
    const response = JSON.parse(result);
    
    if (response.success) {
      console.log(`✅ ${endpoint.name}: FUNCIONANDO (ID: ${response.importId || response.vehicleImportId || 'N/A'})`);
    } else {
      console.log(`❌ ${endpoint.name}: ERROR - ${response.message}`);
      allSuccess = false;
    }
  } catch (error) {
    console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
    allSuccess = false;
  }
}

// Verificar estructura del código
console.log('\n📁 VERIFICANDO ESTRUCTURA DE CÓDIGO...');

try {
  const routeContent = require('fs').readFileSync('server/api/metasync-optimized-routes.ts', 'utf8');
  
  // Verificar que todos los endpoints usan el servicio optimizado
  const vehicleEndpointUsesService = routeContent.includes("await importService.importVehicles(importRecord.id, isFullImport);");
  const partsEndpointUsesService = routeContent.includes("await importService.importParts(importRecord.id, isFullImport);");
  const completeEndpointUsesService = routeContent.includes("await importService.startImport({");
  
  console.log(`✅ Endpoint vehículos usa servicio optimizado: ${vehicleEndpointUsesService ? 'SÍ' : 'NO'}`);
  console.log(`✅ Endpoint piezas usa servicio optimizado: ${partsEndpointUsesService ? 'SÍ' : 'NO'}`);
  console.log(`✅ Endpoint completo usa servicio optimizado: ${completeEndpointUsesService ? 'SÍ' : 'NO'}`);
  
  // Verificar que no hay código axios obsoleto
  const hasObsoleteAxios = routeContent.includes('axios.get') || routeContent.includes('axios.post');
  console.log(`✅ Sin código axios obsoleto: ${!hasObsoleteAxios ? 'SÍ' : 'NO'}`);
  
  if (!vehicleEndpointUsesService || !partsEndpointUsesService || !completeEndpointUsesService || hasObsoleteAxios) {
    allSuccess = false;
  }
  
} catch (error) {
  console.log(`❌ Error verificando estructura: ${error.message}`);
  allSuccess = false;
}

console.log('\n' + '=' .repeat(60));
if (allSuccess) {
  console.log('🎉 VERIFICACIÓN EXITOSA: Todos los endpoints usan MetasyncOptimizedImportService');
  console.log('✅ Sistema unificado y consistente');
  console.log('✅ Extracción directa de API funcionando en todos los botones');
  console.log('✅ Sin código obsoleto axios');
} else {
  console.log('⚠️ ATENCIÓN: Encontrados problemas en la verificación');
}
console.log('=' .repeat(60));