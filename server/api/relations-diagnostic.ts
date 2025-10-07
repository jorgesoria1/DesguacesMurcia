
import { Express, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Endpoint para diagnosticar el estado de las relaciones vehículo-pieza
 */
export function registerRelationsDiagnosticRoutes(app: Express) {
  
  // Diagnóstico general
  app.get("/api/diagnostic/relations", async (req: Request, res: Response) => {
    try {
      console.log("=== DIAGNÓSTICO DE RELACIONES VEHÍCULO-PIEZA ===");

      // Estadísticas generales
      const generalStats = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM parts) as total_parts,
          (SELECT COUNT(*) FROM parts WHERE activo = true) as active_parts,
          (SELECT COUNT(*) FROM parts WHERE id_vehiculo > 0) as parts_with_vehicle_id,
          (SELECT COUNT(*) FROM parts WHERE vehicle_marca != '' AND vehicle_marca IS NOT NULL) as parts_with_vehicle_data,
          (SELECT COUNT(*) FROM vehicle_parts) as total_relations,
          (SELECT COUNT(*) FROM vehicles) as total_vehicles,
          (SELECT COUNT(*) FROM vehicles WHERE active_parts_count > 0) as vehicles_with_parts
      `);

      // Problemas comunes
      const problems = await db.execute(sql`
        SELECT 
          'Piezas con id_vehiculo pero sin relación' as issue,
          COUNT(*) as count
        FROM parts p
        WHERE p.id_vehiculo > 0 
        AND NOT EXISTS (
          SELECT 1 FROM vehicle_parts vp WHERE vp.part_id = p.id
        )
        UNION ALL
        SELECT 
          'Piezas con relación pero sin id_vehiculo' as issue,
          COUNT(*) as count
        FROM parts p
        WHERE (p.id_vehiculo = 0 OR p.id_vehiculo IS NULL)
        AND EXISTS (
          SELECT 1 FROM vehicle_parts vp WHERE vp.part_id = p.id
        )
        UNION ALL
        SELECT 
          'Piezas activas sin vehículo' as issue,
          COUNT(*) as count
        FROM parts p
        WHERE p.activo = true 
        AND (p.id_vehiculo = 0 OR p.id_vehiculo IS NULL)
        UNION ALL
        SELECT 
          'Referencias a vehículos inexistentes' as issue,
          COUNT(*) as count
        FROM parts p
        WHERE p.id_vehiculo > 0 
        AND p.id_vehiculo NOT IN (SELECT id_local FROM vehicles WHERE id_local IS NOT NULL)
      `);

      // Ejemplos de piezas problemáticas
      const examples = await db.execute(sql`
        SELECT 
          p.id,
          p.ref_local,
          p.id_vehiculo,
          p.vehicle_marca,
          p.vehicle_modelo,
          p.activo,
          CASE 
            WHEN EXISTS (SELECT 1 FROM vehicle_parts vp WHERE vp.part_id = p.id) THEN 'Sí'
            ELSE 'No'
          END as tiene_relacion
        FROM parts p
        WHERE (
          (p.id_vehiculo > 0 AND NOT EXISTS (SELECT 1 FROM vehicle_parts vp WHERE vp.part_id = p.id))
          OR
          ((p.id_vehiculo = 0 OR p.id_vehiculo IS NULL) AND EXISTS (SELECT 1 FROM vehicle_parts vp WHERE vp.part_id = p.id))
          OR
          (p.activo = true AND (p.id_vehiculo = 0 OR p.id_vehiculo IS NULL))
        )
        LIMIT 10
      `);

      const response = {
        timestamp: new Date().toISOString(),
        general_stats: generalStats.rows[0],
        problems: problems.rows,
        example_problematic_parts: examples.rows,
        recommendations: generateRecommendations(problems.rows)
      };

      console.log("Diagnóstico completado:", response);
      res.status(200).json(response);

    } catch (error) {
      console.error("Error en diagnóstico de relaciones:", error);
      res.status(500).json({ 
        error: "Error al ejecutar diagnóstico",
        details: error.message
      });
    }
  });

  // Reparar relaciones automáticamente
  app.post("/api/diagnostic/relations/repair", async (req: Request, res: Response) => {
    try {
      console.log("=== INICIANDO REPARACIÓN DE RELACIONES ===");

      const repairResults = {
        orphan_relations_deleted: 0,
        missing_relations_created: 0,
        invalid_vehicle_refs_cleaned: 0,
        vehicle_data_updated: 0
      };

      // 1. Eliminar relaciones huérfanas (sin pieza o vehículo válido)
      const orphanRelations = await db.execute(sql`
        DELETE FROM vehicle_parts vp
        WHERE NOT EXISTS (SELECT 1 FROM parts p WHERE p.id = vp.part_id)
        OR NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vp.vehicle_id)
      `);
      repairResults.orphan_relations_deleted = Number(orphanRelations.rowCount) || 0;

      // 2. Crear relaciones faltantes
      const missingRelations = await db.execute(sql`
        INSERT INTO vehicle_parts (vehicle_id, part_id, id_vehiculo_original, fecha_creacion)
        SELECT v.id, p.id, p.id_vehiculo, NOW()
        FROM parts p
        JOIN vehicles v ON v.id_local = p.id_vehiculo
        WHERE p.id_vehiculo > 0
        AND NOT EXISTS (
          SELECT 1 FROM vehicle_parts vp 
          WHERE vp.part_id = p.id AND vp.vehicle_id = v.id
        )
        ON CONFLICT (vehicle_id, part_id) DO NOTHING
      `);
      repairResults.missing_relations_created = Number(missingRelations.rowCount) || 0;

      // 3. Limpiar referencias inválidas a vehículos
      const invalidRefs = await db.execute(sql`
        UPDATE parts 
        SET id_vehiculo = 0, activo = false
        WHERE id_vehiculo > 0 
        AND id_vehiculo NOT IN (SELECT id_local FROM vehicles WHERE id_local IS NOT NULL)
      `);
      repairResults.invalid_vehicle_refs_cleaned = Number(invalidRefs.rowCount) || 0;

      // 4. Actualizar datos de vehículo en piezas
      const vehicleDataUpdate = await db.execute(sql`
        UPDATE parts p
        SET 
          vehicle_marca = COALESCE(v.marca, ''),
          vehicle_modelo = COALESCE(v.modelo, ''),
          vehicle_version = COALESCE(v.version, ''),
          vehicle_anyo = COALESCE(v.anyo, 0)
        FROM vehicles v
        WHERE p.id_vehiculo = v.id_local AND p.id_vehiculo > 0
      `);
      repairResults.vehicle_data_updated = Number(vehicleDataUpdate.rowCount) || 0;

      // 5. Actualizar contadores
      await db.execute(sql`
        UPDATE parts p
        SET related_vehicles_count = (
          SELECT COUNT(*) FROM vehicle_parts vp WHERE vp.part_id = p.id
        )
      `);

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

      console.log("Reparación completada:", repairResults);
      res.status(200).json({
        success: true,
        repairs: repairResults,
        message: "Reparación de relaciones completada exitosamente"
      });

    } catch (error) {
      console.error("Error en reparación de relaciones:", error);
      res.status(500).json({ 
        error: "Error al reparar relaciones",
        details: error.message
      });
    }
  });

  console.log("Rutas de diagnóstico de relaciones registradas");
}

function generateRecommendations(problems: any[]): string[] {
  const recommendations = [];
  
  for (const problem of problems) {
    const count = Number(problem.count);
    if (count > 0) {
      switch (problem.issue) {
        case 'Piezas con id_vehiculo pero sin relación':
          recommendations.push(`Crear ${count} relaciones faltantes en vehicle_parts`);
          break;
        case 'Piezas con relación pero sin id_vehiculo':
          recommendations.push(`Actualizar id_vehiculo en ${count} piezas`);
          break;
        case 'Piezas activas sin vehículo':
          recommendations.push(`Revisar ${count} piezas activas sin vehículo asignado`);
          break;
        case 'Referencias a vehículos inexistentes':
          recommendations.push(`Limpiar ${count} referencias inválidas a vehículos`);
          break;
      }
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push("No se detectaron problemas en las relaciones");
  } else {
    recommendations.push("Ejecutar endpoint /api/diagnostic/relations/repair para corregir automáticamente");
  }
  
  return recommendations;
}
