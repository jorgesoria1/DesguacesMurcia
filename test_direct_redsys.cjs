const axios = require('axios');

async function testDirectRedsys() {
  console.log('🧪 TEST DIRECTO REDSYS');
  
  try {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos
    
    console.log('Testeando endpoint /api/payment/redsys/process...');
    
    const paymentOrder = {
      orderId: 12345,
      orderNumber: "TEST-001",
      amount: 25.50,
      customerEmail: "test@example.com",
      customerName: "Juan Pérez Test",
      returnUrl: "http://localhost:5000/payment/success",
      cancelUrl: "http://localhost:5000/payment/failure",
      metadata: { orderId: 12345 }
    };
    
    const response = await axios.post('http://localhost:5000/api/payment/redsys/process', paymentOrder);
    
    console.log('✅ RESPUESTA EXITOSA:');
    console.log('- Status:', response.status);
    console.log('- Success:', response.data.success);
    console.log('- Tiene formHtml:', !!response.data.data?.formHtml);
    console.log('- ActionUrl:', response.data.data?.actionUrl);
    console.log('- Signature:', response.data.data?.signature);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDirectRedsys();