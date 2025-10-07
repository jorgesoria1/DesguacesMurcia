const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Función para hacer requests
async function apiRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error en ${method} ${url}:`, error.response?.status, error.response?.data || error.message);
    return { error: error.response?.data || error.message };
  }
}

async function testCallbackWorkflow() {
  console.log('🧪 Probando callbacks de Redsys...\n');
  
  // Obtener el pedido más reciente
  const orderId = 87; // Usar pedido conocido
  console.log(`📋 Usando pedido ID: ${orderId}`);
  
  // Crear datos de callback de Redsys simulados para un pago exitoso
  const orderNumber = "42921875530762"; // Número del pedido conocido
  
  const merchantParameters = Buffer.from(JSON.stringify({
    Ds_Date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
    Ds_Hour: new Date().toTimeString().split(' ')[0],
    Ds_Amount: 4500, // 45€ en céntimos
    Ds_Currency: '978', // EUR
    Ds_Order: orderNumber, // Número del pedido
    Ds_MerchantCode: '999008881',
    Ds_Terminal: '001',
    Ds_Response: '0000', // Código de éxito
    Ds_MerchantData: '',
    Ds_SecurePayment: '1',
    Ds_TransactionType: '0',
    Ds_Card_Country: '724',
    Ds_AuthorisationCode: '123456',
    Ds_ConsumerLanguage: '1',
    Ds_Card_Type: 'D'
  })).toString('base64');
  
  // Simular firma (en producción sería generada por Redsys)
  const signature = 'TEST_' + Buffer.from(orderNumber + '_' + Date.now()).toString('base64');
  
  const callbackData = {
    Ds_MerchantParameters: merchantParameters,
    Ds_Signature: signature
  };
  
  console.log('📡 Enviando callback de pago exitoso...');
  console.log('Datos del callback:', JSON.stringify(callbackData, null, 2));
  
  // Probar ambos endpoints de callback
  console.log('\n🔄 Probando endpoint payment-notification...');
  const response1 = await apiRequest('POST', '/api/redsys/payment-notification', callbackData);
  console.log('Respuesta payment-notification:', response1);
  
  console.log('\n🔄 Probando endpoint callback...');
  const response2 = await apiRequest('POST', '/api/redsys/callback', callbackData);
  console.log('Respuesta callback:', response2);
  
  console.log('\n🏁 Test de callback completado');
}

// Ejecutar test
testCallbackWorkflow().catch(console.error);