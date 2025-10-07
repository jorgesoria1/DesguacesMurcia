#!/usr/bin/env node

import { db } from './server/db.js';
import { parts, vehicles, vehicleParts } from './shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';

async function forceCreateAssociations() {
  console.log('🔄 Forzando creación de asociaciones vehículo-piezas...');
  
  try {
    // Obtener todas las piezas activas con vehicle_id positivo
    const activeParts = await db
      .select({
        partId: parts.id,
        vehicleId: parts.idVehiculo
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} > 0`
        )
      );
    
    console.log(`📊 Encontradas ${activeParts.length} piezas activas con vehicle_id positivo`);
    
    if (activeParts.length === 0) {
      console.log('❌ No hay piezas activas con vehicle_id positivo para asociar');
      return;
    }
    
    // Obtener vehículos existentes
    const existingVehicles = await db
      .select({
        id: vehicles.id,
        idLocal: vehicles.idLocal
      })
      .from(vehicles);
    
    console.log(`📊 Encontrados ${existingVehicles.length} vehículos en la base de datos`);
    
    // Crear mapa de id_local a id interno
    const vehicleMap = new Map();
    existingVehicles.forEach(v => {
      vehicleMap.set(v.idLocal, v.id);
    });
    
    // Crear asociaciones
    const associations = [];
    let created = 0;
    
    for (const part of activeParts) {
      const vehicleInternalId = vehicleMap.get(part.vehicleId);
      
      if (vehicleInternalId) {
        associations.push({
          vehicleId: vehicleInternalId,
          partId: part.partId,
          idVehiculoOriginal: part.vehicleId  // Añadir el campo requerido
        });
        created++;
      }
    }
    
    console.log(`🔧 Creando ${created} asociaciones...`);
    
    if (associations.length > 0) {
      // Insertar en lotes para evitar problemas de memoria
      const BATCH_SIZE = 1000;
      for (let i = 0; i < associations.length; i += BATCH_SIZE) {
        const batch = associations.slice(i, i + BATCH_SIZE);
        await db.insert(vehicleParts).values(batch).onConflictDoNothing();
        console.log(`✅ Insertado lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(associations.length / BATCH_SIZE)}`);
      }
    }
    
    console.log(`✅ Creadas ${created} asociaciones vehículo-piezas exitosamente`);
    
    // Verificar resultado
    const totalAssociations = await db
      .select({ count: sql`count(*)` })
      .from(vehicleParts);
    
    console.log(`📊 Total asociaciones en la base de datos: ${totalAssociations[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creando asociaciones:', error);
  }
}

forceCreateAssociations();