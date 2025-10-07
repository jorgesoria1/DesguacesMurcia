
/**
 * Script integral para corregir y reestablecer todas las relaciones entre vehículos y piezas
 */

import { db } from './db';
import { eq, sql, inArray, isNotNull, and, ne } from 'drizzle-orm';
import { parts, vehicles, vehicleParts, apiConfig } from '../shared/schema';
import axios from 'axios';

interface RepairStats {
  totalParts: number;
  partsWithVehicleId: number;
  relationsCreated: number;
  vehicleDataUpdated: number;
  errors: string[];
}

async function repairVehiclePartRelations(): Promise<RepairStats> {
  console.log('🔧 Iniciando reparación integral de relaciones vehículo-pieza...');
  
  const stats: RepairStats = {
    totalParts: 0,
    partsWithVehicleId: 0,
    relationsCreated: 0,
    vehicleDataUpdated: 0,
    errors: []
  };

  try {
    // Paso 1: Verificar y corregir esquema de base de datos
    console.log('📋 Verificando esquema de base de datos...');
    await ensureSchemaIntegrity();

    // Paso 2: Limpiar datos inconsistentes
    console.log('🧹 Limpiando datos inconsistentes...');
    await cleanInconsistentData();

    // Paso 3: Obtener estadísticas iniciales
    const initialStats = await db.select({
      total: sql<number>`COUNT(*)`,
      withVehicleId: sql<number>`COUNT(CASE WHEN id_vehiculo > 0 THEN 1 END)`
    }).from(parts);
    
    stats.totalParts = Number(initialStats[0].total);
    stats.partsWithVehicleId = Number(initialStats[0].withVehicleId);
    
    console.log(`📊 Estadísticas iniciales: ${stats.totalParts} piezas total, ${stats.partsWithVehicleId} con vehículo asignado`);

    // Paso 4: Recrear todas las relaciones desde cero
    console.log('🔗 Recreando relaciones vehículo-pieza...');
    await db.execute(sql`TRUNCATE TABLE vehicle_parts CASCADE`);
    
    // Insertar relaciones basadas en id_vehiculo válidos
    const insertResult = await db.execute(sql`
      INSERT INTO vehicle_parts (vehicle_id, part_id, id_vehiculo_original, fecha_creacion)
      SELECT v.id, p.id, p.id_vehiculo, NOW()
      FROM parts p
      JOIN vehicles v ON v.id_local = p.id_vehiculo
      WHERE p.id_vehiculo > 0
      ON CONFLICT (vehicle_id, part_id) DO NOTHING
    `);
    
    stats.relationsCreated = Number(insertResult.rowCount) || 0;
    console.log(`✅ Creadas ${stats.relationsCreated} relaciones directas`);

    // Paso 5: Actualizar datos de vehículo en piezas
    console.log('📝 Actualizando datos de vehículo en piezas...');
    const updateResult = await db.execute(sql`
      UPDATE parts p
      SET 
        vehicle_marca = COALESCE(v.marca, ''),
        vehicle_modelo = COALESCE(v.modelo, ''),
        vehicle_version = COALESCE(v.version, ''),
        vehicle_anyo = COALESCE(v.anyo, 0)
      FROM vehicles v
      WHERE p.id_vehiculo = v.id_local
      AND p.id_vehiculo > 0
    `);
    
    stats.vehicleDataUpdated = Number(updateResult.rowCount) || 0;
    console.log(`✅ Actualizados datos de vehículo en ${stats.vehicleDataUpdated} piezas`);

    // Paso 6: Intentar matching automático para piezas sin vehículo directo
    console.log('🎯 Intentando matching automático para piezas sin vehículo...');
    await performAutomaticMatching(stats);

    // Paso 7: Actualizar contadores
    console.log('🔢 Actualizando contadores...');
    await updateCounters();

    // Paso 8: Estadísticas finales
    await generateFinalStats(stats);

    console.log('✅ Reparación completada exitosamente');
    return stats;

  } catch (error) {
    console.error('❌ Error durante la reparación:', error);
    stats.errors.push(error.message);
    throw error;
  }
}

