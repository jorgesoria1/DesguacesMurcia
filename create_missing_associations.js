#!/usr/bin/env node

import { db } from './server/db.js';
import { parts, vehicles, vehicleParts } from './shared/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';

async function createMissingAssociations() {
  console.log('🔗 Creando asociaciones faltantes para piezas activas...');
  
  try {
    // Obtener piezas activas que no tienen asociaciones
    const activeParts = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo
      })
      .from(parts)
      .where(eq(parts.activo, true));
    
    console.log(`📊 Piezas activas encontradas: ${activeParts.length}`);
    
    // Obtener vehículos existentes
    const existingVehicles = await db
      .select({
        id: vehicles.id,
        idLocal: vehicles.idLocal
      })
      .from(vehicles);
    
    console.log(`📊 Vehículos existentes: ${existingVehicles.length}`);
    
    // Crear mapa de vehículos por idLocal
    const vehicleMap = new Map();
    existingVehicles.forEach(vehicle => {
      vehicleMap.set(vehicle.idLocal, vehicle.id);
    });
    
    // Obtener asociaciones existentes
    const existingAssociations = await db
      .select({
        partId: vehicleParts.partId,
        vehicleId: vehicleParts.vehicleId
      })
      .from(vehicleParts);
    
    console.log(`📊 Asociaciones existentes: ${existingAssociations.length}`);
    
    // Crear set de asociaciones existentes
    const existingAssociationsSet = new Set();
    existingAssociations.forEach(assoc => {
      existingAssociationsSet.add(`${assoc.partId}-${assoc.vehicleId}`);
    });
    
    // Preparar nuevas asociaciones
    const newAssociations = [];
    let foundVehicles = 0;
    let missingVehicles = 0;
    
    for (const part of activeParts) {
      if (part.idVehiculo && vehicleMap.has(part.idVehiculo)) {
        const vehicleId = vehicleMap.get(part.idVehiculo);
        const associationKey = `${part.id}-${vehicleId}`;
        
        if (!existingAssociationsSet.has(associationKey)) {
          newAssociations.push({
            partId: part.id,
            vehicleId: vehicleId,
            idVehiculoOriginal: part.idVehiculo
          });
        }
        foundVehicles++;
      } else {
        missingVehicles++;
      }
    }
    
    console.log(`📊 Análisis de piezas activas:`);
    console.log(`  Con vehículos existentes: ${foundVehicles}`);
    console.log(`  Sin vehículos: ${missingVehicles}`);
    console.log(`  Nuevas asociaciones a crear: ${newAssociations.length}`);
    
    // Crear asociaciones en lotes
    const BATCH_SIZE = 1000;
    let created = 0;
    
    for (let i = 0; i < newAssociations.length; i += BATCH_SIZE) {
      const batch = newAssociations.slice(i, i + BATCH_SIZE);
      
      try {
        await db
          .insert(vehicleParts)
          .values(batch)
          .onConflictDoNothing();
        
        created += batch.length;
        console.log(`✅ Creadas ${created}/${newAssociations.length} asociaciones`);
      } catch (error) {
        console.error(`❌ Error creando lote ${i}-${i + batch.length}:`, error);
      }
    }
    
    // Actualizar contadores de vehículos
    console.log('🔄 Actualizando contadores de vehículos...');
    
    const vehicleIds = Array.from(new Set(newAssociations.map(a => a.vehicleId)));
    
    for (const vehicleId of vehicleIds) {
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(vehicleParts)
        .where(eq(vehicleParts.vehicleId, vehicleId));
      
      await db
        .update(vehicles)
        .set({
          activeParts: Number(count),
          totalParts: Number(count)
        })
        .where(eq(vehicles.id, vehicleId));
    }
    
    console.log(`✅ Contadores actualizados para ${vehicleIds.length} vehículos`);
    
    // Verificar estado final
    const finalStats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM parts) as total_parts,
        (SELECT COUNT(*) FROM parts WHERE activo = true) as active_parts,
        (SELECT COUNT(*) FROM parts WHERE is_pending_relation = true) as pending_parts,
        (SELECT COUNT(*) FROM vehicle_parts) as associations
    `);
    
    console.log('📊 Estado final:');
    const row = finalStats.rows[0];
    console.log(`  Vehículos: ${row.total_vehicles}`);
    console.log(`  Piezas: ${row.total_parts}`);
    console.log(`  Piezas activas: ${row.active_parts}`);
    console.log(`  Piezas pendientes: ${row.pending_parts}`);
    console.log(`  Asociaciones: ${row.associations}`);
    
    console.log(`\n🎉 Proceso completado exitosamente!`);
    console.log(`✅ ${created} nuevas asociaciones creadas`);
    
  } catch (error) {
    console.error('❌ Error creando asociaciones:', error);
  }
}

createMissingAssociations();