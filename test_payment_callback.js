// Test para verificar que el callback de pago funciona correctamente
// Este script simula un callback de Redsys exitoso

const axios = require('axios');

async function testPaymentCallback() {
  console.log('🧪 Probando callback de pago de Redsys...');
  
  // Simular datos de un callback exitoso de Redsys
  const testData = {
    Ds_MerchantParameters: Buffer.from(JSON.stringify({
      Ds_Order: '000000000086', // Pedido existente de prueba
      Ds_Response: '0000', // Código de éxito
      Ds_Amount: '4413', // Cantidad en céntimos
      Ds_AuthorisationCode: '567517',
      Ds_Currency: '978'
    })).toString('base64'),
    Ds_Signature: 'fake_signature_for_test'
  };

  try {
    console.log('📡 Enviando callback de prueba...');
    
    const response = await axios.post('http://localhost:5000/api/payment/redsys/callback', testData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ Respuesta del callback:', response.status);
    console.log('📝 Datos:', response.data);
    
  } catch (error) {
    console.log('❌ Error en test:', error.response?.status, error.response?.data);
  }
}

// Ejecutar test
testPaymentCallback();