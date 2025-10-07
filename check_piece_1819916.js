
const axios = require('axios');
const { db } = require('./server/db');
const { parts } = require('./shared/schema');
const { eq } = require('drizzle-orm');

async function checkPiece1819916() {
  try {
    console.log('🔍 Verificando pieza 1819916 en base de datos y API...\n');
    
    // 1. Verificar en base de datos local
    const [localPiece] = await db
      .select()
      .from(parts)
      .where(eq(parts.refLocal, 1819916));
    
    if (localPiece) {
      console.log('📦 PIEZA EN BASE DE DATOS LOCAL:');
      console.log('  ID:', localPiece.id);
      console.log('  RefLocal:', localPiece.refLocal);
      console.log('  Activa:', localPiece.activo);
      console.log('  Disponible en API:', localPiece.disponibleApi);
      console.log('  Descripción:', localPiece.descripcionArticulo);
      console.log('  Familia:', localPiece.descripcionFamilia);
      console.log('  Precio:', localPiece.precio);
      console.log('  ID Vehículo:', localPiece.idVehiculo);
      console.log('  Marca Vehículo:', localPiece.vehicleMarca);
      console.log('  Modelo Vehículo:', localPiece.vehicleModelo);
      console.log('  Última sincronización:', localPiece.ultimaSincronizacion);
      console.log('  Fecha actualización:', localPiece.fechaActualizacion);
      console.log('');
    } else {
      console.log('❌ Pieza 1819916 NO encontrada en base de datos local\n');
    }
    
    // 2. Obtener configuración de API
    const { apiConfig: apiConfigTable } = require('./shared/schema');
    const [config] = await db
      .select()
      .from(apiConfigTable)
      .where(eq(apiConfigTable.active, true));
    
    if (!config) {
      console.log('❌ No hay configuración de API activa');
      process.exit(1);
    }
    
    console.log('🔑 Configuración API:');
    console.log('  API Key:', config.apiKey.substring(0, 10) + '***');
    console.log('  Company ID:', config.companyId);
    console.log('  Canal:', config.channel);
    console.log('');
    
    // 3. Buscar en API usando RecuperarCambiosCanal
    console.log('🌐 Buscando en API de MetaSync...\n');
    
    const formatDate = (date) => {
      const d = date;
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    };
    
    // Buscar desde fecha antigua para obtener todo
    const oldDate = formatDate(new Date('1900-01-01'));
    
    let foundInApi = false;
    let lastId = 0;
    let attempts = 0;
    const maxAttempts = 200; // Buscar en hasta 200,000 piezas
    
    while (!foundInApi && attempts < maxAttempts) {
      attempts++;
      
      try {
        const response = await axios.get('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
          headers: {
            'apikey': config.apiKey,
            'fecha': oldDate,
            'lastid': lastId.toString(),
            'offset': '1000',
            'canal': config.channel,
            'idempresa': config.companyId.toString()
          },
          timeout: 20000
        });
        
        const piezas = response.data?.piezas || response.data?.data?.piezas || [];
        
        if (piezas.length === 0) {
          console.log(`Sin más piezas en lote ${attempts}`);
          break;
        }
        
        // Buscar la pieza específica
        const targetPiece = piezas.find(p => p.refLocal === 1819916);
        
        if (targetPiece) {
          foundInApi = true;
          console.log('✅ PIEZA 1819916 ENCONTRADA EN API:');
          console.log('  RefLocal:', targetPiece.refLocal);
          console.log('  ID Vehículo:', targetPiece.idVehiculo);
          console.log('  Código Familia:', targetPiece.codFamilia);
          console.log('  Descripción Familia:', targetPiece.descripcionFamilia);
          console.log('  Código Artículo:', targetPiece.codArticulo);
          console.log('  Descripción Artículo:', targetPiece.descripcionArticulo);
          console.log('  Precio:', targetPiece.precio);
          console.log('  Año Stock:', targetPiece.anyoStock);
          console.log('  Peso:', targetPiece.peso);
          console.log('  Ubicación:', targetPiece.ubicacion);
          console.log('  Observaciones:', targetPiece.observaciones);
          console.log('  Reserva:', targetPiece.reserva);
          console.log('  Tipo Material:', targetPiece.tipoMaterial);
          console.log('  Fecha Mod:', targetPiece.fechaMod);
          console.log('  Imágenes:', targetPiece.urlsImgs?.length || 0);
          console.log('');
          
          // Comparar con datos locales
          if (localPiece) {
            console.log('📊 COMPARACIÓN LOCAL vs API:');
            console.log('  Precio - Local:', localPiece.precio, '| API:', targetPiece.precio);
            console.log('  Descripción - Local:', localPiece.descripcionArticulo, '| API:', targetPiece.descripcionArticulo);
            console.log('  ID Vehículo - Local:', localPiece.idVehiculo, '| API:', targetPiece.idVehiculo);
            console.log('  Estado en BD - Activo:', localPiece.activo, '| Disponible API:', localPiece.disponibleApi);
            console.log('');
            
            if (localPiece.precio !== String(targetPiece.precio)) {
              console.log('⚠️  DIFERENCIA en precio');
            }
            if (localPiece.idVehiculo !== targetPiece.idVehiculo) {
              console.log('⚠️  DIFERENCIA en ID de vehículo');
            }
          }
          
          break;
        }
        
        // Actualizar lastId para siguiente lote
        if (piezas.length > 0) {
          lastId = piezas[piezas.length - 1].refLocal;
        }
        
        if (attempts % 10 === 0) {
          console.log(`Buscando... lote ${attempts}, lastId: ${lastId}`);
        }
        
      } catch (error) {
        console.error(`Error en lote ${attempts}:`, error.message);
        break;
      }
    }
    
    if (!foundInApi) {
      console.log('❌ PIEZA 1819916 NO ENCONTRADA EN API después de', attempts, 'lotes');
      console.log('');
      
      if (localPiece) {
        console.log('⚠️  CONCLUSIÓN: La pieza existe en BD local pero NO en la API');
        console.log('   - Esto puede significar que fue eliminada del stock en MetaSync');
        console.log('   - Estado actual en BD: activo =', localPiece.activo);
        console.log('   - Debería estar desactivada si ya no está en la API');
      }
    } else {
      console.log('✅ CONCLUSIÓN: La pieza existe tanto en BD local como en la API');
      if (localPiece && localPiece.activo) {
        console.log('   - Estado correcto: activada en web y presente en API');
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPiece1819916();
