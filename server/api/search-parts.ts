import { Request, Response } from "express";
import { Express } from "express";
import { pool } from "../db";

/**
 * Implementa una ruta dedicada para búsqueda de piezas
 * Utiliza consultas SQL directas para máxima eficiencia y precisión
 */
export function registerSearchPartsRoute(app: Express) {
  app.get("/api/search/parts", async (req: Request, res: Response) => {
    try {
      // Extraer parámetros de búsqueda
      const searchTerm = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const activo = req.query.activo === "true" ? true : req.query.activo === "false" ? false : undefined;

      console.log(`Búsqueda directa: término="${searchTerm}", limit=${limit}, offset=${offset}, activo=${activo}`);

      if (!searchTerm || searchTerm.trim() === '') {
        return res.status(400).json({ error: "Se requiere un término de búsqueda" });
      }

      // Crear consulta SQL para búsqueda
      let query = `
        SELECT p.*, 
          (SELECT COUNT(*) FROM vehicle_parts WHERE part_id = p.id) AS vehicles_count 
        FROM parts p 
        WHERE (
          LOWER(p.descripcion_articulo) LIKE LOWER($1) OR
          LOWER(p.descripcion_familia) LIKE LOWER($2) OR
          LOWER(p.ref_principal) LIKE LOWER($3) OR
          LOWER(p.cod_articulo) LIKE LOWER($4)
        )`;

      // Añadir filtro de activo si se especifica
      const params = [
        `%${searchTerm.trim()}%`,
        `%${searchTerm.trim()}%`,
        `%${searchTerm.trim()}%`,
        `%${searchTerm.trim()}%`
      ];

      // Añadir filtro activo si está definido
      if (activo !== undefined) {
        query += ` AND p.activo = $5`;
        params.push(activo);
      }

      // Añadir ordenación y límites
      query += ` ORDER BY p.fecha_creacion DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      // Ejecutar la consulta
      console.log("Ejecutando búsqueda directa SQL");
      const result = await pool.query(query, params);

      // Contar el total para paginación
      let countQuery = `
        SELECT COUNT(*) as total FROM parts p 
        WHERE (
          LOWER(p.descripcion_articulo) LIKE LOWER($1) OR
          LOWER(p.descripcion_familia) LIKE LOWER($2) OR
          LOWER(p.ref_principal) LIKE LOWER($3) OR
          LOWER(p.cod_articulo) LIKE LOWER($4)
        )`;

      // Añadir filtro de activo si se especifica
      const countParams = [
        `%${searchTerm.trim()}%`, 
        `%${searchTerm.trim()}%`, 
        `%${searchTerm.trim()}%`, 
        `%${searchTerm.trim()}%`
      ];

      if (activo !== undefined) {
        countQuery += ` AND p.activo = $5`;
        countParams.push(activo);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      console.log(`Búsqueda de "${searchTerm}" encontró ${total} resultados totales, mostrando ${result.rows.length}`);

      // Enriquecer los resultados con información de vehículos compatibles
      const partsWithVehicles = await enrichPartsWithVehicleData(result.rows);

      return res.json({ 
        data: partsWithVehicles, 
        pagination: { 
          total, 
          hasMore: offset + limit < total 
        } 
      });
    } catch (error) {
      console.error("Error en búsqueda directa:", error);
      return res.status(500).json({ error: "Error al realizar la búsqueda" });
    }
  });

  console.log("Ruta de búsqueda directa registrada correctamente");
}

/**
 * Función auxiliar para añadir información de vehículos a cada pieza
 */
async function enrichPartsWithVehicleData(parts: any[]): Promise<any[]> {
  if (parts.length === 0) return [];

  try {
    // Obtener todos los IDs de piezas
    const partIds = parts.map(part => part.id);

    // Consulta para obtener vehículos compatibles con estas piezas
    const query = `
      SELECT vp.part_id, v.* 
      FROM vehicle_parts vp
      JOIN vehicles v ON vp.vehicle_id = v.id
      WHERE vp.part_id = ANY($1)
      LIMIT 1000`;

    const result = await pool.query(query, [partIds]);

    // Organizar los vehículos por pieza
    const vehiclesByPartId: Record<number, any[]> = {};

    for (const row of result.rows) {
      const partId = row.part_id;
      if (!vehiclesByPartId[partId]) {
        vehiclesByPartId[partId] = [];
      }

      // Eliminar el part_id del objeto del vehículo
      const { part_id, ...vehicleData } = row;
      vehiclesByPartId[partId].push(vehicleData);
    }

    // Añadir los vehículos a cada pieza
    return parts.map(part => {
      return {
        ...part,
        vehicles: vehiclesByPartId[part.id] || []
      };
    });
  } catch (error) {
    console.error("Error al enriquecer piezas con datos de vehículos:", error);
    // Devolver las piezas sin información de vehículos
    return parts.map(part => ({ ...part, vehicles: [] }));
  }
}