const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testPaymentLogicDirectly() {
  console.log('🧪 Probando lógica de pago directamente sin validación de firma...\n');
  
  const orderId = 88;
  const orderNumber = "42923876826841"; 
  const orderNumberShort = orderNumber.slice(-12);
  
  console.log(`📋 Usando pedido ID: ${orderId} (${orderNumber} -> ${orderNumberShort})`);
  
  // Primero verificar el estado inicial
  console.log('🔍 Estado inicial del pedido...');
  try {
    const checkOrder = await axios.get(`${BASE_URL}/api/orders/${orderId}`);
    console.log('📊 Estado inicial pedido:', {
      id: checkOrder.data.id,
      paymentStatus: checkOrder.data.paymentStatus,
      orderStatus: checkOrder.data.orderStatus,
      sessionId: checkOrder.data.sessionId
    });
  } catch (error) {
    console.error('❌ Error verificando pedido inicial');
  }
  
  // Simulación manual del proceso post-pago exitoso
  console.log('\n💳 Simulando acciones post-pago exitoso...');
  
  try {
    // 1. Actualizar estado del pedido
    console.log('1️⃣ Actualizando estado del pedido...');
    const updateOrder = await axios.patch(`${BASE_URL}/api/orders/${orderId}`, {
      paymentStatus: 'pagado',
      orderStatus: 'verificado'
    });
    console.log('✅ Estado actualizado:', updateOrder.status);
    
    // 2. Desactivar piezas 
    console.log('2️⃣ Desactivando piezas del pedido...');
    const deactivateParts = await axios.post(`${BASE_URL}/api/orders/${orderId}/deactivate-parts`);
    console.log('✅ Piezas desactivadas:', deactivateParts.status);
    
    // 3. Limpiar carrito por sessionId
    console.log('3️⃣ Limpiando carrito de la sesión...');
    const clearCart = await axios.post(`${BASE_URL}/api/cart/clear-by-session`, {
      sessionId: 'test_payment_session_123'
    });
    console.log('✅ Carrito limpiado:', clearCart.status);
    
  } catch (error) {
    console.error('❌ Error en simulación:', error.response?.status, error.response?.data);
  }
  
  // Verificar estado final
  console.log('\n🔍 Estado final...');
  try {
    const finalOrder = await axios.get(`${BASE_URL}/api/orders/${orderId}`);
    console.log('📊 Estado final pedido:', {
      id: finalOrder.data.id,
      paymentStatus: finalOrder.data.paymentStatus,
      orderStatus: finalOrder.data.orderStatus
    });
    
    const checkPart = await axios.get(`${BASE_URL}/api/parts/767472`);
    console.log('📊 Estado final pieza 767472:', {
      id: checkPart.data.id,
      activo: checkPart.data.activo
    });
    
    const checkCart = await axios.get(`${BASE_URL}/api/cart/session/test_payment_session_123`);
    console.log('📊 Estado final carrito:', {
      id: checkCart.data?.id,
      itemsCount: checkCart.data?.items?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Error verificando estado final');
  }
  
  console.log('\n🏁 Test de lógica completado');
}

testPaymentLogicDirectly().catch(console.error);