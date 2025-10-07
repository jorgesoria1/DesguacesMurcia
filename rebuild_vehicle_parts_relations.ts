/**
 * Rebuild Vehicle-Parts Relations
 * Recreates the vehicle_parts table relationships based on existing part data
 */

import { db } from './server/db';
import { parts, vehicles, vehicleParts } from '@shared/schema';
import { eq, sql, and, isNotNull } from 'drizzle-orm';

class VehiclePartsRelationBuilder {
  private stats = {
    totalParts: 0,
    partsWithVehicles: 0,
    relationsCreated: 0,
    errors: 0
  };

  async buildRelations() {
    console.log('🔧 Iniciando reconstrucción de relaciones vehículo-piezas...');

    try {
      // 1. Limpiar tabla de relaciones existente
      await this.clearExistingRelations();

      // 2. Obtener estadísticas iniciales
      await this.getInitialStats();

      // 3. Crear relaciones basadas en id_vehiculo
      await this.createDirectRelations();

      // 4. Actualizar contadores de vehículos
      await this.updateVehicleCounters();

      // 5. Mostrar estadísticas finales
      await this.showFinalStats();

      console.log('✅ Reconstrucción de relaciones completada exitosamente');

    } catch (error) {
      console.error('❌ Error en la reconstrucción:', error);
      throw error;
    }
  }

  async clearExistingRelations() {
    console.log('🧹 Limpiando relaciones existentes...');
    
    const result = await db.delete(vehicleParts);
    console.log(`   Eliminadas ${result.rowCount || 0} relaciones antiguas`);
  }

  async getInitialStats() {
    console.log('📊 Obteniendo estadísticas iniciales...');

    // Contar piezas totales y con vehículos
    const statsQuery = await db.execute(sql`
      SELECT 
        COUNT(*) as total_parts,
        COUNT(CASE WHEN id_vehiculo IS NOT NULL AND id_vehiculo != 0 THEN 1 END) as parts_with_vehicles,
        COUNT(CASE WHEN activo = true THEN 1 END) as active_parts
      FROM parts
    `);

    if (statsQuery.rows && statsQuery.rows.length > 0) {
      const row = statsQuery.rows[0] as any;
      this.stats.totalParts = parseInt(row.total_parts);
      this.stats.partsWithVehicles = parseInt(row.parts_with_vehicles);
      
      console.log(`   Total de piezas: ${this.stats.totalParts}`);
      console.log(`   Piezas con vehículo: ${this.stats.partsWithVehicles}`);
      console.log(`   Piezas activas: ${parseInt(row.active_parts)}`);
    }
  }

  async createDirectRelations() {
    console.log('🔗 Creando relaciones directas...');

    // Crear relaciones para piezas que tienen id_vehiculo válido
    const insertQuery = sql`
      INSERT INTO vehicle_parts (vehicle_id, part_id, id_vehiculo_original, fecha_creacion)
      SELECT DISTINCT 
        v.id as vehicle_id,
        p.id as part_id,
        p.id_vehiculo as id_vehiculo_original,
        NOW() as fecha_creacion
      FROM parts p
      INNER JOIN vehicles v ON v.id_local = p.id_vehiculo
      WHERE p.id_vehiculo IS NOT NULL 
        AND p.id_vehiculo != 0
        AND p.activo = true
        AND v.activo = true
      ON CONFLICT (vehicle_id, part_id) DO NOTHING
    `;

    const result = await db.execute(insertQuery);
    this.stats.relationsCreated = result.rowCount || 0;
    
    console.log(`   Relaciones creadas: ${this.stats.relationsCreated}`);
  }

  async updateVehicleCounters() {
    console.log('🔢 Actualizando contadores de vehículos...');

    // Actualizar contadores de piezas por vehículo
    const updateQuery = sql`
      UPDATE vehicles 
      SET 
        total_parts_count = COALESCE(subq.total_parts, 0),
        active_parts_count = COALESCE(subq.active_parts, 0)
      FROM (
        SELECT 
          v.id,
          COUNT(vp.part_id) as total_parts,
          COUNT(CASE WHEN p.activo = true THEN 1 END) as active_parts
        FROM vehicles v
        LEFT JOIN vehicle_parts vp ON vp.vehicle_id = v.id
        LEFT JOIN parts p ON p.id = vp.part_id
        GROUP BY v.id
      ) subq
      WHERE vehicles.id = subq.id
    `;

    const result = await db.execute(updateQuery);
    console.log(`   Vehículos actualizados: ${result.rowCount || 0}`);
  }

  async showFinalStats() {
    console.log('📈 Estadísticas finales...');

    // Verificar relaciones creadas
    const finalStatsQuery = await db.execute(sql`
      SELECT 
        COUNT(*) as total_relations,
        COUNT(DISTINCT vehicle_id) as vehicles_with_parts,
        COUNT(DISTINCT part_id) as parts_with_vehicles
      FROM vehicle_parts
    `);

    if (finalStatsQuery.rows && finalStatsQuery.rows.length > 0) {
      const row = finalStatsQuery.rows[0] as any;
      console.log(`   Total relaciones: ${row.total_relations}`);
      console.log(`   Vehículos con piezas: ${row.vehicles_with_parts}`);
      console.log(`   Piezas con vehículos: ${row.parts_with_vehicles}`);
    }

    // Mostrar algunos ejemplos
    const examplesQuery = await db.execute(sql`
      SELECT 
        v.marca,
        v.modelo,
        v.anyo,
        COUNT(vp.part_id) as parts_count
      FROM vehicles v
      INNER JOIN vehicle_parts vp ON vp.vehicle_id = v.id
      GROUP BY v.id, v.marca, v.modelo, v.anyo
      ORDER BY parts_count DESC
      LIMIT 5
    `);

    console.log('\n🚗 Top 5 vehículos con más piezas:');
    if (examplesQuery.rows) {
      examplesQuery.rows.forEach((row: any, index: number) => {
        console.log(`   ${index + 1}. ${row.marca} ${row.modelo} (${row.anyo}) - ${row.parts_count} piezas`);
      });
    }
  }
}

async function main() {
  try {
    const builder = new VehiclePartsRelationBuilder();
    await builder.buildRelations();
    
    console.log('\n🎉 Proceso completado exitosamente');
    console.log('   Las relaciones entre vehículos y piezas han sido reconstruidas');
    console.log('   Ahora las fichas de vehículos mostrarán las piezas disponibles');
    
  } catch (error) {
    console.error('\n💥 Error durante la reconstrucción:', error);
    process.exit(1);
  }
}

main();