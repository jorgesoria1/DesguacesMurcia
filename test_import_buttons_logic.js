// Simulación de la lógica de botones corregida
const isImporting = {
  vehiclesIncremental: false,
  vehiclesComplete: false,
  partsIncremental: false,
  partsComplete: false,
  allComplete: false,
  allIncremental: false,
  updateCounters: false
};

const getImportStateKey = (type, fullImport) => {
  if (type === 'vehicles') {
    return fullImport ? 'vehiclesComplete' : 'vehiclesIncremental';
  } else if (type === 'parts') {
    return fullImport ? 'partsComplete' : 'partsIncremental';
  } else {
    return fullImport ? 'allComplete' : 'allIncremental';
  }
};

// Probar la lógica
console.log('🧪 Probando lógica de botones de importación:');
console.log('');
console.log('1. Botón "Todo - Incremental" (all, false):');
console.log('   - Estado usado:', getImportStateKey('all', false)); // allIncremental
console.log('   - Disabled cuando:', 'allIncremental ||', 'allComplete');
console.log('');
console.log('2. Botón "Todo - Completa" (all, true):');
console.log('   - Estado usado:', getImportStateKey('all', true)); // allComplete  
console.log('   - Disabled cuando:', 'allIncremental ||', 'allComplete');
console.log('');
console.log('✅ Estados diferentes = botones independientes');
console.log('✅ Disabled compartido = mutuamente excluyentes');
