const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000';

// Función para hacer requests
async function apiRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test_session_123'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error en ${method} ${url}:`, error.response?.data || error.message);
    return null;
  }
}

// Función para generar firma de Redsys
function generateRedsysSignature(merchantParameters, secretKey) {
  // Simular el proceso de firma de Redsys
  const key = Buffer.from(secretKey, 'base64');
  const cipher = crypto.createCipher('des-ede3-cbc', key);
  let encrypted = cipher.update(merchantParameters, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

async function testPaymentWorkflow() {
  console.log('🧪 Iniciando test del flujo de pago completo...\n');
  
  // 1. Obtener una pieza activa para agregar al carrito
  console.log('1. Obteniendo pieza activa...');
  const partsResponse = await apiRequest('GET', '/api/parts?limit=1&offset=0&showProcessed=true');
  if (!partsResponse || !partsResponse.data || partsResponse.data.length === 0) {
    console.error('❌ No se encontraron piezas activas');
    return;
  }
  
  const testPart = partsResponse.data[0];
  console.log(`✅ Pieza encontrada: ${testPart.descripcionArticulo} (ID: ${testPart.id})`);
  
  // 2. Agregar pieza al carrito (como invitado)
  console.log('\n2. Agregando pieza al carrito...');
  const cartResponse = await apiRequest('POST', '/api/cart/add', {
    partId: testPart.id,
    quantity: 1,
    sessionId: 'test_session_123'
  });
  
  if (!cartResponse) {
    console.error('❌ Error al agregar pieza al carrito');
    return;
  }
  
  console.log('✅ Pieza agregada al carrito');
  
  // 3. Verificar carrito
  console.log('\n3. Verificando carrito...');
  const cartCheck = await apiRequest('GET', '/api/cart/guest/test_session_123');
  console.log('Respuesta del carrito:', JSON.stringify(cartCheck, null, 2));
  
  if (!cartCheck || !cartCheck.items || cartCheck.items.length === 0) {
    console.error('❌ El carrito está vacío');
    return;
  }
  
  console.log(`✅ Carrito verificado: ${cartCheck.items.length} item(s)`);
  
  // 4. Crear pedido local (simulando checkout)
  console.log('\n4. Creando pedido...');
  const orderData = {
    items: [{
      partId: testPart.id,
      quantity: 1,
      price: parseFloat(testPart.precio),
      partName: testPart.descripcionArticulo,
      partFamily: testPart.descripcionFamilia
    }],
    sessionId: 'test_session_123',
    customerName: 'Test',
    customerLastName: 'User',
    customerEmail: 'test@example.com',
    customerPhone: '666123456',
    shippingAddress: 'Calle Test 123',
    shippingCity: 'Murcia',
    shippingPostalCode: '30001',
    shippingCountry: 'España',
    subtotal: testPart.precio,
    shippingCost: '5.00',
    total: (parseFloat(testPart.precio) + 5.00).toString(),
    paymentMethodId: 'redsys',
    shippingMethodId: 1,
    notes: 'Test order'
  };
  
  const orderResponse = await apiRequest('POST', '/api/orders/local', orderData);
  if (!orderResponse) {
    console.error('❌ Error al crear pedido');
    return;
  }
  
  console.log(`✅ Pedido creado: ID ${orderResponse.id}, SessionID: ${orderResponse.sessionId}`);
  
  // 5. Simular callback de Redsys exitoso
  console.log('\n5. Simulando callback de Redsys...');
  
  // Crear parámetros de Redsys simulados
  const merchantParameters = Buffer.from(JSON.stringify({
    Ds_Date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
    Ds_Hour: new Date().toTimeString().split(' ')[0],
    Ds_Amount: Math.round(parseFloat(orderData.total) * 100), // En céntimos
    Ds_Currency: '978', // EUR
    Ds_Order: orderResponse.orderNumber.slice(-12), // Últimos 12 caracteres
    Ds_MerchantCode: '999008881',
    Ds_Terminal: '001',
    Ds_Response: '0000', // Éxito
    Ds_MerchantData: '',
    Ds_SecurePayment: '1',
    Ds_TransactionType: '0',
    Ds_Card_Country: '724',
    Ds_AuthorisationCode: '123456',
    Ds_ConsumerLanguage: '1',
    Ds_Card_Type: 'D'
  })).toString('base64');
  
  // Simular firma (en producción sería generada por Redsys)
  const signature = 'simulated_signature_' + Date.now();
  
  const callbackData = {
    Ds_MerchantParameters: merchantParameters,
    Ds_Signature: signature
  };
  
  const callbackResponse = await apiRequest('POST', '/api/redsys/payment-notification', callbackData);
  
  console.log('📡 Callback enviado');
  
  // 6. Verificar estado del pedido después del callback
  console.log('\n6. Verificando estado del pedido...');
  
  // Esperar un poco para que se procese el callback
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const orderCheck = await apiRequest('GET', `/api/orders/${orderResponse.id}`);
  if (!orderCheck) {
    console.error('❌ No se pudo verificar el pedido');
    return;
  }
  
  console.log(`📋 Estado del pedido:
  - Payment Status: ${orderCheck.paymentStatus}
  - Order Status: ${orderCheck.orderStatus}
  - Session ID: ${orderCheck.sessionId}`);
  
  // 7. Verificar si el carrito se limpió
  console.log('\n7. Verificando si el carrito se limpió...');
  const cartAfterPayment = await apiRequest('GET', '/api/cart/guest/test_session_123');
  
  if (!cartAfterPayment || cartAfterPayment.items.length === 0) {
    console.log('✅ El carrito se limpió correctamente');
  } else {
    console.log(`❌ El carrito aún tiene ${cartAfterPayment.items.length} item(s)`);
  }
  
  // 8. Verificar si la pieza se desactivó
  console.log('\n8. Verificando si la pieza se desactivó...');
  const partAfterPayment = await apiRequest('GET', `/api/parts/${testPart.id}`);
  
  if (partAfterPayment && !partAfterPayment.activo) {
    console.log('✅ La pieza se desactivó correctamente');
  } else {
    console.log(`❌ La pieza sigue activa: ${partAfterPayment?.activo}`);
  }
  
  console.log('\n🏁 Test completado');
}

// Ejecutar test
testPaymentWorkflow().catch(console.error);