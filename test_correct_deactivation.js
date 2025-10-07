#!/usr/bin/env node

/**
 * Script para probar la nueva lógica de desactivación correcta
 */

import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { eq, sql, and, or, isNull } from 'drizzle-orm';

console.log('🧪 Probando nueva lógica de desactivación...');

async function testCorrectDeactivation() {
  try {
    console.log('\n📊 Analizando piezas que DEBEN desactivarse según nueva lógica...');
    
    // Buscar piezas que deben desactivarse según los nuevos criterios
    const partsToDeactivate = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        descripcionArticulo: parts.descripcionArticulo,
        precio: parts.precio,
        activo: parts.activo
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          or(
            // Piezas regulares con precio cero/nulo
            and(
              sql`${parts.idVehiculo} > 0`,
              or(
                sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = 0`,
                isNull(parts.precio),
                eq(parts.precio, ''),
                eq(parts.precio, '0'),
                eq(parts.precio, '0,00')
              )
            ),
            // Piezas procesadas con precio negativo (excepto -1) o nombre "NO IDENTIFICADO"
            and(
              sql`${parts.idVehiculo} < 0`,
              or(
                sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) < -1`, // Precios más negativos que -1
                sql`UPPER(${parts.descripcionArticulo}) LIKE '%NO IDENTIFICADO%'`,
                sql`UPPER(${parts.vehicleMarca}) LIKE '%NO IDENTIFICADO%'`
              )
            )
          )
        )
      )
      .limit(20);

    console.log(`📝 Encontradas ${partsToDeactivate.length} piezas que DEBEN desactivarse:`);
    
    if (partsToDeactivate.length > 0) {
      console.log('\n🔍 Muestra de piezas a desactivar:');
      partsToDeactivate.forEach((part, index) => {
        const tipo = part.idVehiculo > 0 ? 'REGULAR' : 'PROCESADA';
        const razon = part.idVehiculo > 0 ? 'precio cero/nulo' : 
          (parseFloat(part.precio?.replace(',', '.') || '0') < -1 ? 'precio < -1' : 'NO IDENTIFICADO');
        
        console.log(`   ${index + 1}. ${part.refLocal} (${tipo})`);
        console.log(`      ID Vehículo: ${part.idVehiculo} | Precio: ${part.precio}`);
        console.log(`      Marca: "${part.vehicleMarca}" | Modelo: "${part.vehicleModelo}"`);
        console.log(`      Descripción: ${part.descripcionArticulo?.substring(0, 50)}...`);
        console.log(`      Razón: ${razon}`);
        console.log('');
      });
    }

    // Verificar piezas procesadas que NO deben desactivarse (precio -1 y con datos válidos)
    console.log('\n📊 Verificando piezas procesadas que NO deben desactivarse...');
    
    const processedPartsToKeep = await db
      .select({
        total: sql`COUNT(*)`,
        conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        precioMenosUno: sql`COUNT(CASE WHEN CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = -1 THEN 1 END)`
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`,
          sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) >= -1`, // Precio -1 o superior
          sql`UPPER(${parts.descripcionArticulo}) NOT LIKE '%NO IDENTIFICADO%'`,
          sql`UPPER(${parts.vehicleMarca}) NOT LIKE '%NO IDENTIFICADO%'`
        )
      );

    console.log(`📈 Piezas procesadas que deben MANTENERSE activas:`);
    console.log(`   • Total piezas procesadas válidas: ${processedPartsToKeep[0].total}`);
    console.log(`   • Con datos de vehículo: ${processedPartsToKeep[0].conDatosVehiculo}`);
    console.log(`   • Con precio -1 (marcador válido): ${processedPartsToKeep[0].precioMenosUno}`);

    // Muestra de piezas procesadas válidas
    const validProcessedSample = await db
      .select({
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`,
          sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) >= -1`,
          sql`UPPER(${parts.descripcionArticulo}) NOT LIKE '%NO IDENTIFICADO%'`,
          sql`${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != ''`
        )
      )
      .limit(5);

    console.log(`\n✅ Muestra de piezas procesadas VÁLIDAS (no desactivar):`);
    validProcessedSample.forEach((part, index) => {
      console.log(`   ${index + 1}. ${part.refLocal} (ID: ${part.idVehiculo})`);
      console.log(`      Marca: "${part.vehicleMarca}" | Modelo: "${part.vehicleModelo}" | Precio: ${part.precio}`);
    });

    console.log('\n🎯 Resumen de la nueva lógica:');
    console.log(`   • Piezas a desactivar: ${partsToDeactivate.length}`);
    console.log(`   • Piezas procesadas válidas a mantener: ${processedPartsToKeep[0].total}`);
    console.log(`   • Nueva lógica: ${partsToDeactivate.length < 1000 && processedPartsToKeep[0].total > 50000 ? '✅ CORRECTA' : '⚠️ REVISAR'}`);

  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

// Ejecutar prueba
testCorrectDeactivation()
  .then(() => {
    console.log('\n✅ Prueba completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en prueba:', error);
    process.exit(1);
  });