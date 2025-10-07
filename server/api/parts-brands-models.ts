import { Express, Request, Response } from "express";
import { pool } from "../db";

/**
 * Endpoint para obtener marcas y modelos únicos desde la tabla de piezas
 */
export function registerPartsBrandsModelsRoutes(app: Express) {
  app.get("/api/parts/brands-models", async (req: Request, res: Response) => {
    try {
      console.log("=== OBTENIENDO MARCAS Y MODELOS DESDE PIEZAS ===");
      console.log("Query params recibidos:", req.query);

      // Obtener parámetros de filtros
      const marca = req.query.marca as string | undefined;
      const modelo = req.query.modelo as string | undefined;

      console.log("Filtros aplicados:", { marca, modelo });

      // Query simplificada para obtener todas las marcas activas - incluye piezas procesadas
      const brandsQuery = `
        SELECT DISTINCT vehicle_marca as marca
        FROM parts 
        WHERE vehicle_marca IS NOT NULL 
          AND vehicle_marca != '' 
          AND vehicle_marca != 'NO DISPONIBLE'
          AND vehicle_marca != '» OTROS...'
          AND TRIM(vehicle_marca) != ''
          AND (
            (activo = true AND disponible_api = true) OR 
            (id_vehiculo < 0 AND activo = true AND disponible_api = true AND vehicle_marca IS NOT NULL AND vehicle_marca != '' 
             AND vehicle_marca != '» OTROS...' AND vehicle_modelo != 'MODELOS')
          )
          AND (
            CAST(NULLIF(REGEXP_REPLACE(precio, '[^0-9.]', '', 'g'), '') AS DECIMAL) > 0
            OR precio::text ~ '^[0-9]+([.,][0-9]+)?$'
          )
        ORDER BY vehicle_marca
      `;

      console.log("Ejecutando query de marcas...");
      const brandsResult = await pool.query(brandsQuery);

      const brands = brandsResult.rows
        .map(row => row.marca)
        .filter(marca => marca && marca.trim() !== '' && marca !== 'NO DISPONIBLE');

      console.log(`Marcas encontradas: ${brands.length}`, brands.slice(0, 5));

      // Construir filtros para modelos
      let modelFilters = '';
      const modelParams: any[] = [];

      if (marca && marca !== 'all-brands' && marca !== '') {
        modelFilters = `AND vehicle_marca = $1`;
        modelParams.push(marca);
      }

      // Query para obtener modelos - incluye piezas procesadas
      const modelsQuery = `
        SELECT DISTINCT vehicle_marca as marca, vehicle_modelo as modelo
        FROM parts 
        WHERE vehicle_marca IS NOT NULL 
          AND vehicle_marca != '' 
          AND vehicle_marca != 'NO DISPONIBLE'
          AND vehicle_marca != '» OTROS...'
          AND TRIM(vehicle_marca) != ''
          AND vehicle_modelo IS NOT NULL 
          AND vehicle_modelo != ''
          AND vehicle_modelo != 'NO DISPONIBLE'
          AND vehicle_modelo != 'MODELOS'
          AND TRIM(vehicle_modelo) != ''
          AND (
            (activo = true AND disponible_api = true) OR 
            (id_vehiculo < 0 AND activo = true AND disponible_api = true AND vehicle_marca IS NOT NULL AND vehicle_marca != '' 
             AND vehicle_marca != '» OTROS...' AND vehicle_modelo != 'MODELOS')
          )
          AND (
            CAST(NULLIF(REGEXP_REPLACE(precio, '[^0-9.]', '', 'g'), '') AS DECIMAL) > 0
            OR precio::text ~ '^[0-9]+([.,][0-9]+)?$'
          )
          ${modelFilters}
        ORDER BY vehicle_marca, vehicle_modelo
      `;

      console.log("Ejecutando query de modelos...");
      const modelsResult = await pool.query(modelsQuery, modelParams);

      // Agrupar modelos por marca
      const modelsByBrand = {};
      modelsResult.rows.forEach(row => {
        const { marca, modelo } = row;
        if (marca && modelo && marca.trim() !== '' && modelo.trim() !== '' && 
            marca !== 'NO DISPONIBLE' && modelo !== 'NO DISPONIBLE') {
          if (!modelsByBrand[marca]) {
            modelsByBrand[marca] = [];
          }
          if (!modelsByBrand[marca].includes(modelo)) {
            modelsByBrand[marca].push(modelo);
          }
        }
      });

      // Ordenar los modelos dentro de cada marca
      Object.keys(modelsByBrand).forEach(marca => {
        modelsByBrand[marca].sort();
      });

      console.log(`=== RESULTADO ===`);
      console.log(`Marcas encontradas: ${brands.length}`);
      console.log(`Modelos agrupados por marca: ${Object.keys(modelsByBrand).length} marcas`);

      if (brands.length > 0) {
        console.log(`Primeras 5 marcas:`, brands.slice(0, 5));
      }

      // Log específico para verificar DODGE
      const dodgeFound = brands.find(b => b.toUpperCase().includes('DODGE'));
      if (dodgeFound) {
        console.log(`✓ DODGE encontrada como: "${dodgeFound}"`);
        console.log(`Modelos de DODGE: ${modelsByBrand[dodgeFound]?.length || 0}`);
      } else {
        console.log(`✗ DODGE no encontrada en las marcas`);
        // Verificar si existe en la base de datos - incluye piezas procesadas
        const dodgeCheck = await pool.query(`
          SELECT DISTINCT vehicle_marca 
          FROM parts 
          WHERE vehicle_marca ILIKE '%dodge%' 
          AND (
            (activo = true AND disponible_api = true) OR 
            (id_vehiculo < 0 AND activo = true AND disponible_api = true AND vehicle_marca IS NOT NULL AND vehicle_marca != '' 
             AND vehicle_marca != '» OTROS...' AND vehicle_modelo != 'MODELOS')
          )
          LIMIT 5
        `);
        console.log(`Verificación DODGE en BD:`, dodgeCheck.rows);
      }

      const response = {
        brands: brands || [],
        models: modelsByBrand || {}
      };

      console.log(`Enviando respuesta con ${response.brands.length} marcas`);
      res.status(200).json(response);

    } catch (error) {
      console.error("Error al obtener marcas y modelos desde piezas:", error);
      res.status(500).json({ 
        error: "Error al obtener marcas y modelos",
        brands: [],
        models: {},
        details: error.message
      });
    }
  });

  console.log("Ruta de marcas y modelos desde piezas registrada");
}

