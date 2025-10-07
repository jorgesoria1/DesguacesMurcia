const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');
const { normalizeImagenesArray } = require('./server/utils/array-normalizer');

async function testRealImport() {
  console.log('=== TESTING REAL IMPORT ===');
  
  try {
    const service = new MetasyncOptimizedImportService();
    await service.configure();
    
    console.log('Service configured successfully');
    
    // Simular datos reales que podrían venir de la API
    console.log('\n--- Testing Real Vehicle Data ---');
    
    const realVehicleData = {
      idLocal: 12345,
      idEmpresa: 1236,
      nombreMarca: 'BMW',
      nombreModelo: 'X5',
      nombreVersion: '3.0d',
      anyoVehiculo: 2015,
      combustible: 'Diesel',
      bastidor: 'WBAFG91080L123456',
      matricula: 'ABC123',
      color: 'Negro',
      kilometraje: 150000,
      potenciaHP: 245,
      puertas: 5,
      // Diferentes formatos de imágenes que podrían venir de la API
      UrlsImgs: 'https://example.com/img1.jpg,https://example.com/img2.jpg',
      fechaMod: '2025-07-17 10:00:00'
    };
    
    console.log('Probando normalización de vehículo...');
    console.log('UrlsImgs original:', realVehicleData.UrlsImgs);
    console.log('Type:', typeof realVehicleData.UrlsImgs);
    
    // Probar normalizador directamente
    const normalizedImages = normalizeImagenesArray(realVehicleData.UrlsImgs);
    console.log('Normalized images:', normalizedImages);
    
    // Simular lo que hace el normalizeVehicle
    let imagenes = [];
    const imageFields = [
      realVehicleData.imagenes,
      realVehicleData.UrlsImgs,
      realVehicleData.urlsImgs,
      realVehicleData.Imagenes
    ];
    
    for (const imageField of imageFields) {
      if (imageField) {
        console.log(`Processing image field: ${imageField} (${typeof imageField})`);
        imagenes = normalizeImagenesArray(imageField);
        console.log('Processed to:', imagenes);
        break;
      }
    }
    
    console.log('Final imagenes array:', imagenes);
    
    // Probar con diferentes tipos de datos de imagen
    console.log('\n--- Testing Different Image Formats ---');
    
    const testCases = [
      { name: 'String with comma', data: 'img1.jpg,img2.jpg,img3.jpg' },
      { name: 'String single', data: 'single-image.jpg' },
      { name: 'Array valid', data: ['img1.jpg', 'img2.jpg'] },
      { name: 'Array mixed', data: ['img1.jpg', null, '', 'img2.jpg'] },
      { name: 'null', data: null },
      { name: 'undefined', data: undefined },
      { name: 'Empty string', data: '' },
      { name: 'Object (invalid)', data: { url: 'img.jpg' } },
      { name: 'Number (invalid)', data: 123 },
      { name: 'Boolean (invalid)', data: true },
      { name: 'Array with strings and numbers', data: ['img1.jpg', 123, 'img2.jpg'] },
      { name: 'Complex string', data: 'https://example.com/img1.jpg,/assets/img2.png,data:image/jpeg;base64,ABC123' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\nTesting ${testCase.name}:`);
      console.log('Input:', testCase.data);
      console.log('Type:', typeof testCase.data);
      console.log('Array check:', Array.isArray(testCase.data));
      
      try {
        const result = normalizeImagenesArray(testCase.data);
        console.log('Result:', result);
      } catch (error) {
        console.error('Error:', error.message);
      }
    }
    
    console.log('\n--- Testing Parts Data ---');
    
    const realPartData = {
      refLocal: 98765,
      idEmpresa: 1236,
      idVehiculo: 12345,
      codFamilia: 'MOT',
      descripcionFamilia: 'MOTOR',
      codArticulo: 'MOT001',
      descripcionArticulo: 'Motor completo',
      refPrincipal: 'BMW-MOT-001',
      anyoInicio: 2010,
      anyoFin: 2020,
      puertas: 5,
      precio: '2500.00',
      peso: '150.5',
      ubicacion: 1,
      observaciones: 'Motor en buen estado',
      reserva: 0,
      tipoMaterial: 1,
      // Diferentes formatos de imágenes para parts
      UrlsImgs: 'motor1.jpg,motor2.jpg',
      fechaMod: '2025-07-17 10:00:00'
    };
    
    console.log('Probando normalización de pieza...');
    console.log('UrlsImgs original:', realPartData.UrlsImgs);
    
    const partNormalizedImages = normalizeImagenesArray(realPartData.UrlsImgs);
    console.log('Normalized part images:', partNormalizedImages);
    
  } catch (error) {
    console.error('General error:', error);
    console.error('Error stack:', error.stack);
  }
}

testRealImport();