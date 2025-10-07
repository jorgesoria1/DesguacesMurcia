import { Request, Response } from "express";
import { Express } from "express";
import { pool } from "../db";
import { inArray, sql } from "drizzle-orm";

/**
 * Implementa una ruta de búsqueda usando SQL nativo para máxima compatibilidad
 * Esta es una solución alternativa cuando la búsqueda a través del ORM no funciona
 */
export function registerNativeSearchRoute(app: Express) {
  app.get("/api/native-search", async (req: Request, res: Response) => {
    try {
      // Extraer parámetros de consulta
      const q = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const activo = req.query.activo === 'true';
      const orden = req.query.orden as string || 'newest';

      console.log(`BÚSQUEDA NATIVA: Término="${q}", limit=${limit}, offset=${offset}, activo=${activo}`);

      if (!q || q.trim() === '') {
        return res.status(400).json({ error: "Se requiere un término de búsqueda" });
      }

      // Construir las partes de la consulta SQL
      const searchPattern = `%${q.trim()}%`;

      let query = `
        SELECT p.*
        FROM parts p 
        WHERE (
          p.descripcion_articulo ILIKE $1 OR
          p.descripcion_familia ILIKE $1 OR
          p.ref_principal ILIKE $1 OR
          p.cod_articulo ILIKE $1
        )`;

      // Añadir filtro de activo si es necesario
      let params = [searchPattern];
      let index = 2; // El próximo índice de parámetro

      if (activo) {
        query += ` AND p.activo = $${index}`;
        params.push(true);
        index++;
      }

      // Construir ORDER BY según el parámetro orden
      let orderBy = 'p.fecha_creacion DESC'; // Por defecto más recientes
      switch(orden) {
        case 'newest':
          orderBy = 'p.fecha_creacion DESC';
          break;
        case 'oldest':
          orderBy = 'p.fecha_creacion ASC';
          break;
        case 'price_asc':
          orderBy = 'CAST(p.precio AS DECIMAL) ASC';
          break;
        case 'price_desc':
          orderBy = 'CAST(p.precio AS DECIMAL) DESC';
          break;
        case 'name_asc':
          orderBy = 'p.descripcion_articulo ASC';
          break;
        case 'name_desc':
          orderBy = 'p.descripcion_articulo DESC';
          break;
      }

      // Añadir ordenación y paginación
      query += ` ORDER BY ${orderBy} LIMIT $${index} OFFSET $${index+1}`;
      params.push(limit, offset);

      // Ejecutar consulta principal
      console.log("Ejecutando búsqueda nativa SQL");
      const result = await pool.query(query, params);

      // Consulta para contar el total de resultados
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM parts p 
        WHERE (
          p.descripcion_articulo ILIKE $1 OR
          p.descripcion_familia ILIKE $1 OR
          p.ref_principal ILIKE $1 OR
          p.cod_articulo ILIKE $1
        )`;

      // Reiniciar parámetros para la consulta de conteo
      let countParams = [searchPattern];
      index = 2;

      if (activo) {
        countQuery += ` AND p.activo = $${index}`;
        countParams.push(true);
      }

      // Ejecutar consulta de conteo
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      console.log(`Búsqueda nativa de "${q}" encontró ${total} resultados totales, mostrando ${result.rows.length}`);

      // Obtener vehículos relacionados para cada pieza
      const partsIds = result.rows.map(part => part.id);

      // Si hay piezas, buscar sus vehículos relacionados
      let vehiclesByPartId = {};

      if (partsIds.length > 0) {
        const vehicleQuery = `
          SELECT vp.part_id, v.* 
          FROM vehicle_parts vp
          JOIN vehicles v ON vp.vehicle_id = v.id
          WHERE vp.part_id = ANY($1)
        `;

        const vehicleResult = await pool.query(vehicleQuery, [partsIds]);

        // Agrupar los vehículos por pieza
        vehiclesByPartId = vehicleResult.rows.reduce((acc, row) => {
          const partId = row.part_id;
          if (!acc[partId]) {
            acc[partId] = [];
          }

          // Eliminar el part_id del objeto vehículo
          const { part_id, ...vehicleData } = row;
          acc[partId].push(vehicleData);

          return acc;
        }, {});
      }

      // Convertir a formato compatible con el formato usado en la interfaz
      const partsWithVehicles = result.rows.map(part => {
        // Obtener el vehículo principal asociado a esta pieza
        const vehicles = vehiclesByPartId[part.id] || [];
        const mainVehicle = vehicles.length > 0 ? vehicles[0] : null;

        // Mapear los nombres de campos de la base de datos al formato esperado por la interfaz
        return {
          id: part.id,
          refLocal: part.ref_local,
          refPrincipal: part.ref_principal,
          idVehiculo: part.id_vehiculo,
          codFamilia: part.cod_familia,
          descripcionFamilia: part.descripcion_familia,
          codArticulo: part.cod_articulo,
          descripcionArticulo: part.descripcion_articulo,
          precio: part.precio || 0, // Campo requerido en la interfaz
          precioVenta: part.precio,
          cantidad: part.cantidad,
          activo: part.activo,
          marca: part.marca,
          modelo: part.modelo,
          version: part.version,
          anyo: part.anyo,
          fechaCreacion: part.fecha_creacion,
          updatedAt: part.updated_at,
          // Añadir campos adicionales necesarios para la interfaz
          imagenes: part.imagenes || [],  // Usar el array de imágenes directamente de la BD
          vehicleMarca: mainVehicle ? mainVehicle.marca : (part.marca || ''),
          vehicleModelo: mainVehicle ? mainVehicle.modelo : (part.modelo || ''),
          vehicleVersion: mainVehicle ? mainVehicle.version : (part.version || ''),
          vehicleInfo: mainVehicle ? {
            id: mainVehicle.id,
            marca: mainVehicle.marca,
            modelo: mainVehicle.modelo,
            version: mainVehicle.version
          } : null,
          // Añadir vehículos relacionados
          vehicles: vehicles
        };
      });

      // Retornar los resultados con paginación
      return res.json({
        data: partsWithVehicles,
        pagination: {
          total,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      console.error("Error en búsqueda nativa:", error);
      return res.status(500).json({ error: "Error al realizar la búsqueda nativa" });
    }
  });

  console.log("Ruta de búsqueda nativa SQL registrada");
}