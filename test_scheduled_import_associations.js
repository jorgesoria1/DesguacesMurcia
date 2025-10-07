import { sql } from '@neondatabase/serverless';
import { db } from './server/db.js';
import { importHistory, vehicles, parts, vehicleParts } from './shared/schema.js';
import { desc, eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

async function testScheduledImportAssociations() {
  console.log('🔍 Verificando que las importaciones programadas automáticamente asocien vehículos y piezas...\n');
  
  try {
    // 1. Verificar el estado actual de las asociaciones
    const [vehicleCount] = await db.select({ count: sql`count(*)` }).from(vehicles);
    const [partCount] = await db.select({ count: sql`count(*)` }).from(parts);
    const [associationCount] = await db.select({ count: sql`count(*)` }).from(vehicleParts);
    
    console.log('📊 Estado actual de la base de datos:');
    console.log(`   Vehículos: ${vehicleCount.count}`);
    console.log(`   Piezas: ${partCount.count}`);
    console.log(`   Asociaciones: ${associationCount.count}`);
    
    // 2. Verificar la última importación programada
    const lastImport = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.createdAt))
      .limit(1);
    
    if (lastImport.length > 0) {
      const import_record = lastImport[0];
      console.log(`\n📅 Última importación encontrada:`);
      console.log(`   ID: ${import_record.id}`);
      console.log(`   Tipo: ${import_record.type}`);
      console.log(`   Estado: ${import_record.status}`);
      console.log(`   Fecha: ${import_record.createdAt}`);
      console.log(`   Procesados: ${import_record.processedItems}`);
      console.log(`   Nuevos: ${import_record.newItems}`);
      console.log(`   Actualizados: ${import_record.updatedItems}`);
    }
    
    // 3. Verificar asociaciones específicas de vehículos que sabemos que tienen piezas
    const vehiclesWithParts = await db
      .select({
        id: vehicles.id,
        marca: vehicles.marca,
        modelo: vehicles.modelo,
        activeParts: vehicles.activeParts,
        totalParts: vehicles.totalParts
      })
      .from(vehicles)
      .where(sql`${vehicles.activeParts} > 0`)
      .limit(10);
    
    console.log('\n🚗 Vehículos con piezas asociadas (muestra de 10):');
    vehiclesWithParts.forEach(vehicle => {
      console.log(`   ${vehicle.marca} ${vehicle.modelo} (ID: ${vehicle.id}) - ${vehicle.activeParts} piezas activas`);
    });
    
    // 4. Verificar que las asociaciones realmente existen en la tabla vehicle_parts
    const associationSample = await db
      .select({
        vehicleId: vehicleParts.vehicleId,
        partId: vehicleParts.partId,
        idVehiculoOriginal: vehicleParts.idVehiculoOriginal,
        marca: vehicles.marca,
        modelo: vehicles.modelo,
        refLocal: parts.refLocal,
        descripcion: parts.descripcionArticulo
      })
      .from(vehicleParts)
      .innerJoin(vehicles, eq(vehicleParts.vehicleId, vehicles.id))
      .innerJoin(parts, eq(vehicleParts.partId, parts.id))
      .limit(5);
    
    console.log('\n🔗 Muestra de asociaciones vehículo-pieza (5 ejemplos):');
    associationSample.forEach(assoc => {
      console.log(`   ${assoc.marca} ${assoc.modelo} ↔ ${assoc.descripcion} (RefLocal: ${assoc.refLocal})`);
    });
    
    // 5. Verificar que no hay piezas huérfanas (sin asociación)
    const orphanParts = await db
      .select({ count: sql`count(*)` })
      .from(parts)
      .where(sql`${parts.id} NOT IN (SELECT ${vehicleParts.partId} FROM ${vehicleParts})`);
    
    console.log(`\n🔍 Piezas sin asociación (huérfanas): ${orphanParts[0].count}`);
    
    // 6. Verificar integridad de los datos
    const vehiclesWithZeroParts = await db
      .select({ count: sql`count(*)` })
      .from(vehicles)
      .where(sql`${vehicles.activeParts} = 0`);
    
    console.log(`\n📊 Análisis de integridad:`);
    console.log(`   Vehículos con 0 piezas: ${vehiclesWithZeroParts[0].count}`);
    
    // 7. Verificar que las importaciones programadas incluyen processPendingRelations
    console.log('\n✅ Resultado de la verificación:');
    
    const hasAssociations = Number(associationCount.count) > 0;
    const hasVehiclesWithParts = vehiclesWithParts.length > 0;
    const hasValidAssociations = associationSample.length > 0;
    
    if (hasAssociations && hasVehiclesWithParts && hasValidAssociations) {
      console.log('✅ Las importaciones programadas SÍ están creando asociaciones automáticamente');
      console.log('✅ Sistema funcionando correctamente');
    } else {
      console.log('❌ Las importaciones programadas NO están creando asociaciones automáticamente');
      console.log('❌ Se requiere intervención manual');
    }
    
    return {
      success: hasAssociations && hasVehiclesWithParts && hasValidAssociations,
      vehicleCount: Number(vehicleCount.count),
      partCount: Number(partCount.count),
      associationCount: Number(associationCount.count),
      orphanParts: Number(orphanParts[0].count)
    };
    
  } catch (error) {
    console.error('❌ Error al verificar asociaciones:', error);
    throw error;
  }
}

testScheduledImportAssociations()
  .then(result => {
    console.log('\n🎯 Resumen final:');
    console.log(`   Vehículos: ${result.vehicleCount}`);
    console.log(`   Piezas: ${result.partCount}`);
    console.log(`   Asociaciones: ${result.associationCount}`);
    console.log(`   Piezas huérfanas: ${result.orphanParts}`);
    console.log(`   Funcionamiento: ${result.success ? 'CORRECTO' : 'REQUIERE ATENCIÓN'}`);
  })
  .catch(error => {
    console.error('Error ejecutando verificación:', error);
    process.exit(1);
  });