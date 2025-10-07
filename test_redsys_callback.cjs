const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000';

async function testRedsysCallback() {
  console.log('🧪 Probando callback de Redsys con datos reales...\n');
  
  const orderId = 88;
  const orderNumber = "42923876826841"; // Número del pedido 88
  
  console.log(`📋 Usando pedido ID: ${orderId} (${orderNumber})`);
  
  // Simular callback exitoso de Redsys
  const merchantParameters = Buffer.from(JSON.stringify({
    Ds_Date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
    Ds_Hour: new Date().toTimeString().split(' ')[0],
    Ds_Amount: 350000, // 3500€ en céntimos 
    Ds_Currency: '978', // EUR
    Ds_Order: orderNumber.slice(-12), // Últimos 12 caracteres del número de pedido
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
  
  // Generar firma simulada 
  const signature = Buffer.from('test_signature_' + orderNumber + '_' + Date.now()).toString('base64');
  
  const callbackData = {
    Ds_MerchantParameters: merchantParameters,
    Ds_Signature: signature
  };
  
  console.log('📡 Enviando callback a /api/redsys/payment-notification...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/redsys/payment-notification`, callbackData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      validateStatus: () => true // Aceptar cualquier código de estado
    });
    
    console.log(`📊 Respuesta del callback: ${response.status}`);
    console.log('📄 Contenido:', response.data);
    
  } catch (error) {
    console.error('❌ Error en callback:', error.message);
  }
  
  console.log('\n🏁 Test completado');
}

testRedsysCallback().catch(console.error);