async function ensureSchemaIntegrity(): Promise<void> {
  try {
    // Asegurar que existen las columnas necesarias en parts
    await db.execute(sql`
      ALTER TABLE parts 
      ADD COLUMN IF NOT EXISTS vehicle_marca TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS vehicle_modelo TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS vehicle_version TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS vehicle_anyo INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS related_vehicles_count INTEGER DEFAULT 0
    `);

    // Asegurar que existen las columnas necesarias en vehicles
    await db.execute(sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS active_parts_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_parts_count INTEGER DEFAULT 0
    `);

    // Verificar índices importantes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_parts_id_vehiculo ON parts(id_vehiculo);
      CREATE INDEX IF NOT EXISTS idx_parts_vehicle_marca ON parts(vehicle_marca);
      CREATE INDEX IF NOT EXISTS idx_parts_vehicle_modelo ON parts(vehicle_modelo);
      CREATE INDEX IF NOT EXISTS idx_vehicles_id_local ON vehicles(id_local);
      CREATE INDEX IF NOT EXISTS idx_vehicle_parts_vehicle_id ON vehicle_parts(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_vehicle_parts_part_id ON vehicle_parts(part_id);
    `);

    console.log('✅ Esquema de base de datos verificado');
  } catch (error) {
    console.error('❌ Error verificando esquema:', error);
    throw error;
  }
}

async function cleanInconsistentData(): Promise<void> {
  try {
    // Limpiar id_vehiculo inválidos (referencias a vehículos inexistentes)
    const cleanupResult = await db.execute(sql`
      UPDATE parts 
      SET id_vehiculo = 0
      WHERE id_vehiculo > 0 
      AND id_vehiculo NOT IN (SELECT id_local FROM vehicles WHERE id_local IS NOT NULL)
    `);
    
    console.log(`🧹 Limpiadas ${cleanupResult.rowCount || 0} referencias inválidas de vehículos`);

    // Limpiar datos de vehículo vacíos o inconsistentes
    await db.execute(sql`
      UPDATE parts 
      SET 
        vehicle_marca = '',
        vehicle_modelo = '',
        vehicle_version = '',
        vehicle_anyo = 0
      WHERE id_vehiculo = 0 
      OR id_vehiculo IS NULL
    `);

    console.log('✅ Datos inconsistentes limpiados');
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
    throw error;
  }
}

async function performAutomaticMatching(stats: RepairStats): Promise<void> {
  try {
    // Obtener piezas sin vehículo pero con códigos que podrían servir para matching
    const unmatchedParts = await db.select({
      id: parts.id,
      refLocal: parts.refLocal,
      rvCode: parts.rvCode,
      codVersion: parts.codVersion,
      anyoInicio: parts.anyoInicio,
      anyoFin: parts.anyoFin,
      codFamilia: parts.codFamilia
    })
    .from(parts)
    .where(
      and(
        eq(parts.idVehiculo, 0),
        eq(parts.activo, true)
      )
    )
    .limit(1000); // Procesar en lotes

    console.log(`🔍 Encontradas ${unmatchedParts.length} piezas sin vehículo para matching`);

    let matchedCount = 0;
    
    for (const part of unmatchedParts) {
      try {
        let matchedVehicle = null;

        // Intentar matching por rvCode
        if (part.rvCode && part.rvCode !== '0') {
          const vehiclesByRvCode = await db.select()
            .from(vehicles)
            .where(eq(vehicles.idLocal, parseInt(part.rvCode)))
            .limit(1);
          
          if (vehiclesByRvCode.length > 0) {
            matchedVehicle = vehiclesByRvCode[0];
          }
        }

        // Si no encontró por rvCode, intentar por rango de años y versión
        if (!matchedVehicle && part.codVersion && part.anyoInicio && part.anyoFin) {
          const vehiclesByVersion = await db.execute(sql`
            SELECT * FROM vehicles 
            WHERE version ILIKE ${`%${part.codVersion}%`}
            AND anyo BETWEEN ${part.anyoInicio} AND ${part.anyoFin}
            LIMIT 1
          `);
          
          if (vehiclesByVersion.rows.length > 0) {
            matchedVehicle = vehiclesByVersion.rows[0];
          }
        }

        // Si encontró un vehículo, crear la relación
        if (matchedVehicle) {
          await db.update(parts)
            .set({ 
              idVehiculo: matchedVehicle.id_local,
              vehicleMarca: matchedVehicle.marca || '',
              vehicleModelo: matchedVehicle.modelo || '',
              vehicleVersion: matchedVehicle.version || '',
              vehicleAnyo: matchedVehicle.anyo || 0
            })
            .where(eq(parts.id, part.id));

          // Crear relación en vehicle_parts
          await db.execute(sql`
            INSERT INTO vehicle_parts (vehicle_id, part_id, id_vehiculo_original, fecha_creacion)
            VALUES (${matchedVehicle.id}, ${part.id}, ${matchedVehicle.id_local}, NOW())
            ON CONFLICT (vehicle_id, part_id) DO NOTHING
          `);

          matchedCount++;
        }
      } catch (error) {
        console.warn(`⚠️ Error en matching para pieza ${part.id}:`, error.message);
        stats.errors.push(`Matching error for part ${part.id}: ${error.message}`);
      }
    }

    console.log(`✅ Matching automático completado: ${matchedCount} nuevas relaciones creadas`);
    stats.relationsCreated += matchedCount;
  } catch (error) {
    console.error('❌ Error en matching automático:', error);
    stats.errors.push(`Automatic matching error: ${error.message}`);
  }
}

