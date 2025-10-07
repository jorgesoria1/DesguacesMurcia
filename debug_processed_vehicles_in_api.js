// Script para depurar datos de vehículos procesados en la API de MetaSync
import fetch from 'node-fetch';

async function debugProcessedVehiclesData() {
  console.log('🔍 Analizando datos de piezas procesadas desde API MetaSync...\n');

  const apiKey = process.env.METASYNC_API_KEY;
  const companyId = parseInt(process.env.METASYNC_COMPANY_ID || '161');
  
  if (!apiKey) {
    console.error('❌ Error: METASYNC_API_KEY no está configurada en las variables de entorno');
    return;
  }
  
  try {
    // Llamada a la API de piezas
    const response = await fetch('https://apis.metasync.com/Almacen/Piezas', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'idempresa': companyId.toString(),
        'fecha': '23/07/2025 00:00:00',
        'lastid': '0',
        'offset': '0',
        'canal': '2'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 Total de piezas obtenidas: ${data.items?.length || 0}\n`);

    // Filtrar piezas con ID de vehículo negativo (procesadas)
    const processedParts = data.items.filter(item => item.idVehiculo < 0);
    console.log(`🔧 Piezas procesadas (idVehiculo < 0): ${processedParts.length}\n`);

    if (processedParts.length > 0) {
      // Analizar los primeros 5 registros
      console.log('📋 ANÁLISIS DE CAMPOS EN PIEZAS PROCESADAS:\n');
      
      for (let i = 0; i < Math.min(5, processedParts.length); i++) {
        const part = processedParts[i];
        console.log(`--- PIEZA ${i + 1} ---`);
        console.log(`refLocal: ${part.refLocal}`);
        console.log(`idVehiculo: ${part.idVehiculo}`);
        console.log(`codFamilia: ${part.codFamilia}`);
        console.log(`descripcionFamilia: ${part.descripcionFamilia}`);
        console.log(`descripcionArticulo: ${part.descripcionArticulo}`);
        
        // Buscar campos que contengan información de vehículo
        const vehicleFields = {};
        Object.keys(part).forEach(key => {
          if (key.toLowerCase().includes('vehiculo') || 
              key.toLowerCase().includes('marca') || 
              key.toLowerCase().includes('modelo') ||
              key.toLowerCase().includes('version') ||
              key.toLowerCase().includes('anyo')) {
            vehicleFields[key] = part[key];
          }
        });
        
        console.log('Campos relacionados con vehículo:', vehicleFields);
        
        // Mostrar todos los campos disponibles
        console.log('Todos los campos disponibles:', Object.keys(part).join(', '));
        console.log('');
      }

      // Buscar patrones en descripcionFamilia
      console.log('\n🎯 ANÁLISIS DE PATRONES EN descripcionFamilia:');
      const familiaPatterns = {};
      processedParts.slice(0, 20).forEach(part => {
        const familia = part.descripcionFamilia || 'SIN_DATOS';
        familiaPatterns[familia] = (familiaPatterns[familia] || 0) + 1;
      });
      
      Object.entries(familiaPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([pattern, count]) => {
          console.log(`  "${pattern}": ${count} veces`);
        });

      // Buscar cualquier campo que contenga información similar a marca/modelo
      console.log('\n🔍 ANÁLISIS DE CAMPOS POTENCIALES CON DATOS DE VEHÍCULO:');
      const samplePart = processedParts[0];
      Object.entries(samplePart).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 2) {
          const hasCarBrand = /\b(RENAULT|PEUGEOT|CITROEN|FORD|SEAT|VOLKSWAGEN|AUDI|BMW|MERCEDES|OPEL|FIAT|TOYOTA|HONDA|NISSAN|HYUNDAI|KIA|MAZDA|SUBARU|MITSUBISHI|SUZUKI|VOLVO|ALFA|SKODA|DACIA)\b/i.test(value);
          if (hasCarBrand) {
            console.log(`  🎯 Campo "${key}": "${value}" (contiene marca de vehículo)`);
          }
        }
      });

    } else {
      console.log('❌ No se encontraron piezas procesadas en la muestra');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugProcessedVehiclesData();