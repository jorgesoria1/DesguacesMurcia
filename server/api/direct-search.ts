import { Request, Response } from "express";
import { Express } from "express";
import { pool } from "../db";

/**
 * Implementa una ruta directa y simplificada para búsqueda de piezas
 * Utiliza consultas SQL directas para máxima eficiencia y precisión
 */
export function registerDirectSearchRoute(app: Express) {
  app.get("/api/direct-search", async (req: Request, res: Response) => {
    try {
      // Extraer el término de búsqueda
      const search = req.query.search as string;
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      
      console.log(`BÚSQUEDA DIRECTA: Término="${search}", Limit=${limit}, Offset=${offset}`);
      
      if (!search || search.trim() === '') {
        return res.json({ 
          data: [], 
          pagination: { total: 0, hasMore: false } 
        });
      }
      
      // Construir la consulta SQL directa
      const searchTerm = `%${search.trim().toUpperCase()}%`;
      
      // Consultar piezas que coincidan con el término de búsqueda
      const query = `
        SELECT p.* 
        FROM parts p 
        WHERE 
          p.descripcion_articulo ILIKE $1 OR 
          p.descripcion_familia ILIKE $1 OR
          p.ref_principal ILIKE $1 OR
          p.cod_articulo ILIKE $1
        ORDER BY p.fecha_creacion DESC
        LIMIT $2 OFFSET $3
      `;
      
      // Ejecutar la consulta
      console.log(`Ejecutando búsqueda directa para: "${search}"`);
      const result = await pool.query(query, [searchTerm, limit, offset]);
      
      // Contar el total de resultados para paginación
      const countQuery = `
        SELECT COUNT(*) as total
        FROM parts p 
        WHERE 
          p.descripcion_articulo ILIKE $1 OR 
          p.descripcion_familia ILIKE $1 OR
          p.ref_principal ILIKE $1 OR
          p.cod_articulo ILIKE $1
      `;
      
      const countResult = await pool.query(countQuery, [searchTerm]);
      const total = parseInt(countResult.rows[0].total);
      
      console.log(`Búsqueda directa de "${search}" encontró ${total} resultados totales, mostrando ${result.rows.length}`);
      
      return res.json({ 
        data: result.rows, 
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
  
  console.log("Ruta de búsqueda directa simplificada registrada correctamente");
}