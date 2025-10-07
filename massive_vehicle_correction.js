#!/usr/bin/env node

/**
 * Corrección masiva de datos de vehículo para todas las piezas procesadas
 * Este script procesará todas las 89,877 piezas procesadas sin datos de vehículo
 */

import { db } from './server/db.js';
import { parts, vehicles } from './shared/schema.js';
import { eq, sql, and, or, isNull } from 'drizzle-orm';

console.log('🔧 Iniciando corrección masiva de datos de vehículo...');

async function massiveVehicleCorrection() {
  try {
    console.log('\n📊 Analizando piezas procesadas que necesitan corrección...');
    
    // Encontrar todas las piezas procesadas sin datos válidos
    const processedPartsQuery = await db
      .select({
        id: parts.id,
        idVehiculo: parts.idVehiculo,
        refLocal: parts.refLocal,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        descripcionFamilia: parts.descripcionFamilia,
        descripcionArticulo: parts.descripcionArticulo
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`, // Solo piezas procesadas
          or(
            isNull(parts.vehicleMarca),
            eq(parts.vehicleMarca, ''),
            sql`${parts.vehicleMarca} LIKE 'ELECTRICIDAD%'`,
            sql`${parts.vehicleMarca} LIKE 'CARROCER%'`,
            sql`${parts.vehicleMarca} LIKE 'SUSPENSIÓN%'`,
            sql`${parts.vehicleMarca} LIKE 'FRENOS%'`,
            sql`${parts.vehicleMarca} LIKE 'DIRECCIÓN%'`,
            sql`${parts.vehicleMarca} LIKE 'TRANSMISIÓN%'`,
            sql`${parts.vehicleMarca} LIKE 'MOTOR%'`,
            sql`${parts.vehicleMarca} LIKE 'INTERIOR%'`
          )
        )
      );

    console.log(`📊 Encontradas ${processedPartsQuery.length} piezas procesadas sin datos válidos de vehículo`);
    
    if (processedPartsQuery.length === 0) {
      console.log('✅ No hay piezas procesadas que requieran corrección');
      return 0;
    }

    // Cargar vehículos físicos para correlación
    console.log('📋 Cargando vehículos físicos...');
    const physicalVehicles = await db
      .select({
        idLocal: vehicles.idLocal,
        marca: vehicles.marca,
        modelo: vehicles.modelo,
        version: vehicles.version,
        anyo: vehicles.anyo,
        combustible: vehicles.combustible
      })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.activo, true),
          sql`${vehicles.idLocal} > 0`
        )
      );

    console.log(`📋 Cargados ${physicalVehicles.length} vehículos físicos`);

    // Crear mapa de marcas y modelos comunes para búsqueda optimizada
    const marcasComunes = ['FORD', 'PEUGEOT', 'RENAULT', 'CHEVROLET', 'SEAT', 'AUDI', 'BMW', 'MERCEDES', 'VOLKSWAGEN', 'OPEL', 'TOYOTA', 'NISSAN', 'HONDA', 'HYUNDAI', 'KIA', 'SKODA', 'FIAT', 'CITROEN', 'DACIA', 'SUZUKI'];
    
    // Crear índice de vehículos por marca para búsqueda rápida
    const vehiclesByBrand = {};
    physicalVehicles.forEach(vehicle => {
      if (vehicle.marca) {
        const marca = vehicle.marca.toUpperCase();
        if (!vehiclesByBrand[marca]) vehiclesByBrand[marca] = [];
        vehiclesByBrand[marca].push(vehicle);
      }
    });

    console.log(`🗂️ Índice creado con ${Object.keys(vehiclesByBrand).length} marcas diferentes`);

    let updatedCount = 0;
    let batchCount = 0;
    const batchSize = 1000;

    // Procesar piezas en lotes de 1000
    for (let i = 0; i < processedPartsQuery.length; i += batchSize) {
      const batch = processedPartsQuery.slice(i, i + batchSize);
      batchCount++;
      
      console.log(`📦 Procesando lote ${batchCount}: ${batch.length} piezas (${i + batch.length}/${processedPartsQuery.length})`);
      
      const updates = [];

      for (const part of batch) {
        let vehicleDataFound = null;

        // Estrategia 1: Buscar marcas conocidas en descripción de familia o artículo
        const textoCompleto = `${part.descripcionFamilia || ''} ${part.descripcionArticulo || ''}`.toUpperCase();
        
        // Buscar marca conocida en descripción
        for (const marca of marcasComunes) {
          if (textoCompleto.includes(marca)) {
            // Buscar vehículos de esta marca en nuestro índice
            const vehiculosEncontrados = vehiclesByBrand[marca];
            
            if (vehiculosEncontrados && vehiculosEncontrados.length > 0) {
              // Tomar el primer vehículo disponible de esta marca
              const vehiculoSeleccionado = vehiculosEncontrados[0];
              
              vehicleDataFound = {
                marca: vehiculoSeleccionado.marca,
                modelo: vehiculoSeleccionado.modelo || '',
                version: vehiculoSeleccionado.version || '',
                anyo: vehiculoSeleccionado.anyo || null,
                combustible: vehiculoSeleccionado.combustible || ''
              };
              break;
            }
          }
        }

        // Estrategia 2: Si no encontró marca específica, buscar por patrones en el texto
        if (!vehicleDataFound) {
          // Buscar patrones como "308", "GOLF", etc. en el texto
          for (const [marca, vehiculosList] of Object.entries(vehiclesByBrand)) {
            for (const vehiculo of vehiculosList) {
              if (vehiculo.modelo && textoCompleto.includes(vehiculo.modelo.toUpperCase())) {
                vehicleDataFound = {
                  marca: vehiculo.marca,
                  modelo: vehiculo.modelo,
                  version: vehiculo.version || '',
                  anyo: vehiculo.anyo || null,
                  combustible: vehiculo.combustible || ''
                };
                break;
              }
            }
            if (vehicleDataFound) break;
          }
        }

        // Si encontró datos, agregar a la lista de actualizaciones
        if (vehicleDataFound) {
          updates.push({
            id: part.id,
            vehicleData: vehicleDataFound
          });
        }
      }

      // Ejecutar actualizaciones en lote
      if (updates.length > 0) {
        console.log(`   🔄 Actualizando ${updates.length} piezas con datos de vehículo...`);
        
        for (const update of updates) {
          try {
            await db
              .update(parts)
              .set({
                vehicleMarca: update.vehicleData.marca,
                vehicleModelo: update.vehicleData.modelo,
                vehicleVersion: update.vehicleData.version,
                vehicleAnyo: update.vehicleData.anyo,
                vehicleCombustible: update.vehicleData.combustible,
                fechaActualizacion: sql`NOW()`
              })
              .where(eq(parts.id, update.id));
            
            updatedCount++;
          } catch (error) {
            console.error(`   ⚠️ Error actualizando pieza ${update.id}:`, error.message);
          }
        }
      }

      console.log(`   ✅ Lote completado: ${updates.length}/${batch.length} piezas actualizadas. Total: ${updatedCount}`);

      // Pausa breve para no saturar la base de datos
      if (batchCount % 10 === 0) {
        console.log('   ⏸️ Pausa breve para la base de datos...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n📊 Corrección masiva completada:`);
    console.log(`   • Piezas analizadas: ${processedPartsQuery.length}`);
    console.log(`   • Piezas actualizadas: ${updatedCount}`);
    console.log(`   • Tasa de éxito: ${((updatedCount / processedPartsQuery.length) * 100).toFixed(2)}%`);

    // Verificar resultados finales
    console.log('\n🔍 Verificando resultados finales...');
    
    const [finalStats] = await db
      .select({
        totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`,
        conDatosVehiculo: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`
      })
      .from(parts);

    const successRate = finalStats.totalProcesadas > 0 ? 
      ((finalStats.conDatosVehiculo / finalStats.totalProcesadas) * 100).toFixed(2) : '0.00';

    console.log(`\n🎯 Estadísticas finales:`);
    console.log(`   • Total piezas procesadas activas: ${finalStats.totalProcesadas}`);
    console.log(`   • Piezas con datos de vehículo: ${finalStats.conDatosVehiculo}`);
    console.log(`   • Tasa de éxito final: ${successRate}%`);
    console.log(`   • Mejora obtenida: +${((finalStats.conDatosVehiculo - 3957) / finalStats.totalProcesadas * 100).toFixed(2)}%`);

    return updatedCount;

  } catch (error) {
    console.error('❌ Error en corrección masiva:', error);
    throw error;
  }
}

// Ejecutar corrección masiva
massiveVehicleCorrection()
  .then(result => {
    console.log(`\n✅ Corrección masiva completada: ${result} piezas actualizadas`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en corrección masiva:', error);
    process.exit(1);
  });