async function updateCounters(): Promise<void> {
  try {
    // Actualizar contador de vehículos relacionados en piezas
    await db.execute(sql`
      UPDATE parts p
      SET related_vehicles_count = (
        SELECT COUNT(*) 
        FROM vehicle_parts vp 
        WHERE vp.part_id = p.id
      )
    `);

    // Actualizar contadores en vehículos
    await db.execute(sql`
      UPDATE vehicles v
      SET 
        active_parts_count = (
          SELECT COUNT(*)
          FROM vehicle_parts vp
          JOIN parts p ON vp.part_id = p.id
          WHERE vp.vehicle_id = v.id AND p.activo = true
        ),
        total_parts_count = (
          SELECT COUNT(*)
          FROM vehicle_parts vp
          WHERE vp.vehicle_id = v.id
        )
    `);

    console.log('✅ Contadores actualizados');
  } catch (error) {
    console.error('❌ Error actualizando contadores:', error);
    throw error;
  }
}

async function generateFinalStats(stats: RepairStats): Promise<void> {
  try {
    const finalStats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM parts) as total_parts,
        (SELECT COUNT(*) FROM parts WHERE id_vehiculo > 0) as parts_with_vehicle,
        (SELECT COUNT(*) FROM parts WHERE vehicle_marca != '' AND vehicle_marca IS NOT NULL) as parts_with_vehicle_data,
        (SELECT COUNT(*) FROM vehicle_parts) as total_relations,
        (SELECT COUNT(*) FROM vehicles WHERE active_parts_count > 0) as vehicles_with_parts
    `);

    const data = finalStats.rows[0];
    
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    console.log(`   • Total de piezas: ${data.total_parts}`);
    console.log(`   • Piezas con vehículo asignado: ${data.parts_with_vehicle}`);
    console.log(`   • Piezas con datos de vehículo: ${data.parts_with_vehicle_data}`);
    console.log(`   • Total de relaciones: ${data.total_relations}`);
    console.log(`   • Vehículos con piezas: ${data.vehicles_with_parts}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️ Errores encontrados: ${stats.errors.length}`);
      stats.errors.slice(0, 5).forEach(error => console.log(`   • ${error}`));
      if (stats.errors.length > 5) {
        console.log(`   • ... y ${stats.errors.length - 5} más`);
      }
    }
  } catch (error) {
    console.error('❌ Error generando estadísticas finales:', error);
  }
}

// Ejecutar reparación
repairVehiclePartRelations()
  .then((stats) => {
    console.log('\n🎉 REPARACIÓN COMPLETADA EXITOSAMENTE');
    console.log(`   • Relaciones creadas: ${stats.relationsCreated}`);
    console.log(`   • Datos actualizados: ${stats.vehicleDataUpdated}`);
  })
  .catch((error) => {
    console.error('\n💥 ERROR EN LA REPARACIÓN:', error);
    process.exit(1);
  });

export { repairVehiclePartRelations };
