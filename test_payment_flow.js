/**
 * Test del flujo completo de pago para diagnosticar el error 400
 */

const { exec } = require('child_process');

console.log("🧪 TESTING COMPLETE PAYMENT FLOW");
console.log("================================");

// Simular datos de un pedido real
const mockOrder = {
  id: 123,
  orderNumber: "PED-000123",
  amount: 136.50,
  customerName: "Jorge Soria",
  customerEmail: "jorge@hispanaweb.com",
  description: "Pedido test Redsys",
  items: [
    {
      partId: 10490032,
      quantity: 1,
      price: 121.00,
      partName: "PARAGOLPES DELANTERO"
    }
  ]
};

console.log("✅ Datos del pedido simulado:");
console.log(JSON.stringify(mockOrder, null, 2));

// Test 1: Verificar configuración en base de datos
console.log("\n🔧 Test 1: Verificando configuración de Redsys...");

// Test 2: Simular llamada al endpoint
const testPayload = JSON.stringify(mockOrder);
const curlCommand = `curl -X POST http://localhost:5000/api/payment/redsys/process \\
  -H "Content-Type: application/json" \\
  -d '${testPayload}' \\
  -v 2>&1`;

console.log("📡 Comando de prueba:");
console.log(curlCommand);

exec(curlCommand, (error, stdout, stderr) => {
  console.log("\n📊 RESULTADO DEL TEST:");
  
  if (error) {
    console.log("❌ Error en la ejecución:");
    console.log(error.message);
  }
  
  if (stderr) {
    console.log("🔍 Info de conexión:");
    console.log(stderr);
  }
  
  if (stdout) {
    console.log("📋 Respuesta del servidor:");
    console.log(stdout);
    
    try {
      const response = JSON.parse(stdout);
      if (!response.success) {
        console.log("❌ ERROR IDENTIFICADO:", response.errorMessage);
        console.log("🔧 Posibles soluciones:");
        console.log("1. Verificar que el módulo Redsys esté activo");
        console.log("2. Completar configuración (Merchant Code, Secret Key, Terminal)");
        console.log("3. Verificar formato de datos del pedido");
      }
    } catch (e) {
      console.log("⚠️ Respuesta no es JSON válido");
    }
  }
});

setTimeout(() => {
  console.log("\n🎯 SIGUIENTE PASO:");
  console.log("Ejecuta este script y luego intenta hacer un pedido real");
  console.log("Los logs mostrarán exactamente dónde está fallando el proceso");
}, 1000);

