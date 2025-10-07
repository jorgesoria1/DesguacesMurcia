import { Request, Response } from 'express';
import { pool } from '../db.ts';

/**
 * Controlador para búsqueda avanzada de vehículos
 * Sistema completamente nuevo y optimizado
 */

export const vehiclesSearchController = {
  /**
   * Búsqueda principal de vehículos con filtros completos
   */
  async searchVehicles(req: Request, res: Response) {
    try {
      const {
        search = '',
        marca = '',
        modelo = '',
        anyo = '',
        combustible = '',
        referencia = '',
        idLocal = '',
        limit = 100,
        offset = 0,
        orden = 'marca_asc'
      } = req.query;

      console.log("=== NUEVA BÚSQUEDA DE VEHÍCULOS ===");
      console.log("Parámetros:", { search, marca, modelo, anyo, combustible, referencia, idLocal, orden, limit, offset });
      console.log("Paginación:", { limit: parseInt(limit.toString()), offset: parseInt(offset.toString()) });

      // Construir condiciones dinámicamente
      const conditions = ["v.activo = true"];
      const params: any[] = [];
      let paramIndex = 1;

      // Búsqueda por texto libre (incluye referencia/idLocal)
      if (search && search.toString().trim()) {
        const searchTerm = search.toString().trim();
        // Si el término de búsqueda es un número, buscar también por idLocal
        const isNumeric = /^\d+$/.test(searchTerm);
        
        if (isNumeric) {
          conditions.push(`(
            v.marca ILIKE $${paramIndex} OR 
            v.modelo ILIKE $${paramIndex} OR 
            v.version ILIKE $${paramIndex} OR
            v.descripcion ILIKE $${paramIndex} OR
            v.matricula ILIKE $${paramIndex} OR
            v.bastidor ILIKE $${paramIndex} OR
            v.id_local = $${paramIndex + 1}
          )`);
          params.push(`%${searchTerm}%`);
          params.push(parseInt(searchTerm));
          paramIndex += 2;
        } else {
          conditions.push(`(
            v.marca ILIKE $${paramIndex} OR 
            v.modelo ILIKE $${paramIndex} OR 
            v.version ILIKE $${paramIndex} OR
            v.descripcion ILIKE $${paramIndex} OR
            v.matricula ILIKE $${paramIndex} OR
            v.bastidor ILIKE $${paramIndex}
          )`);
          params.push(`%${searchTerm}%`);
          paramIndex++;
        }
      }

      // Filtro por marca
      if (marca && marca.toString() !== 'all-brands' && marca.toString().trim()) {
        conditions.push(`v.marca ILIKE $${paramIndex}`);
        params.push(`%${marca.toString().trim()}%`);
        paramIndex++;
      }

      // Filtro por modelo
      if (modelo && modelo.toString() !== 'all-models' && modelo.toString().trim()) {
        conditions.push(`v.modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.toString().trim()}%`);
        paramIndex++;
      }

      // Filtro por año
      if (anyo && anyo.toString() !== 'all-years' && anyo.toString().trim()) {
        const yearNumber = parseInt(anyo.toString());
        if (!isNaN(yearNumber)) {
          conditions.push(`v.anyo = $${paramIndex}`);
          params.push(yearNumber);
          paramIndex++;
        }
      }

      // Filtro por combustible
      if (combustible && combustible.toString() !== 'all-fuels' && combustible.toString().trim()) {
        conditions.push(`v.combustible ILIKE $${paramIndex}`);
        params.push(`%${combustible.toString().trim()}%`);
        paramIndex++;
      }

      // Filtro específico por referencia/idLocal
      if ((referencia && referencia.toString().trim()) || (idLocal && idLocal.toString().trim())) {
        const refValue = referencia || idLocal;
        const refNumber = parseInt(refValue.toString());
        if (!isNaN(refNumber)) {
          conditions.push(`v.id_local = $${paramIndex}`);
          params.push(refNumber);
          paramIndex++;
        }
      }

      // Ordenación
      let orderBy = "ORDER BY v.marca ASC, v.modelo ASC, v.anyo DESC";
      switch (orden) {
        case 'marca_asc':
          orderBy = "ORDER BY v.marca ASC, v.modelo ASC";
          break;
        case 'marca_desc':
          orderBy = "ORDER BY v.marca DESC, v.modelo DESC";
          break;
        case 'modelo_asc':
          orderBy = "ORDER BY v.modelo ASC, v.marca ASC";
          break;
        case 'modelo_desc':
          orderBy = "ORDER BY v.modelo DESC, v.marca DESC";
          break;
        case 'anyo_asc':
          orderBy = "ORDER BY v.anyo ASC, v.marca ASC, v.modelo ASC";
          break;
        case 'anyo_desc':
          orderBy = "ORDER BY v.anyo DESC, v.marca ASC, v.modelo ASC";
          break;
        case 'piezas_asc':
          orderBy = "ORDER BY COALESCE(v.active_parts_count, 0) ASC, v.marca ASC";
          break;
        case 'piezas_desc':
          orderBy = "ORDER BY COALESCE(v.active_parts_count, 0) DESC, v.marca ASC";
          break;
        case 'fecha_asc':
          orderBy = "ORDER BY v.updated_at ASC";
          break;
        case 'fecha_desc':
          orderBy = "ORDER BY v.updated_at DESC";
          break;
        default:
          orderBy = "ORDER BY v.marca ASC, v.modelo ASC, v.anyo DESC";
      }

      // Consulta principal
      const query = `
        SELECT 
          v.id,
          v.marca,
          v.modelo,
          v.version,
          v.anyo,
          v.combustible,
          v.descripcion,
          v.imagenes,
          v.activo,
          v.fecha_creacion as "fechaCreacion",
          v.updated_at as "fechaActualizacion",
          v.matricula,
          v.bastidor,
          v.potencia,
          COALESCE(v.total_parts_count, 0) as "totalParts",
          COALESCE(v.active_parts_count, 0) as "activeParts"
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      // Aplicar límite máximo de 1000 para evitar problemas de rendimiento
      const finalLimit = Math.min(parseInt(limit.toString()), 1000);
      params.push(finalLimit, parseInt(offset.toString()));

      console.log("Consulta SQL:", query);
      console.log("Parámetros SQL:", params);

      const result = await pool.query(query, params);

      // Contar total de resultados con los mismos filtros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
      `;
      const countParams = params.slice(0, -2); // Remover limit y offset
      
      console.log(`🔢 Query de conteo:`, countQuery);
      console.log(`🔢 Params de conteo:`, countParams);
      
      const countResult = await pool.query(countQuery, countParams);
      let finalTotal = parseInt(countResult.rows[0].total);
      
      console.log(`📊 Total calculado desde BD: ${finalTotal}`);
      
      // Verificación adicional: si el conteo parece incorrecto o es muy bajo, hacer una verificación directa
      if (finalTotal < 100 && conditions.length === 1 && conditions[0] === "v.activo = true") {
        console.log(`⚠️ Conteo sospechosamente bajo (${finalTotal}), verificando conteo directo...`);
        const directCountQuery = `SELECT COUNT(*) as total FROM vehicles WHERE activo = true`;
        const directCountResult = await pool.query(directCountQuery);
        const directTotal = parseInt(directCountResult.rows[0].total);
        console.log(`🔍 Conteo directo: ${directTotal}`);
        
        if (directTotal > finalTotal) {
          finalTotal = directTotal;
          console.log(`✅ Usando conteo directo: ${finalTotal}`);
        }
      }

      const currentPage = Math.floor(parseInt(offset.toString()) / finalLimit) + 1;
      const totalPages = Math.ceil(finalTotal / finalLimit);
      const hasMore = parseInt(offset.toString()) + finalLimit < finalTotal;
      
      console.log(`=== RESULTADO BÚSQUEDA VEHÍCULOS ===`);
      console.log(`📊 Encontrados ${result.rows.length} vehículos de ${finalTotal} total`);
      console.log(`📄 Página ${currentPage} de ${totalPages} (límite: ${finalLimit}, offset: ${offset})`);
      console.log(`🔄 Tiene más páginas: ${hasMore}`);
      console.log(`🔢 Conteo query:`, countQuery);
      console.log(`🔢 Conteo params:`, countParams);

      res.json({
        data: result.rows,
        pagination: {
          total: finalTotal,
          limit: finalLimit,
          offset: parseInt(offset.toString()),
          hasMore: hasMore,
          page: currentPage,
          totalPages: totalPages
        }
      });

    } catch (error) {
      console.error("Error en búsqueda de vehículos:", error);
      res.status(500).json({ 
        error: "Error interno del servidor",
        data: [],
        pagination: { total: 0, limit: 12, offset: 0, hasMore: false }
      });
    }
  },

  /**
   * Obtener años disponibles para filtros
   */
  async getAvailableYears(req: Request, res: Response) {
    try {
      const { marca, modelo } = req.query;
      
      const conditions = ["v.activo = true", "v.anyo IS NOT NULL", "v.anyo > 0", "v.anyo >= 1900", "v.anyo <= 2030"];
      const params: any[] = [];
      let paramIndex = 1;

      if (marca && marca.toString() !== 'all-brands') {
        conditions.push(`v.marca ILIKE $${paramIndex}`);
        params.push(`%${marca.toString()}%`);
        paramIndex++;
      }

      if (modelo && modelo.toString() !== 'all-models') {
        conditions.push(`v.modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.toString()}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT v.anyo as year
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
        ORDER BY v.anyo DESC
      `;

      const result = await pool.query(query, params);
      const years = result.rows.map((row: any) => row.year);

      res.json(years);
    } catch (error) {
      console.error("Error obteniendo años:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  /**
   * Obtener combustibles disponibles para filtros
   */
  async getAvailableFuels(req: Request, res: Response) {
    try {
      const { marca, modelo, anyo } = req.query;
      
      const conditions = ["v.activo = true", "v.combustible IS NOT NULL", "v.combustible != ''"];
      const params: any[] = [];
      let paramIndex = 1;

      if (marca && marca.toString() !== 'all-brands') {
        conditions.push(`v.marca ILIKE $${paramIndex}`);
        params.push(`%${marca.toString()}%`);
        paramIndex++;
      }

      if (modelo && modelo.toString() !== 'all-models') {
        conditions.push(`v.modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.toString()}%`);
        paramIndex++;
      }

      if (anyo && anyo.toString() !== 'all-years') {
        const yearNumber = parseInt(anyo.toString());
        if (!isNaN(yearNumber)) {
          conditions.push(`v.anyo = $${paramIndex}`);
          params.push(yearNumber);
          paramIndex++;
        }
      }

      const query = `
        SELECT DISTINCT v.combustible as fuel
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
        ORDER BY v.combustible ASC
      `;

      const result = await pool.query(query, params);
      const fuels = result.rows.map((row: any) => row.fuel);

      res.json(fuels);
    } catch (error) {
      console.error("Error obteniendo combustibles:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  /**
   * Obtener marcas y modelos para filtros
   */
  async getBrandsAndModels(req: Request, res: Response) {
    try {
      const brandsQuery = `
        SELECT DISTINCT v.marca as brand
        FROM vehicles v
        WHERE v.activo = true AND v.marca IS NOT NULL AND v.marca != ''
        ORDER BY v.marca ASC
      `;

      const modelsQuery = `
        SELECT DISTINCT v.marca as brand, v.modelo as model
        FROM vehicles v
        WHERE v.activo = true AND v.marca IS NOT NULL AND v.modelo IS NOT NULL
        AND v.marca != '' AND v.modelo != ''
        ORDER BY v.marca ASC, v.modelo ASC
      `;

      const [brandsResult, modelsResult] = await Promise.all([
        pool.query(brandsQuery),
        pool.query(modelsQuery)
      ]);

      const brands = brandsResult.rows.map((row: any) => row.brand);
      const modelsByBrand: Record<string, string[]> = {};

      modelsResult.rows.forEach((row: any) => {
        if (!modelsByBrand[row.brand]) {
          modelsByBrand[row.brand] = [];
        }
        if (!modelsByBrand[row.brand].includes(row.model)) {
          modelsByBrand[row.brand].push(row.model);
        }
      });

      res.json({
        brands,
        models: modelsByBrand
      });

    } catch (error) {
      console.error("Error obteniendo marcas y modelos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  /**
   * Busca inteligentemente el modelo que mejor coincida con un término de URL
   */
  async findBestModelMatch(req: Request, res: Response) {
    try {
      const { marca, termino } = req.query;
      
      if (!marca || !termino) {
        return res.status(400).json({ 
          error: "Faltan parámetros requeridos: marca y termino" 
        });
      }

      // Obtener todos los modelos de la marca
      const query = `
        SELECT DISTINCT v.modelo as model
        FROM vehicles v
        WHERE v.activo = true 
        AND v.marca ILIKE $1
        AND v.modelo IS NOT NULL 
        AND v.modelo != ''
        ORDER BY v.modelo ASC
      `;
      
      const result = await pool.query(query, [`%${marca.toString()}%`]);
      const models = result.rows.map((row: any) => row.model);
      
      if (models.length === 0) {
        return res.json({ match: null, confidence: 0, availableModels: [] });
      }
      
      // Normalizar término de búsqueda
      const searchTerm = termino.toString().toLowerCase().trim();
      
      // Función de cálculo de similitud simple pero efectiva
      const calculateSimilarity = (model: string, search: string): number => {
        const modelLower = model.toLowerCase();
        const searchWords = search.split(/[\s-]+/);
        const modelWords = modelLower.split(/[\s\(\)-]+/);
        
        let score = 0;
        
        // Coincidencia exacta
        if (modelLower === search) return 100;
        
        // Contiene el término completo
        if (modelLower.includes(search)) score += 50;
        
        // Coincidencias de palabras individuales
        searchWords.forEach(searchWord => {
          if (searchWord.length < 2) return; // Skip very short words
          
          modelWords.forEach(modelWord => {
            if (modelWord.includes(searchWord)) {
              score += 20;
            } else if (searchWord.includes(modelWord) && modelWord.length > 1) {
              score += 10;
            }
          });
        });
        
        // Bonus por longitud similar
        if (Math.abs(modelLower.length - search.length) < 3) {
          score += 5;
        }
        
        return Math.min(score, 100);
      };
      
      // Calcular similitud para cada modelo
      const matches = models.map(model => ({
        model,
        confidence: calculateSimilarity(model, searchTerm)
      }));
      
      // Ordenar por confianza y tomar el mejor
      matches.sort((a, b) => b.confidence - a.confidence);
      const bestMatch = matches[0];
      
      console.log(`🔍 Búsqueda de modelo inteligente:`);
      console.log(`📝 Marca: ${marca}, Término: "${searchTerm}"`);
      console.log(`✅ Mejor coincidencia: "${bestMatch.model}" (${bestMatch.confidence}%)`);
      console.log(`📊 Modelos evaluados: ${models.length}`);
      
      res.json({
        match: bestMatch.confidence > 20 ? bestMatch.model : null,
        confidence: bestMatch.confidence,
        availableModels: models.slice(0, 10), // Top 10 para debugging
        allMatches: matches.slice(0, 5) // Top 5 matches for debugging
      });
      
    } catch (error) {
      console.error("Error en búsqueda inteligente de modelo:", error);
      res.status(500).json({ 
        error: "Error interno del servidor",
        match: null,
        confidence: 0
      });
    }
  }
};