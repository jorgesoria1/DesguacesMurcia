// Script para depurar directamente el endpoint de la API de MetaSync
import fetch from 'node-fetch';

async function debugAPIEndpoint() {
  console.log('🔍 Analizando endpoint directo de API MetaSync...\n');

  const apiKey = process.env.METASYNC_API_KEY;
  const companyId = parseInt(process.env.METASYNC_COMPANY_ID || '161');
  
  if (!apiKey) {
    console.error('❌ Error: METASYNC_API_KEY no está configurada en las variables de entorno');
    return;
  }
  
  try {
    console.log('📡 Llamando a API de piezas...');
    const response = await fetch('https://apis.metasync.com/Almacen/Piezas', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'idempresa': companyId.toString(),
        'fecha': '25/07/2025 00:00:00',
        'lastid': '0',
        'offset': '0',
        'canal': '2'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 Respuesta recibida, analizando estructura...\n`);

    // Analizar estructura completa
    console.log('🔍 ESTRUCTURA DE RESPUESTA:');
    console.log('Keys principales:', Object.keys(data));
    
    if (data.data) {
      console.log('data keys:', Object.keys(data.data));
    }
    
    if (data.items && Array.isArray(data.items)) {
      console.log(`📋 Total items: ${data.items.length}`);
      
      // Analizar estructura de una pieza completa
      if (data.items.length > 0) {
        const firstItem = data.items[0];
        console.log('\n🔧 ESTRUCTURA DE UNA PIEZA:');
        console.log('Campos disponibles:', Object.keys(firstItem).join(', '));
        
        // Mostrar datos completos de los primeros 3 items
        console.log('\n📋 DATOS COMPLETOS DE LAS PRIMERAS 3 PIEZAS:');
        for (let i = 0; i < Math.min(3, data.items.length); i++) {
          const item = data.items[i];
          console.log(`\n--- PIEZA ${i + 1} ---`);
          
          // Mostrar todos los campos
          Object.entries(item).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              console.log(`${key}: [array con ${value.length} elementos]`);
              if (value.length > 0) {
                console.log(`  Primer elemento: ${JSON.stringify(value[0])}`);
              }
            } else if (typeof value === 'object' && value !== null) {
              console.log(`${key}: {objeto con keys: ${Object.keys(value).join(', ')}}`);
              console.log(`  Contenido: ${JSON.stringify(value)}`);
            } else {
              console.log(`${key}: ${value}`);
            }
          });
        }
        
        // Buscar específicamente campos con datos de vehículos
        console.log('\n🚗 BÚSQUEDA ESPECÍFICA DE DATOS DE VEHÍCULOS:');
        const vehicleFields = {};
        Object.keys(firstItem).forEach(key => {
          if (key.toLowerCase().includes('vehiculo') || 
              key.toLowerCase().includes('vehicle') || 
              key.toLowerCase().includes('marca') || 
              key.toLowerCase().includes('modelo') ||
              key.toLowerCase().includes('brand') ||
              key.toLowerCase().includes('model')) {
            vehicleFields[key] = firstItem[key];
          }
        });
        
        if (Object.keys(vehicleFields).length > 0) {
          console.log('Campos relacionados con vehículos encontrados:');
          Object.entries(vehicleFields).forEach(([key, value]) => {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
          });
        } else {
          console.log('No se encontraron campos obviamente relacionados con vehículos');
        }
        
        // Buscar arrays que puedan contener información de vehículos
        console.log('\n📋 ANÁLISIS DE ARRAYS EN LA RESPUESTA:');
        Object.entries(firstItem).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            console.log(`\nArray "${key}" (${value.length} elementos):`);
            console.log(`  Primer elemento: ${JSON.stringify(value[0])}`);
            
            // Si el primer elemento es un objeto, mostrar sus keys
            if (typeof value[0] === 'object' && value[0] !== null) {
              console.log(`  Keys del objeto: ${Object.keys(value[0]).join(', ')}`);
            }
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAPIEndpoint();