/**
 * Script para probar la estructura real de datos de la API de MetaSync
 * y encontrar dónde está la información de vehículos para piezas procesadas
 */

import { db } from './server/db.js';
import { apiConfig } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testApiDataStructure() {
  console.log('🔍 Probando estructura real de datos de la API MetaSync...');
  
  try {
    // Obtener configuración de la API
    const configResult = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    
    if (!configResult || configResult.length === 0) {
      throw new Error('No se encontró configuración activa de API');
    }
    
    const config = configResult[0];
    console.log('📋 Configuración encontrada:', {
      apiUrl: config.apiUrl,
      companyId: config.companyId
    });
    
    // Hacer una llamada real a la API para obtener datos de muestra
    const response = await fetch('https://apis.metasync.com/Almacen/RecuperarCambiosCanalEmpresa', {
      method: 'GET',
      headers: {
        'apikey': config.apiKey,
        'fecha': '2024-01-01',
        'lastid': '0',
        'offset': '5',
        'idempresa': config.companyId.toString()
      }
    });
    
    if (!response.ok) {
      throw new Error(`API response not ok: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Respuesta de la API recibida');
    
    if (data.piezas && data.piezas.length > 0) {
      console.log('\n🔍 ESTRUCTURA DE PRIMERA PIEZA:');
      console.log('='.repeat(50));
      const firstPart = data.piezas[0];
      
      // Mostrar todas las propiedades disponibles
      console.log('📋 Propiedades disponibles:');
      Object.keys(firstPart).forEach(key => {
        const value = firstPart[key];
        const type = typeof value;
        const preview = type === 'object' ? JSON.stringify(value).substring(0, 100) + '...' : value;
        console.log(`  ${key}: (${type}) ${preview}`);
      });
      
      console.log('\n🚗 BÚSQUEDA DE INFORMACIÓN DE VEHÍCULO:');
      console.log('='.repeat(50));
      
      // Buscar campos relacionados con vehículos
      const vehicleRelatedFields = Object.keys(firstPart).filter(key => 
        key.toLowerCase().includes('vehicle') || 
        key.toLowerCase().includes('marca') || 
        key.toLowerCase().includes('modelo') || 
        key.toLowerCase().includes('vehiculo') ||
        key.toLowerCase().includes('vehiculos')
      );
      
      if (vehicleRelatedFields.length > 0) {
        console.log('🎯 Campos relacionados con vehículos encontrados:');
        vehicleRelatedFields.forEach(field => {
          console.log(`  ${field}: ${JSON.stringify(firstPart[field])}`);
        });
      } else {
        console.log('❌ No se encontraron campos obvios relacionados con vehículos');
      }
      
      // Buscar arrays que podrían contener información de vehículos compatibles
      console.log('\n📂 ARRAYS EN LA ESTRUCTURA:');
      console.log('='.repeat(50));
      Object.keys(firstPart).forEach(key => {
        if (Array.isArray(firstPart[key])) {
          console.log(`  ${key}: Array con ${firstPart[key].length} elementos`);
          if (firstPart[key].length > 0) {
            console.log(`    Primer elemento: ${JSON.stringify(firstPart[key][0])}`);
          }
        }
      });
      
      // Analizar varias piezas para encontrar patrones
      console.log('\n🔄 ANÁLISIS DE MÚLTIPLES PIEZAS:');
      console.log('='.repeat(50));
      for (let i = 0; i < Math.min(data.piezas.length, 3); i++) {
        const part = data.piezas[i];
        console.log(`\nPieza ${i + 1} (ID: ${part.id || 'N/A'}, RefLocal: ${part.refLocal || 'N/A'}):`);
        console.log(`  idVehiculo: ${part.idVehiculo}`);
        
        // Buscar cualquier campo que contenga información de marca/modelo
        ['marca', 'modelo', 'vehicle', 'vehiculo', 'vehiculos'].forEach(keyword => {
          Object.keys(part).forEach(field => {
            if (field.toLowerCase().includes(keyword) && part[field]) {
              console.log(`  ${field}: ${JSON.stringify(part[field])}`);
            }
          });
        });
      }
      
    } else {
      console.log('❌ No se encontraron piezas en la respuesta de la API');
      console.log('Respuesta completa:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

testApiDataStructure().then(() => {
  console.log('\n✅ Prueba de estructura de datos completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});