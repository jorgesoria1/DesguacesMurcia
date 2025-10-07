const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testRedsysCallbacksFixed() {
  console.log('🧪 Probando callbacks de Redsys con rutas corregidas...\n');
  
  const orderId = 88;
  const orderNumber = "42923876826841"; 
  const orderNumberShort = orderNumber.slice(-12); // Últimos 12 caracteres
  
  console.log(`📋 Usando pedido ID: ${orderId} (${orderNumber} -> ${orderNumberShort})`);
  
  // Crear datos de callback exitoso
  const merchantParameters = Buffer.from(JSON.stringify({
    Ds_Date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
    Ds_Hour: new Date().toTimeString().split(' ')[0],
    Ds_Amount: 350000, // 3500€ en céntimos 
    Ds_Currency: '978', // EUR
    Ds_Order: orderNumberShort, // Últimos 12 caracteres
    Ds_MerchantCode: '999008881',
    Ds_Terminal: '001',
    Ds_Response: '0000', // Éxito
    Ds_MerchantData: '',
    Ds_SecurePayment: '1',
    Ds_TransactionType: '0',
    Ds_Card_Country: '724',
    Ds_AuthorisationCode: 'ABC123',
    Ds_ConsumerLanguage: '1',
    Ds_Card_Type: 'D'
  })).toString('base64');
  
  const signature = Buffer.from('test_signature_' + orderNumber + '_' + Date.now()).toString('base64');
  
  const callbackData = {
    Ds_MerchantParameters: merchantParameters,
    Ds_Signature: signature
  };
  
  console.log('📡 Probando endpoint: /api/payment/redsys/notification...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/payment/redsys/notification`, callbackData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      validateStatus: () => true
    });
    
    console.log(`📊 Respuesta endpoint notification: ${response.status}`);
    console.log('📄 Contenido:', response.data);
    
  } catch (error) {
    console.error('❌ Error en endpoint notification:', error.message);
  }
  
  console.log('\n📡 Probando endpoint: /api/payment/redsys/callback...');
  
  try {
    const response2 = await axios.post(`${BASE_URL}/api/payment/redsys/callback`, callbackData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      validateStatus: () => true
    });
    
    console.log(`📊 Respuesta endpoint callback: ${response2.status}`);
    console.log('📄 Contenido:', response2.data);
    
  } catch (error) {
    console.error('❌ Error en endpoint callback:', error.message);
  }
  
  console.log('\n🏁 Test completado');
}

testRedsysCallbacksFixed().catch(console.error);