#!/usr/bin/env node

/**
 * Test completo del flujo de pagos Redsys
 * Simula una compra real desde el carrito hasta el pago
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testCompleteRedsysFlow() {
  console.log('🧪 ===== TEST COMPLETO REDSYS FLOW =====');
  
  try {
    // Paso 1: Obtener algunas piezas disponibles
    console.log('\n1️⃣ Obteniendo piezas disponibles...');
    const partsResponse = await axios.get(`${BASE_URL}/api/parts?limit=3`);
    const parts = partsResponse.data.parts;
    
    if (!parts || parts.length === 0) {
      throw new Error('No hay piezas disponibles para el test');
    }
    
    console.log(`   ✓ Encontradas ${parts.length} piezas`);
    const testPart = parts[0];
    console.log(`   ✓ Usando pieza: ${testPart.referencia} - ${testPart.precio}€`);
    
    // Paso 2: Crear un pedido de test
    console.log('\n2️⃣ Creando pedido de test...');
    const orderData = {
      customerName: "Juan",
      customerLastName: "Pérez",
      customerEmail: "test@redsys.com",
      customerPhone: "123456789",
      shippingAddress: "Calle Test 123",
      shippingCity: "Murcia",
      shippingProvince: "Murcia",
      shippingPostalCode: "30001",
      paymentMethodId: "9", // ID de Redsys
      shippingMethodId: "1",
      notes: "Test de Redsys",
      createAccount: false,
      items: [{
        partId: testPart.id,
        quantity: 1,
        price: parseFloat(testPart.precio),
        name: testPart.referencia
      }],
      sessionId: 'test-session-' + Date.now()
    };
    
    const orderResponse = await axios.post(`${BASE_URL}/api/orders`, orderData);
    
    if (orderResponse.status !== 201) {
      throw new Error(`Error creando pedido: ${orderResponse.status}`);
    }
    
    const order = orderResponse.data;
    console.log(`   ✓ Pedido creado: ID ${order.id}, Total: ${order.total}€`);
    
    // Paso 3: Procesar pago con Redsys
    console.log('\n3️⃣ Procesando pago con Redsys...');
    const paymentOrder = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: parseFloat(order.total),
      customerEmail: orderData.customerEmail,
      customerName: `${orderData.customerName} ${orderData.customerLastName}`,
      returnUrl: `${BASE_URL}/payment/success`,
      cancelUrl: `${BASE_URL}/payment/failure`,
      metadata: { orderId: order.id }
    };
    
    const paymentResponse = await axios.post(`${BASE_URL}/api/payment/redsys/process`, paymentOrder);
    
    if (paymentResponse.status !== 200) {
      throw new Error(`Error procesando pago: ${paymentResponse.status}`);
    }
    
    const paymentResult = paymentResponse.data;
    console.log(`   ✓ Pago procesado exitosamente`);
    console.log(`   ✓ URL de Redsys: ${paymentResult.data.actionUrl}`);
    console.log(`   ✓ Número de pedido Redsys: ${paymentResult.data.redsysOrderNumber}`);
    console.log(`   ✓ Formulario HTML generado: ${paymentResult.data.formHtml ? 'SÍ' : 'NO'}`);
    
    // Paso 4: Verificar los datos del formulario
    console.log('\n4️⃣ Verificando datos del formulario...');
    const formData = paymentResult.data;
    
    if (!formData.merchantParameters || !formData.signature) {
      throw new Error('Faltan parámetros críticos en la respuesta');
    }
    
    // Decodificar parámetros para verificar
    const decodedParams = JSON.parse(Buffer.from(formData.merchantParameters, 'base64').toString('utf8'));
    console.log(`   ✓ Parámetros decodificados correctamente`);
    console.log(`   ✓ Importe: ${decodedParams.Ds_Merchant_Amount} céntimos`);
    console.log(`   ✓ Código comercio: ${decodedParams.Ds_Merchant_MerchantCode}`);
    console.log(`   ✓ Terminal: ${decodedParams.Ds_Merchant_Terminal}`);
    console.log(`   ✓ Número pedido: ${decodedParams.Ds_Merchant_Order}`);
    
    // Paso 5: Simular datos que recibiría la página intermedia
    console.log('\n5️⃣ Simulando datos para página intermedia...');
    const intermediatePageData = {
      formHtml: formData.formHtml,
      actionUrl: formData.actionUrl,
      merchantParameters: formData.merchantParameters,
      signature: formData.signature,
      orderNumber: order.orderNumber,
      amount: parseFloat(order.total),
      reference: order.orderNumber,
      totalAmount: parseFloat(order.total),
      redsysOrderNumber: formData.redsysOrderNumber
    };
    
    console.log(`   ✓ Datos preparados para sessionStorage`);
    console.log(`   ✓ Formulario HTML: ${intermediatePageData.formHtml.length} caracteres`);
    console.log(`   ✓ URL de acción: ${intermediatePageData.actionUrl}`);
    
    // Resultado final
    console.log('\n✅ ===== TEST COMPLETADO EXITOSAMENTE =====');
    console.log('🔍 RESUMEN:');
    console.log(`   - Pedido ID: ${order.id}`);
    console.log(`   - Número pedido: ${order.orderNumber}`);
    console.log(`   - Total: ${order.total}€`);
    console.log(`   - Redsys Order: ${formData.redsysOrderNumber}`);
    console.log(`   - Cliente: ${orderData.customerName} ${orderData.customerLastName}`);
    console.log(`   - Email: ${orderData.customerEmail}`);
    console.log('\n🎯 SIGUIENTE PASO: Los datos están listos para enviar a Redsys');
    console.log('   La página intermedia debería procesar estos datos correctamente');
    
    return {
      success: true,
      order,
      paymentData: intermediatePageData
    };
    
  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Ejecutar test
if (require.main === module) {
  testCompleteRedsysFlow()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error ejecutando test:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteRedsysFlow };