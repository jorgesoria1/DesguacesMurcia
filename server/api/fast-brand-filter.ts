import { Request, Response } from "express";
import { Express } from "express";
import { pool } from "../db";

/**
 * Filtro de marca ultra rápido usando índices optimizados
 */
export function registerFastBrandFilterRoutes(app: Express) {
  app.get("/api/fast-filter/parts", async (req: Request, res: Response) => {
    try {
      const { marca, modelo, familia, limit = 12, offset = 0 } = req.query;
      
      console.log("=== FILTRO RÁPIDO DE MARCA ===");
      console.log("Parámetros:", { marca, modelo, familia, limit, offset });
      
      if (!marca || marca === "all-brands") {
        return res.status(400).json({ error: "Marca requerida" });
      }
      
      const marcaUpper = (marca as string).toUpperCase();
      let queryParams: any[] = [marcaUpper];
      let paramCounter = 1;
      
      // Construir condiciones WHERE
      let whereConditions = [`v.marca = $${paramCounter}`];
      
      if (modelo && modelo !== "all-models") {
        paramCounter++;
        whereConditions.push(`v.modelo = $${paramCounter}`);
        queryParams.push((modelo as string).toUpperCase());
      }
      
      // Consulta súper simple y rápida con cast correcto para precio
      let partsQuery = `
        SELECT 
          p.id, p.ref_local, p.id_empresa, p.cod_articulo, 
          p.ref_principal, p.descripcion_articulo, p.descripcion_familia,
          p.cod_familia, p.precio, p.peso, p.id_vehiculo, p.imagenes,
          p.activo, p.fecha_creacion, p.sincronizado, p.ultima_sincronizacion,
          p.updated_at
        FROM parts p, vehicles v
        WHERE p.id_vehiculo = v.id_local 
          AND p.activo = true 
          AND v.activo = true
          AND CAST(p.precio AS DECIMAL) > 0
          AND ${whereConditions.join(' AND ')}
      `;
      
      if (familia && familia !== "all-families") {
        paramCounter++;
        partsQuery += ` AND p.descripcion_familia = $${paramCounter}`;
        queryParams.push((familia as string).toUpperCase());
      }
      
      paramCounter++;
      paramCounter++;
      partsQuery += ` ORDER BY p.id DESC LIMIT $${paramCounter-1} OFFSET $${paramCounter}`;
      queryParams.push(parseInt(limit as string), parseInt(offset as string));
      
      console.log("Consulta optimizada:", partsQuery);
      console.log("Parámetros:", queryParams);
      
      const startTime = Date.now();
      const result = await pool.query(partsQuery, queryParams);
      const endTime = Date.now();
      
      console.log(`Consulta ejecutada en ${endTime - startTime}ms`);
      console.log(`Encontradas ${result.rows.length} piezas`);
      
      // Contar total con cast correcto para precio
      let countQuery = `
        SELECT COUNT(*) as total
        FROM parts p, vehicles v
        WHERE p.id_vehiculo = v.id_local 
          AND p.activo = true 
          AND v.activo = true
          AND CAST(p.precio AS DECIMAL) > 0
          AND ${whereConditions.join(' AND ')}
      `;
      
      if (familia && familia !== "all-families") {
        countQuery += ` AND p.descripcion_familia = $${queryParams.length - 2}`;
      }
      
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      
      console.log(`Total de piezas: ${total}`);
      
      // Formatear resultados
      const parts = result.rows.map(row => ({
        id: row.id,
        refLocal: row.ref_local,
        idEmpresa: row.id_empresa,
        codArticulo: row.cod_articulo,
        refPrincipal: row.ref_principal,
        descripcionArticulo: row.descripcion_articulo,
        descripcionFamilia: row.descripcion_familia,
        codFamilia: row.cod_familia,
        precio: row.precio.toString(),
        peso: row.peso.toString(),
        idVehiculo: row.id_vehiculo,
        imagenes: row.imagenes || [],
        activo: row.activo,
        fechaCreacion: row.fecha_creacion,
        sincronizado: row.sincronizado,
        ultimaSincronizacion: row.ultima_sincronizacion,
        updatedAt: row.updated_at,
        vehicles: [] // Las relaciones específicas se cargan después si es necesario
      }));
      
      res.json({
        data: parts,
        pagination: {
          total,
          hasMore: (parseInt(offset as string) + parts.length) < total
        }
      });
      
    } catch (error) {
      console.error("Error en filtro rápido de marca:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
}