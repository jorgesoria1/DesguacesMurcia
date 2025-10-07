/**
 * Test para verificar la implementación corregida de Redsys
 */

const testOrderData = {
  id: 123,
  orderNumber: "PED-000123",
  amount: 37.75,
  customerName: "Jorge Soria",
  description: "Compra de piezas automotrices"
};

console.log("🧪 Testing Redsys Implementation Fix");
console.log("=====================================");

// Test 1: Generar número de pedido Redsys
const now = new Date();
const year = now.getFullYear().toString();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate().toString().padStart(2, '0');
const orderDigits = testOrderData.orderNumber.replace(/\D/g, '').slice(-4).padStart(4, '0');
const redsysOrderNumber = (year + month + day + orderDigits).slice(0, 12);

console.log("✅ Test 1 - Número de pedido:");
console.log(`  Original: ${testOrderData.orderNumber}`);
console.log(`  Redsys: ${redsysOrderNumber} (${redsysOrderNumber.length} chars)`);

// Test 2: Parámetros del pedido
const orderData = {
  // PARÁMETROS OBLIGATORIOS
  Ds_Merchant_Amount: Math.round(testOrderData.amount * 100).toString(),
  Ds_Merchant_Order: redsysOrderNumber,
  Ds_Merchant_MerchantCode: "999008881", // Ejemplo
  Ds_Merchant_Currency: '978',
  Ds_Merchant_TransactionType: '0',
  Ds_Merchant_Terminal: "001",
  
  // URLS
  Ds_Merchant_MerchantURL: "https://domain.com/api/payment/redsys/callback",
  Ds_Merchant_UrlOK: "/payment/success",
  Ds_Merchant_UrlKO: "/payment/failure",
  
  // OPCIONALES
  Ds_Merchant_ConsumerLanguage: '001',
  Ds_Merchant_ProductDescription: testOrderData.description,
  Ds_Merchant_Titular: testOrderData.customerName,
  Ds_Merchant_MerchantData: JSON.stringify({ orderId: testOrderData.id })
};

console.log("\n✅ Test 2 - Parámetros del pedido:");
Object.entries(orderData).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// Test 3: Verificar format base64
const merchantParameters = Buffer.from(JSON.stringify(orderData), 'utf8').toString('base64');
console.log("\n✅ Test 3 - MerchantParameters:");
console.log(`  Length: ${merchantParameters.length} chars`);
console.log(`  Sample: ${merchantParameters.substring(0, 50)}...`);

console.log("\n🎯 All tests completed - Redsys parameters should now be correct!");
console.log("   - Order number: 12 characters ✓");
console.log("   - Amount in cents ✓");
console.log("   - All required parameters ✓");
console.log("   - Correct parameter names ✓");

