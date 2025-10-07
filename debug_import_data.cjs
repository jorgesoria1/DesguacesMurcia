const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');
const { normalizeImagenesArray } = require('./server/utils/array-normalizer');

async function debugImportData() {
  console.log('=== DEBUGGING IMPORT DATA ===');
  
  const service = new MetasyncOptimizedImportService();
  
  try {
    // Configurar el servicio
    await service.configure();
    
    // Simular una llamada a la API para obtener vehículos
    console.log('Obteniendo datos de prueba de la API...');
    
    const endpoint = 'RecuperarCambiosCanal';
    const formattedDate = service.formatDate(new Date('1900-01-01T00:00:00.000Z'));
    
    const data = await service.fetchWithRetry(endpoint, {
      fecha: formattedDate,
      lastId: 0,
      offset: 5, // Solo 5 registros para debugging
      useParamsInUrl: false
    });
    
    console.log('Estructura de datos recibida:', Object.keys(data));
    
    // Buscar datos de vehículos
    let vehicleBatch = [];
    
    if (data.data?.vehiculos && Array.isArray(data.data.vehiculos)) {
      vehicleBatch = data.data.vehiculos.slice(0, 2); // Solo 2 vehículos
      console.log('Formato encontrado: data.data.vehiculos');
    } else if (data.vehiculos && Array.isArray(data.vehiculos)) {
      vehicleBatch = data.vehiculos.slice(0, 2);
      console.log('Formato encontrado: data.vehiculos');
    } else {
      console.log('No se encontraron vehículos en formato esperado');
      console.log('Datos disponibles:', JSON.stringify(data, null, 2).substring(0, 1000));
      return;
    }
    
    console.log(`\n=== PROCESANDO ${vehicleBatch.length} VEHÍCULOS ===`);
    
    for (let i = 0; i < vehicleBatch.length; i++) {
      const vehicleData = vehicleBatch[i];
      console.log(`\n--- Vehículo ${i + 1} ---`);
      console.log('idLocal:', vehicleData.idLocal);
      console.log('marca:', vehicleData.nombreMarca || vehicleData.marca);
      console.log('modelo:', vehicleData.nombreModelo || vehicleData.modelo);
      
      // Verificar campos de imágenes
      console.log('Campos de imágenes encontrados:');
      console.log('- imagenes:', vehicleData.imagenes, typeof vehicleData.imagenes);
      console.log('- UrlsImgs:', vehicleData.UrlsImgs, typeof vehicleData.UrlsImgs);
      console.log('- urlsImgs:', vehicleData.urlsImgs, typeof vehicleData.urlsImgs);
      console.log('- Imagenes:', vehicleData.Imagenes, typeof vehicleData.Imagenes);
      
      // Probar normalización
      const imageFields = [
        vehicleData.imagenes,
        vehicleData.UrlsImgs,
        vehicleData.urlsImgs,
        vehicleData.Imagenes
      ];
      
      let normalizedImages = [];
      
      for (const imageField of imageFields) {
        if (imageField) {
          try {
            normalizedImages = normalizeImagenesArray(imageField);
            console.log(`✅ Normalización exitosa de ${typeof imageField}:`, normalizedImages);
            break;
          } catch (error) {
            console.log(`❌ Error normalizando ${typeof imageField}:`, error.message);
          }
        }
      }
      
      if (normalizedImages.length === 0) {
        normalizedImages = ["https://via.placeholder.com/150?text=Sin+Imagen"];
        console.log('🔄 Usando imagen por defecto');
      }
      
      // Intentar normalizar el vehículo completo
      try {
        const normalizedVehicle = service.normalizeVehicle(vehicleData);
        console.log('✅ Vehículo normalizado exitosamente');
        console.log('Tipo de imagenes:', typeof normalizedVehicle.imagenes, Array.isArray(normalizedVehicle.imagenes));
        console.log('Contenido de imagenes:', normalizedVehicle.imagenes);
      } catch (error) {
        console.log('❌ Error normalizando vehículo:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error en debug:', error);
  }
}

// Ejecutar debug
debugImportData();