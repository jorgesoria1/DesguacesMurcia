#!/usr/bin/env node

// Test de portes de envío por zonas
// Este script probará los costes de envío para una pieza específica en todas las zonas

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

// Configuración de zonas de prueba con provincias representativas
const TEST_ZONES = [
  { zone: 1, province: 'Madrid', description: 'Zona 1 - Madrid y Centro' },
  { zone: 2, province: 'Barcelona', description: 'Zona 2 - Cataluña y Valencia' },
  { zone: 3, province: 'Sevilla', description: 'Zona 3 - Andalucía' },
  { zone: 4, province: 'Bilbao', description: 'Zona 4 - Norte y País Vasco' },
  { zone: 5, province: 'La Coruña', description: 'Zona 5 - Noroeste' },
  { zone: 6, province: 'Zaragoza', description: 'Zona 6 - Aragón y Castilla-León' },
  { zone: 7, province: 'Baleares', description: 'Zona 7 - Islas Baleares' },
  { zone: 8, province: 'Las Palmas', description: 'Zona 8 - Islas Canarias' },
  { zone: 9, province: 'Ceuta', description: 'Zona 9 - Ceuta y Melilla' }
];

// Pieza de prueba (ID 649342 - COMPRESOR AIRE ACONDICIONADO - 500g - 34€)
const TEST_PART = {
  id: 649342,
  name: 'COMPRESOR AIRE ACONDICIONADO',
  weight: 500, // gramos
  price: 34,
  quantity: 1
};

async function testShippingForZone(province) {
  try {
    console.log(`\n🔍 Probando envío para provincia: ${province}`);
    
    // Simular añadir pieza al carrito
    const cartItems = [{
      part_id: TEST_PART.id,
      quantity: TEST_PART.quantity,
      weight: TEST_PART.weight,
      price: TEST_PART.price
    }];

    const response = await fetch(`${BASE_URL}/api/calculate-shipping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        province: province,
        cartItems: cartItems
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
      return null;
    }

    return result;
    
  } catch (error) {
    console.log(`   ❌ Error calculando envío: ${error.message}`);
    return null;
  }
}

async function runShippingTest() {
  console.log('🚚 PRUEBA DE PORTES POR ZONAS DE ENVÍO');
  console.log('=====================================');
  console.log(`📦 Pieza de prueba: ${TEST_PART.name}`);
  console.log(`⚖️  Peso: ${TEST_PART.weight}g`);
  console.log(`💰 Precio: ${TEST_PART.price}€`);
  console.log(`📊 Cantidad: ${TEST_PART.quantity} unidad`);
  
  const results = {};

  for (const zoneInfo of TEST_ZONES) {
    const result = await testShippingForZone(zoneInfo.province);
    
    if (result && result.shippingOptions && result.shippingOptions.length > 0) {
      const shipping = result.shippingOptions[0]; // Tomar primera opción
      
      console.log(`   ✅ Zona ${zoneInfo.zone}: ${shipping.cost}€ (${shipping.zoneName})`);
      console.log(`      📄 Método: ${shipping.name}`);
      console.log(`      🎯 Tarifa original: ${shipping.originalCost}€`);
      console.log(`      🚛 Días estimados: ${shipping.estimatedDays}`);
      console.log(`      🆓 Envío gratuito: ${shipping.isFreeShipping ? 'SÍ' : 'NO'}`);
      
      results[zoneInfo.zone] = {
        province: zoneInfo.province,
        description: zoneInfo.description,
        cost: shipping.cost,
        originalCost: shipping.originalCost,
        method: shipping.name,
        zoneName: shipping.zoneName,
        estimatedDays: shipping.estimatedDays,
        isFreeShipping: shipping.isFreeShipping
      };
    } else {
      console.log(`   ❌ Zona ${zoneInfo.zone}: Sin datos de envío`);
    }
  }

  // Resumen final
  console.log('\n📋 RESUMEN DE PORTES POR ZONA:');
  console.log('================================');
  
  const sortedResults = Object.entries(results).sort(([a], [b]) => parseInt(a) - parseInt(b));
  
  for (const [zone, data] of sortedResults) {
    console.log(`Zona ${zone}: ${data.cost}€ - ${data.description}`);
  }

  // Encontrar zona más barata y más cara
  const costs = Object.values(results).map(r => r.cost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  
  const cheapestZone = Object.entries(results).find(([_, data]) => data.cost === minCost);
  const mostExpensiveZone = Object.entries(results).find(([_, data]) => data.cost === maxCost);
  
  console.log('\n💡 ANÁLISIS:');
  console.log(`💰 Zona más barata: Zona ${cheapestZone[0]} (${cheapestZone[1].province}) - ${minCost}€`);
  console.log(`💸 Zona más cara: Zona ${mostExpensiveZone[0]} (${mostExpensiveZone[1].province}) - ${maxCost}€`);
  console.log(`📊 Diferencia: ${(maxCost - minCost).toFixed(2)}€`);
  
  return results;
}

// Ejecutar test
runShippingTest().catch(console.error);