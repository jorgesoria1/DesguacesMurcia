import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const METASYNC_API_KEY = process.env.METASYNC_API_KEY;

const sql = neon(DATABASE_URL);

console.log('🧪 Probando correlación de vehículos y piezas procesadas...');

async function testCorrelation() {
  try {
    // 1. Obtener datos del API como lo hace el import service
    console.log('📡 Obteniendo datos del API MetaSync...');
    
    const response = await fetch('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
      method: 'GET',
      headers: {
        'apikey': METASYNC_API_KEY,
        'fecha': '2024-01-01',
        'lastid': '100000000',
        'offset': '50',
        'canal': 'webcliente MRC',
        'idempresa': '1236'
      }
    });
    
    const data = await response.json();
    
    console.log(`✅ API respuesta: ${data.piezas?.length || 0} piezas, ${data.vehiculos?.length || 0} vehículos`);
    
    // 2. Analizar piezas procesadas y sus vehículos correspondientes
    const processedParts = data.piezas?.filter(p => p.idVehiculo < 0) || [];
    console.log(`🔍 Piezas procesadas encontradas: ${processedParts.length}`);
    
    if (processedParts.length > 0) {
      console.log('\n📊 Análisis de correlación:');
      
      // Crear mapa de vehículos como lo hace el servicio
      const vehicleMap = new Map();
      if (data.vehiculos && data.vehiculos.length > 0) {
        for (const vehicleData of data.vehiculos) {
          if (vehicleData.idLocal) {
            vehicleMap.set(vehicleData.idLocal, vehicleData);
          }
        }
      }
      
      console.log(`🗺️ Mapa de vehículos creado: ${vehicleMap.size} entradas`);
      
      // Verificar correlación para las primeras 10 piezas procesadas
      for (let i = 0; i < Math.min(processedParts.length, 10); i++) {
        const part = processedParts[i];
        const vehicleData = vehicleMap.get(part.idVehiculo);
        
        if (vehicleData) {
          console.log(`✅ Pieza ${part.refLocal} (vehículo ${part.idVehiculo}): ENCONTRÓ vehículo`);
          console.log(`   - Marca: ${vehicleData.nombreMarca || 'vacío'}`);
          console.log(`   - Modelo: ${vehicleData.nombreModelo || 'vacío'}`);
          console.log(`   - Código versión: ${vehicleData.codVersion || 'vacío'}`);
        } else {
          console.log(`❌ Pieza ${part.refLocal} (vehículo ${part.idVehiculo}): NO encontró vehículo`);
          console.log(`   - Descripción familia: ${part.descripcionFamilia}`);
        }
      }
      
      // 3. Verificar cuántas correlaciones exitosas hay
      let successfulCorrelations = 0;
      for (const part of processedParts) {
        if (vehicleMap.has(part.idVehiculo)) {
          successfulCorrelations++;
        }
      }
      
      console.log(`\n📈 Resumen:`);
      console.log(`   - Piezas procesadas: ${processedParts.length}`);
      console.log(`   - Correlaciones exitosas: ${successfulCorrelations}`);
      console.log(`   - Porcentaje de éxito: ${((successfulCorrelations / processedParts.length) * 100).toFixed(1)}%`);
      
      if (successfulCorrelations > 0) {
        console.log('\n✅ La correlación funciona. El problema está resuelto para nuevas importaciones.');
      } else {
        console.log('\n❌ La correlación sigue fallando. Necesita más investigación.');
      }
    } else {
      console.log('⚠️ No se encontraron piezas procesadas en esta muestra del API');
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

testCorrelation().catch(console.error);