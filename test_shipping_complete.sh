#!/bin/bash

# Script de Validación Completa del Sistema de Envíos
# Fecha: 5 Agosto 2025
# Propósito: Verificar que el sistema funciona correctamente en todas las zonas

echo "🧪 VALIDACIÓN COMPLETA DEL SISTEMA DE ENVÍOS"
echo "=============================================="
echo ""
echo "Carrito de prueba: 26kg (26000g)"
echo "Piezas: BOMBA (5kg) + ELECTROVENTILADOR (15kg) + 2x MANDO (3kg cada uno)"
echo ""

# Definir carrito estándar de 26kg
CART_DATA='{
  "cartItems": [{
    "partId": 629055,
    "quantity": 1,
    "peso": 500,
    "price": 20
  }, {
    "partId": 629054,
    "quantity": 1,
    "peso": 1500,
    "price": 20
  }, {
    "partId": 629056,
    "quantity": 1,
    "peso": 300,
    "price": 20
  }, {
    "partId": 629061,
    "quantity": 1,
    "peso": 300,
    "price": 20
  }]
}'

# Función para probar zona
test_zone() {
    local province="$1"
    local expected_cost="$2"
    local zone_name="$3"
    
    echo "Probando $zone_name..."
    
    result=$(curl -s -X POST "http://localhost:5000/api/shipping/calculate" \
      -H "Content-Type: application/json" \
      -d "$(echo $CART_DATA | jq ". + {\"province\": \"$province\"}")")
    
    if [ $? -eq 0 ]; then
        cost=$(echo "$result" | jq -r '.shippingOptions[0].cost // "ERROR"')
        weight=$(echo "$result" | jq -r '.totalWeight // "ERROR"')
        range_min=$(echo "$result" | jq -r '.shippingOptions[0].weightRange.min // "ERROR"')
        range_max=$(echo "$result" | jq -r '.shippingOptions[0].weightRange.max // "ERROR"')
        
        if [ "$cost" = "$expected_cost" ] && [ "$weight" = "26000" ]; then
            echo "✅ $province: $cost€ (peso: ${weight}g, rango: ${range_min}-${range_max}g) - CORRECTO"
        else
            echo "❌ $province: $cost€ (esperado: $expected_cost€) - ERROR"
            echo "   Peso: $weight (esperado: 26000)"
            echo "   Rango: $range_min-$range_max"
        fi
    else
        echo "❌ $province: Error de conexión"
    fi
}

# Probar todas las zonas
echo "ZONA 1 - MADRID Y CENTRO"
echo "-------------------------"
test_zone "Madrid" "8.5" "Zona 1"

echo ""
echo "ZONA 2 - CATALUÑA Y VALENCIA"
echo "-----------------------------"
test_zone "Valencia" "10.2" "Zona 2"

echo ""
echo "ZONA 3 - ANDALUCÍA (CRÍTICA)"
echo "-----------------------------"
test_zone "Granada" "11.5" "Zona 3"

echo ""
echo "ZONA 5 - NOROESTE"
echo "------------------"
test_zone "A Coruña" "12.8" "Zona 5"

echo ""
echo "ZONA 6 - ARAGÓN Y CASTILLA-LEÓN"
echo "--------------------------------"
test_zone "Palencia" "9.8" "Zona 6"

echo ""
echo "ZONA 7 - ISLAS BALEARES"
echo "------------------------"
test_zone "Islas Baleares" "28.5" "Zona 7"

echo ""
echo "ZONA 8 - ISLAS CANARIAS"
echo "------------------------"
test_zone "Las Palmas" "42.5" "Zona 8"

echo ""
echo "ZONA 9 - CEUTA Y MELILLA"
echo "-------------------------"
test_zone "Ceuta" "48.5" "Zona 9"

echo ""
echo "=============================================="
echo "🎯 VALIDACIÓN COMPLETADA"
echo ""
echo "Verificaciones críticas:"
echo "• Granada 26kg debe costar 11.50€ (NO 4.80€)"
echo "• Todas las zonas deben calcular 26000g de peso"
echo "• Rango aplicado debe ser 20001-50000g"
echo ""
echo "Si alguna prueba falla, el sistema de envíos tiene errores."
echo "Consultar SISTEMA_ENVIOS_DOCUMENTACION_CRITICA.md"