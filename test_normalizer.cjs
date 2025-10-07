const { normalizeImagenesArray } = require('./server/utils/array-normalizer');

function testNormalizer() {
  console.log('=== TESTING NORMALIZER ===');
  
  // Test 1: Array válido
  const validArray = ['image1.jpg', 'image2.jpg'];
  console.log('Test 1 - Array válido:', normalizeImagenesArray(validArray));
  
  // Test 2: String
  const stringValue = 'image.jpg';
  console.log('Test 2 - String:', normalizeImagenesArray(stringValue));
  
  // Test 3: null
  const nullValue = null;
  console.log('Test 3 - null:', normalizeImagenesArray(nullValue));
  
  // Test 4: undefined
  const undefinedValue = undefined;
  console.log('Test 4 - undefined:', normalizeImagenesArray(undefinedValue));
  
  // Test 5: Array con elementos inválidos
  const mixedArray = ['image1.jpg', null, '', 'image2.jpg'];
  console.log('Test 5 - Array mixto:', normalizeImagenesArray(mixedArray));
  
  // Test 6: Array vacío
  const emptyArray = [];
  console.log('Test 6 - Array vacío:', normalizeImagenesArray(emptyArray));
  
  // Test 7: String vacío
  const emptyString = '';
  console.log('Test 7 - String vacío:', normalizeImagenesArray(emptyString));
  
  // Test 8: Objeto (que podría venir de la API)
  const objectValue = { url: 'image.jpg' };
  console.log('Test 8 - Objeto:', normalizeImagenesArray(objectValue));
  
  // Test 9: Número
  const numberValue = 123;
  console.log('Test 9 - Número:', normalizeImagenesArray(numberValue));
  
  console.log('=== TESTING COMPLETE ===');
}

testNormalizer();