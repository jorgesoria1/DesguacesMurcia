const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testPaymentFlowSimple() {
  console.log('🧪 Probando flujo de pago con endpoint de test...\n');
  
  const orderId = 88;
  
  // Verificar estado inicial
  console.log('📊 Estado inicial:');
  try {
    const checkOrder = await axios.get(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { 'X-Session-ID': 'test_payment_session_123' }
    });
    console.log(`   Pedido ${orderId}: ${checkOrder.data.paymentStatus} / ${checkOrder.data.orderStatus}`);
    
    const checkPart = await axios.get(`${BASE_URL}/api/parts/767472`);
    console.log(`   Pieza 767472: activo=${checkPart.data.activo}`);
    
    const checkCart = await axios.get(`${BASE_URL}/api/cart/session/test_payment_session_123`);
    console.log(`   Carrito: ${checkCart.data?.items?.length || 0} items`);
    
  } catch (error) {
    console.log('   ⚠️ No se pudo verificar estado inicial');
  }
  
  // Ejecutar flujo de pago
  console.log('\n💳 Ejecutando flujo de pago...');
  try {
    const response = await axios.post(`${BASE_URL}/api/payment/redsys/test-callback`, {
      orderId: orderId
    });
    
    console.log('✅ Respuesta:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data);
  }
  
  // Verificar estado final
  console.log('\n📊 Estado final:');
  try {
    const finalOrder = await axios.get(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { 'X-Session-ID': 'test_payment_session_123' }
    });
    console.log(`   Pedido ${orderId}: ${finalOrder.data.paymentStatus} / ${finalOrder.data.orderStatus}`);
    
    const finalPart = await axios.get(`${BASE_URL}/api/parts/767472`);
    console.log(`   Pieza 767472: activo=${finalPart.data.activo}`);
    
    const finalCart = await axios.get(`${BASE_URL}/api/cart/session/test_payment_session_123`);
    console.log(`   Carrito: ${finalCart.data?.items?.length || 0} items`);
    
  } catch (error) {
    console.log('   ⚠️ No se pudo verificar estado final');
  }
  
  console.log('\n🏁 Test completado');
}

testPaymentFlowSimple().catch(console.error);