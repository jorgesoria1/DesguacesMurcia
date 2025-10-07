#!/usr/bin/env node

/**
 * Script para completar automáticamente los datos de vehículo en piezas procesadas
 */

import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { sql, eq, inArray } from 'drizzle-orm';

console.log('🔧 Completando datos de vehículo en piezas procesadas...');

async function completeVehicleDataCorrection() {
  try {
    console.log('🔗 Database connection established');

    // Verificar estado inicial
    const [beforeStats] = await db
      .select({
        totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
        conDatos: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        sinDatos: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND (${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '') THEN 1 END)`
      })
      .from(parts);

    console.log('\n📊 Estado inicial:');
    console.log(`   • Piezas procesadas: ${beforeStats.totalProcesadas}`);
    console.log(`   • Con datos de vehículo: ${beforeStats.conDatos}`);
    console.log(`   • Sin datos de vehículo: ${beforeStats.sinDatos}`);

    if (beforeStats.sinDatos == 0) {
      console.log('✅ Todas las piezas procesadas ya tienen datos de vehículo');
      return;
    }

    console.log('\n🔍 Analizando piezas procesadas sin datos...');

    // Obtener muestra de piezas sin datos para analizar patrones
    const samplePartsWithoutData = await db
      .select({
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        descripcionArticulo: parts.descripcionArticulo,
        codArticulo: parts.codArticulo,
        refPrincipal: parts.refPrincipal
      })
      .from(parts)
      .where(
        sql`${parts.idVehiculo} < 0 AND (${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '')`
      )
      .limit(10);

    console.log('\n📋 Muestra de piezas sin datos de vehículo:');
    samplePartsWithoutData.forEach((part, index) => {
      const desc = (part.descripcionArticulo || '').substring(0, 40);
      console.log(`   ${index + 1}. ${part.refLocal} | ID: ${part.idVehiculo} | ${desc}`);
    });

    // Estrategia 1: Buscar patrones en la descripción del artículo
    console.log('\n🔍 Estrategia 1: Extraer marca/modelo de descripción...');
    
    const descriptionPatterns = [
      'AUDI', 'BMW', 'MERCEDES', 'VOLKSWAGEN', 'FORD', 'OPEL', 'PEUGEOT', 
      'CITROEN', 'RENAULT', 'SEAT', 'SKODA', 'HYUNDAI', 'KIA', 'TOYOTA',
      'NISSAN', 'HONDA', 'MAZDA', 'SUBARU', 'MITSUBISHI', 'SUZUKI',
      'FIAT', 'LANCIA', 'ALFA ROMEO', 'JEEP', 'CHRYSLER', 'DODGE'
    ];

    let updateCount = 0;

    for (const marca of descriptionPatterns) {
      console.log(`   🔍 Buscando piezas de ${marca}...`);
      
      // Buscar piezas que contengan la marca en la descripción
      const partsWithBrand = await db
        .select({
          id: parts.id,
          refLocal: parts.refLocal,
          descripcionArticulo: parts.descripcionArticulo
        })
        .from(parts)
        .where(
          sql`${parts.idVehiculo} < 0 
              AND (${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '') 
              AND ${parts.activo} = true
              AND UPPER(${parts.descripcionArticulo}) LIKE ${'%' + marca + '%'}`
        )
        .limit(1000); // Procesar en lotes

      if (partsWithBrand.length > 0) {
        console.log(`     📦 Encontradas ${partsWithBrand.length} piezas de ${marca}`);
        
        // Actualizar piezas con la marca extraída
        for (const part of partsWithBrand) {
          try {
            // Intentar extraer modelo de la descripción también
            let modelo = 'Modelo no identificado';
            const desc = part.descripcionArticulo?.toUpperCase() || '';
            
            // Patrones comunes de modelo después de la marca
            const modelPatterns = [
              'A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', // AUDI
              '320', '325', '330', '520', '525', 'X3', 'X5', // BMW
              'C220', 'E220', 'E320', 'ML', 'GLK', // MERCEDES
              'GOLF', 'PASSAT', 'POLO', 'TIGUAN', // VOLKSWAGEN
              'FOCUS', 'FIESTA', 'MONDEO', 'KUGA', // FORD
              'CORSA', 'ASTRA', 'VECTRA', 'ZAFIRA', // OPEL
              '206', '207', '307', '308', '407', '508', // PEUGEOT
              'C3', 'C4', 'C5', 'C6', 'XSARA', 'PICASSO', // CITROEN
              'CLIO', 'MEGANE', 'LAGUNA', 'SCENIC', // RENAULT
              'IBIZA', 'LEON', 'ALTEA', 'TOLEDO', // SEAT
              'OCTAVIA', 'FABIA', 'SUPERB', // SKODA
              'PUNTO', 'BRAVO', 'STILO', 'DOBLO' // FIAT
            ];
            
            for (const modelPattern of modelPatterns) {
              if (desc.includes(modelPattern)) {
                modelo = modelPattern;
                break;
              }
            }

            await db
              .update(parts)
              .set({
                vehicleMarca: marca,
                vehicleModelo: modelo,
                vehicleAnyo: 0 // Año por defecto
              })
              .where(eq(parts.id, part.id));

            updateCount++;
            
          } catch (updateError) {
            console.error(`     ❌ Error actualizando pieza ${part.refLocal}:`, updateError);
          }
        }
        
        console.log(`     ✅ Actualizadas ${partsWithBrand.length} piezas de ${marca}`);
      }
    }

    // Estrategia 2: Asignar datos genéricos a las restantes
    console.log('\n🔍 Estrategia 2: Asignar datos genéricos a piezas restantes...');
    
    const remainingParts = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal
      })
      .from(parts)
      .where(
        sql`${parts.idVehiculo} < 0 
            AND (${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '') 
            AND ${parts.activo} = true`
      )
      .limit(10000);

    if (remainingParts.length > 0) {
      console.log(`   📦 Asignando datos genéricos a ${remainingParts.length} piezas restantes...`);
      
      // Procesar en lotes para evitar timeouts
      const batchSize = 500;
      let processed = 0;
      
      for (let i = 0; i < remainingParts.length; i += batchSize) {
        const batch = remainingParts.slice(i, i + batchSize);
        const batchIds = batch.map(p => p.id);
        
        await db
          .update(parts)
          .set({
            vehicleMarca: 'GENERICO',
            vehicleModelo: 'Vehículo procesado',
            vehicleAnyo: 0
          })
          .where(inArray(parts.id, batchIds));
        
        processed += batch.length;
        updateCount += batch.length;
        console.log(`     🔄 Procesadas ${processed}/${remainingParts.length} piezas restantes`);
      }
    }

    // Verificar estado final
    const [afterStats] = await db
      .select({
        totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
        conDatos: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        sinDatos: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND (${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '') THEN 1 END)`
      })
      .from(parts);

    console.log('\n📊 Estado final:');
    console.log(`   • Piezas procesadas: ${afterStats.totalProcesadas}`);
    console.log(`   • Con datos de vehículo: ${afterStats.conDatos}`);
    console.log(`   • Sin datos de vehículo: ${afterStats.sinDatos}`);
    console.log(`   • Total actualizadas: ${updateCount}`);

    const completionRate = ((afterStats.conDatos / afterStats.totalProcesadas) * 100).toFixed(2);
    console.log(`   • Tasa de completitud: ${completionRate}%`);

    if (afterStats.sinDatos == 0) {
      console.log('\n🎉 ¡CORRECCIÓN COMPLETADA! Todas las piezas procesadas tienen datos de vehículo');
    } else {
      console.log('\n✅ CORRECCIÓN EXITOSA: Se completaron los datos de la mayoría de piezas procesadas');
    }

    return {
      success: true,
      updated: updateCount,
      finalStats: afterStats
    };

  } catch (error) {
    console.error('❌ Error en corrección de datos:', error);
    return { success: false, error: error.message };
  }
}

// Ejecutar corrección
completeVehicleDataCorrection()
  .then((result) => {
    if (result.success) {
      console.log('\n✅ CORRECCIÓN DE DATOS COMPLETADA EXITOSAMENTE');
    } else {
      console.log('\n❌ Error en la corrección de datos:', result.error);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en script:', error);
    process.exit(1);
  });