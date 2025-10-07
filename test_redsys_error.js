// Test para identificar el error específico de Redsys
const testOrder = {
  id: 123,
  orderNumber: "PED-000123",
  amount: 136.00,
  customerName: "Jorge Soria",
  customerEmail: "jorge@hispanaweb.com",
  description: "Pedido de prueba"
};

console.log("🧪 Testing Redsys Configuration Issues");
console.log("====================================");
console.log("Datos del pedido de prueba:", testOrder);

// Verificar si los campos requeridos están presentes
const requiredFields = ['id', 'orderNumber', 'amount', 'customerName'];
const missingFields = requiredFields.filter(field => !testOrder[field]);

if (missingFields.length > 0) {
  console.log("❌ Campos faltantes:", missingFields);
} else {
  console.log("✅ Todos los campos requeridos están presentes");
}

// Simular el error común: configuración faltante
console.log("\n🔧 Posibles causas del error:");
console.log("1. Configuración de Redsys no encontrada en base de datos");
console.log("2. Módulo Redsys no está activo (is_active = false)");
console.log("3. Campos de configuración faltantes (merchantCode, secretKey, terminal)");
console.log("4. Error en la generación del número de pedido");
console.log("5. Error en la generación de la firma");

console.log("\n📋 Verificar en admin panel:");
console.log("- Ir a Administración > Configuración > Métodos de Pago");
console.log("- Verificar que Redsys esté activo");
console.log("- Completar todos los campos: Merchant Code, Secret Key, Terminal");

