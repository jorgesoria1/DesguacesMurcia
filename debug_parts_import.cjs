const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');

async function debugPartsImport() {
  console.log('=== DEBUGGING PARTS IMPORT ===');
  
  const service = new MetasyncOptimizedImportService();
  
  try {
    await service.configure();
    
    // Simular una llamada a la API para obtener piezas
    console.log('Obteniendo datos de prueba de piezas...');
    
    const endpoint = 'RecuperarCambiosCanal';
    const formattedDate = service.formatDate(new Date('1900-01-01T00:00:00.000Z'));
    
    const data = await service.fetchWithRetry(endpoint, {
      fecha: formattedDate,
      lastId: 0,
      offset: 5, // Solo 5 registros para debugging
      useParamsInUrl: false
    });
    
    console.log('Estructura de datos recibida:', Object.keys(data));
    
    // Buscar datos de piezas
    let partBatch = [];
    
    if (data.piezas && Array.isArray(data.piezas)) {
      partBatch = data.piezas.slice(0, 2); // Solo 2 piezas
      console.log('Formato encontrado: data.piezas');
    } else if (data.data?.piezas && Array.isArray(data.data.piezas)) {
      partBatch = data.data.piezas.slice(0, 2);
      console.log('Formato encontrado: data.data.piezas');
    } else {
      console.log('No se encontraron piezas en formato esperado');
      console.log('Datos disponibles:', JSON.stringify(data, null, 2).substring(0, 1000));
      return;
    }
    
    console.log(`\n=== PROCESANDO ${partBatch.length} PIEZAS ===`);
    
    for (let i = 0; i < partBatch.length; i++) {
      const partData = partBatch[i];
      console.log(`\n--- Pieza ${i + 1} ---`);
      console.log('refLocal:', partData.refLocal);
      console.log('descripción:', partData.descripcionArticulo);
      console.log('idVehiculo:', partData.idVehiculo);
      
      // Verificar campos de imágenes
      console.log('Campos de imágenes encontrados:');
      console.log('- imagenes:', partData.imagenes, typeof partData.imagenes);
      console.log('- UrlsImgs:', partData.UrlsImgs, typeof partData.UrlsImgs);
      console.log('- urlsImgs:', partData.urlsImgs, typeof partData.urlsImgs);
      console.log('- Imagenes:', partData.Imagenes, typeof partData.Imagenes);
      
      // Intentar normalizar la pieza completa
      try {
        const normalizedPart = service.normalizePart(partData);
        console.log('✅ Pieza normalizada exitosamente');
        console.log('Tipo de imagenes:', typeof normalizedPart.imagenes, Array.isArray(normalizedPart.imagenes));
        console.log('Contenido de imagenes:', normalizedPart.imagenes);
        
        // Verificar todos los campos que podrían ser problemáticos
        console.log('Verificando campos críticos:');
        console.log('- idVehiculo:', normalizedPart.idVehiculo, typeof normalizedPart.idVehiculo);
        console.log('- activo:', normalizedPart.activo, typeof normalizedPart.activo);
        console.log('- sincronizado:', normalizedPart.sincronizado, typeof normalizedPart.sincronizado);
        console.log('- isPendingRelation:', normalizedPart.isPendingRelation, typeof normalizedPart.isPendingRelation);
        
      } catch (error) {
        console.log('❌ Error normalizando pieza:', error.message);
        console.log('Stack trace:', error.stack);
      }
    }
    
  } catch (error) {
    console.error('Error en debug:', error);
  }
}

debugPartsImport();