// Test para verificar el bug del cálculo de peso de envío
const testShippingBug = async () => {
  console.log("🧪 TESTING SHIPPING WEIGHT BUG");
  console.log("=".repeat(50));
  
  // Simulamos exactamente lo que ve el usuario en la captura:
  // - 1 LUZ DE FRENO 
  // - Código: 0130047
  // - Cantidad: 19
  // - Precio unitario: 24.20€ (459.80€ ÷ 19)
  
  console.log("📋 Caso de prueba del usuario:");
  console.log("  - Producto: LUZ DE FRENO");
  console.log("  - Código: 0130047");
  console.log("  - Cantidad: 19 unidades");
  console.log("  - Precio total: 459.80€ (24.20€/unidad)");
  console.log("  - Envío esperado por usuario: 5.80€");
  console.log();

  // 1. Buscar la pieza por código
  console.log("🔍 PASO 1: Buscar pieza por código");
  try {
    const response = await fetch("http://localhost:5000/api/search-parts?search=0130047&limit=1");
    const data = await response.json();
    const part = data.data[0];
    
    if (part) {
      console.log(`✅ Pieza encontrada:`);
      console.log(`    ID: ${part.id}`);
      console.log(`    Descripción: ${part.descripcionArticulo}`);
      console.log(`    Código: ${part.codArticulo}`);
      console.log(`    Peso: ${part.peso}g`);
      console.log(`    Precio: ${part.precio}€`);
      console.log();

      // 2. Simular cálculo de envío como lo hace el checkout
      console.log("📦 PASO 2: Calcular envío");
      
      const cartItem = {
        partId: part.id,
        quantity: 19,
        price: 24.20,
        peso: parseInt(part.peso) || 500
      };
      
      console.log("📤 Datos enviados al servidor:");
      console.log(`    Peso unitario: ${cartItem.peso}g`);
      console.log(`    Cantidad: ${cartItem.quantity}`);
      console.log(`    Peso total esperado: ${cartItem.peso * cartItem.quantity}g`);
      console.log();
      
      // Probar con diferentes provincias
      const provinces = ["Madrid", "Barcelona", "Sevilla", "Valencia", "A Coruña"];
      
      for (const province of provinces) {
        const shippingResponse = await fetch("http://localhost:5000/api/shipping/calculate", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            province,
            cartItems: [cartItem]
          })
        });
        
        const shippingData = await shippingResponse.json();
        
        console.log(`📍 ${province}:`);
        console.log(`    Peso total calculado: ${shippingData.totalWeight}g`);
        console.log(`    Costo de envío: ${shippingData.shippingOptions?.[0]?.cost || 'N/A'}€`);
        
        if (Math.abs((shippingData.shippingOptions?.[0]?.cost || 0) - 5.80) < 0.1) {
          console.log(`    🎯 ¡COINCIDENCIA! Esta provincia da el precio que ve el usuario`);
        }
        console.log();
      }
      
    } else {
      console.log("❌ No se encontró la pieza");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

// Ejecutar test
testShippingBug();