export function registerPartsBrandsModelsRoute(app: Express) {
  app.get("/api/parts/brands-models", async (req: Request, res: Response) => {
    try {
      // Extraer parámetros opcionales
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;

      console.log(`API: Obteniendo marcas y modelos con filtros: marca=${marca || 'todas'}, modelo=${modelo || 'todos'}`);

      // Los parámetros son opcionales, no necesitamos validación estricta
      // Solo verificamos que no contengan valores que puedan causar problemas SQL

      // Construir consulta base con filtros aplicados - incluye piezas procesadas
      let query = `
        SELECT DISTINCT 
          p.vehicle_marca as marca,
          p.vehicle_modelo as modelo
        FROM parts p 
        WHERE (
          (p.activo = true AND p.disponible_api = true) OR 
          (p.id_vehiculo < 0 AND p.activo = true AND p.disponible_api = true AND p.vehicle_marca IS NOT NULL AND p.vehicle_marca != '' 
           AND p.vehicle_marca != '» OTROS...' AND p.vehicle_modelo != 'MODELOS')
        )
        AND p.vehicle_marca IS NOT NULL 
        AND p.vehicle_marca != ''
        AND TRIM(p.vehicle_marca) != ''
        AND p.vehicle_modelo IS NOT NULL 
        AND p.vehicle_modelo != ''
        AND TRIM(p.vehicle_modelo) != ''
        AND (
          p.precio IS NOT NULL 
          AND p.precio != '' 
          AND p.precio != '0'
          AND p.precio != '0.0'
          AND p.precio != '0.00'
          AND p.precio != '0,00'
          AND TRIM(p.precio) != '0'
          AND TRIM(p.precio) != '0.0'
          AND TRIM(p.precio) != '0.00'
          AND TRIM(p.precio) != '0,00'
          AND (
            (p.precio ~ '^[0-9]+([.,][0-9]+)?$' AND CAST(REPLACE(p.precio, ',', '.') AS DECIMAL) > 0)
            OR (p.precio ~ '^[0-9.]+$' AND CAST(p.precio AS DECIMAL) > 0)
          )
        )`;

      const params: any[] = [];
      let paramIndex = 1;

      // Aplicar filtros si están presentes y son válidos
      if (marca && marca.trim() !== '' && marca !== 'undefined' && marca !== 'null') {
        query += ` AND UPPER(TRIM(p.vehicle_marca)) = $${paramIndex}`;
        params.push(marca.toUpperCase().trim());
        paramIndex++;
      }

      if (modelo && modelo.trim() !== '' && modelo !== 'undefined' && modelo !== 'null') {
        query += ` AND UPPER(TRIM(p.vehicle_modelo)) = $${paramIndex}`;
        params.push(modelo.toUpperCase().trim());
        paramIndex++;
      }

      query += ` ORDER BY p.vehicle_marca, p.vehicle_modelo`;

      console.log(`Ejecutando consulta brands-models SQL con ${params.length} parámetros:`, params);

      let result;
      try {
        result = await pool.query(query, params);
      } catch (sqlError) {
        console.error("Error en consulta SQL brands-models:", sqlError);
        // Fallback: consulta simple sin filtros - incluye piezas procesadas
        const fallbackQuery = `
          SELECT DISTINCT 
            p.vehicle_marca as marca,
            p.vehicle_modelo as modelo
          FROM parts p 
          WHERE (
            p.activo = true OR 
            (p.id_vehiculo < 0 AND p.vehicle_marca IS NOT NULL AND p.vehicle_marca != '' 
             AND p.vehicle_marca != '» OTROS...' AND p.vehicle_modelo != 'MODELOS')
          )
          AND p.vehicle_marca IS NOT NULL 
          AND p.vehicle_marca != ''
          AND p.vehicle_modelo IS NOT NULL 
          AND p.vehicle_modelo != ''
          ORDER BY p.vehicle_marca, p.vehicle_modelo
          LIMIT 1000
        `;
        result = await pool.query(fallbackQuery);
        console.log("Usando consulta de fallback para brands-models");
      }

      const response = result.rows.map(({ marca, modelo }) => ({ marca, modelo }));
      res.status(200).json(response);

    } catch (error) {
      console.error("Error al obtener marcas y modelos:", error);
      res.status(500).json({
        error: "Error al obtener marcas y modelos",
        details: error.message
      });
    }
  });
}