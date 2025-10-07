#!/usr/bin/env tsx

/**
 * Script simple para restaurar datos después de checkpoint
 */

async function main() {
  console.log('🚨 RESTAURACIÓN DE DATOS - MÉTODO DIRECTO');
  console.log('========================================');

  try {
    console.log('🔧 Importando servicios...');
    
    // Llamadas directas a los endpoints de importación
    const fetch = (await import('node-fetch')).default;
    
    console.log('🚗 INICIANDO IMPORTACIÓN DE VEHÍCULOS...');
    
    // Paso 1: Importar vehículos
    const vehicleResponse = await fetch('http://localhost:5000/api/metasync-optimized/import/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullImport: true,
        batchSize: 500
      })
    });
    
    if (!vehicleResponse.ok) {
      throw new Error(`Error en importación de vehículos: ${vehicleResponse.status}`);
    }
    
    const vehicleResult = await vehicleResponse.json();
    console.log('✅ Respuesta vehículos:', vehicleResult);
    
    // Esperar un poco antes de importar piezas
    console.log('⏳ Esperando 30 segundos antes de importar piezas...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('🔧 INICIANDO IMPORTACIÓN DE PIEZAS...');
    
    // Paso 2: Importar piezas
    const partsResponse = await fetch('http://localhost:5000/api/metasync-optimized/import/parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullImport: true,
        batchSize: 1000
      })
    });
    
    if (!partsResponse.ok) {
      throw new Error(`Error en importación de piezas: ${partsResponse.status}`);
    }
    
    const partsResult = await partsResponse.json();
    console.log('✅ Respuesta piezas:', partsResult);
    
    console.log('🎉 IMPORTACIONES INICIADAS CORRECTAMENTE');
    console.log('Monitorea el progreso en los logs del servidor');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();