/**
 * Rutas específicas para marcas que requieren tratamiento especial
 */
import { Express, Request, Response } from "express";
import { searchChryslerParts } from "./direct-parts-search";
import { pool } from "../db";

export function registerBrandSpecificRoutes(app: Express) {
  // Ruta especializada para búsqueda de piezas CHRYSLER
  app.get("/api/brands/chrysler/parts", async (req: Request, res: Response) => {
    // Usar el manejador especializado para CHRYSLER
    await searchChryslerParts(req, res);
  });

  // Ruta para obtener las familias disponibles por marca y modelo
  app.get("/api/brands/:marca/families", async (req: Request, res: Response) => {
    try {
      const marca = req.params.marca.toUpperCase();
      const modelo = req.query.modelo as string;
      
      console.log(`Consultando familias con filtros: marca=${marca}, modelo=${modelo || 'todos'}`);
      
      // Construir la consulta SQL con los filtros correspondientes
      let queryParams = [marca];
      let whereClause = `WHERE v.marca = $1 AND (p.vehicle_marca = $1 OR p.vehicle_marca IS NULL OR p.vehicle_marca = '') AND p.activo = true AND p.disponible_api = true AND CAST(p.precio AS DECIMAL) > 0`;
      let paramCounter = 1;
      
      // Añadir filtro de modelo si está presente
      if (modelo && modelo !== 'all-models') {
        paramCounter++;
        // Verificar si el modelo existe exactamente
        const checkModelQuery = `
          SELECT COUNT(*) as model_count 
          FROM vehicles 
          WHERE marca = $1 AND modelo = $2 AND activo = true
        `;
        const modelCheck = await pool.query(checkModelQuery, [marca, modelo]);
        const modelExists = parseInt(modelCheck.rows[0].model_count) > 0;
        
        if (modelExists) {
          // Si el modelo existe, usamos coincidencia exacta
          whereClause += ` AND v.modelo = $${paramCounter}`;
          queryParams.push(modelo);
        } else {
          // Si no existe, intentamos coincidencia parcial
          whereClause += ` AND v.modelo LIKE $${paramCounter}`;
          queryParams.push(`${modelo}%`);
        }
      }
      
      // Consulta para obtener las familias disponibles
      const query = `
        SELECT DISTINCT p.descripcion_familia as familia, COUNT(*) as count
        FROM parts p
        JOIN vehicles v ON p.id_vehiculo = v.id_local
        ${whereClause}
        GROUP BY p.descripcion_familia
        ORDER BY p.descripcion_familia
      `;
      
      const result = await pool.query(query, queryParams);
      
      // Transformar los resultados a un formato más amigable
      const families = result.rows.map(row => ({
        id: row.familia.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-'),
        name: row.familia,
        count: parseInt(row.count)
      }));
      
      console.log(`Encontradas ${families.length} familias con piezas para marca=${marca}${modelo ? ', modelo=' + modelo : ''}`);
      
      res.json(families);
    } catch (error) {
      console.error(`Error al obtener familias por marca:`, error);
      res.status(500).json([]);
    }
  });
  
  // Ruta genérica para buscar piezas por marca (funciona para todas las marcas)
  app.get("/api/brands/:marca/parts", async (req: Request, res: Response) => {
    try {
      const marca = req.params.marca.toUpperCase();
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const orden = req.query.orden as string || 'newest';
      
      console.log(`Buscando piezas de ${marca} con SQL directo. Limit: ${limit}, Offset: ${offset}`);
      
      // Construir el ORDER BY según el parámetro de ordenación
      let orderBy = "p.fecha_creacion DESC"; // Por defecto, más recientes primero
      
      switch(orden) {
        case 'oldest':
          orderBy = "p.fecha_creacion ASC";
          break;
        case 'price-asc':
          orderBy = "CAST(p.precio AS DECIMAL) ASC";
          break;
        case 'price-desc':
          orderBy = "CAST(p.precio AS DECIMAL) DESC";
          break;
        case 'a-z':
          orderBy = "p.descripcion_articulo ASC";
          break;
        case 'z-a':
          orderBy = "p.descripcion_articulo DESC";
          break;
      }
      
      // Obtener los parámetros de filtrado
      const modelo = req.query.modelo as string;
      const familia = req.query.familia as string;
      
      console.log(`Filtros aplicados: marca=${marca}, modelo=${modelo || 'todos'}, familia=${familia || 'todas'}`);
      
      // Construir la consulta SQL con los filtros solicitados
      let queryParams = [marca];
      // Modificado para mejorar la precisión del filtrado por marca
      // Filtramos principalmente por la marca del vehículo (v.marca)
      // La pieza debe tener un vehicle_marca que coincida con la marca del vehículo o puede estar vacía
      let whereClause = `WHERE v.marca = $1 AND (p.vehicle_marca = $1 OR p.vehicle_marca IS NULL OR p.vehicle_marca = '')`;
      let paramCounter = 1; // Para llevar un seguimiento del número de parámetro actual
      
      // Añadir filtro de modelo si está presente
      if (modelo && modelo !== 'all-models') {
        paramCounter++;
        console.log(`Aplicando filtro por modelo: "${modelo}"`);
        
        // Verificar si el modelo existe en la base de datos
        const checkModelQuery = `
          SELECT COUNT(*) as model_count 
          FROM vehicles 
          WHERE marca = $1 AND modelo = $2 AND activo = true
        `;
        const modelCheck = await pool.query(checkModelQuery, [marca, modelo]);
        const modelExists = parseInt(modelCheck.rows[0].model_count) > 0;
        
        console.log(`Modelo "${modelo}" existe en la BD: ${modelExists ? 'Sí' : 'No'}, encontradas ${modelCheck.rows[0].model_count} coincidencias`);
        
        if (modelExists) {
          // Si el modelo existe, usamos una coincidencia exacta
          whereClause += ` AND v.modelo = $${paramCounter}`;
          queryParams.push(modelo);
        } else {
          // Si el modelo exacto no existe, intentamos una coincidencia parcial (al inicio del nombre)
          console.log(`Modelo exacto no encontrado, intentando coincidencia parcial para: "${modelo}"`);
          whereClause += ` AND v.modelo LIKE $${paramCounter}`;
          queryParams.push(`${modelo}%`);
          
          // También verificamos si hay alguna coincidencia con este patrón
          const checkPartialQuery = `
            SELECT COUNT(*) as model_count 
            FROM vehicles 
            WHERE marca = $1 AND modelo LIKE $2 AND activo = true
          `;
          const partialCheck = await pool.query(checkPartialQuery, [marca, `${modelo}%`]);
          console.log(`Coincidencias parciales para "${modelo}": ${partialCheck.rows[0].model_count}`);
        }
      }
      
      // Añadir filtro de familia (categoría) si está presente
      if (familia && familia !== 'all-categories') {
        paramCounter++;
        console.log(`Aplicando filtro por familia (categoría): "${familia}"`);
        
        // Convertir el ID de categoría a nombre real (si es necesario)
        let familiaCondition = `LOWER(p.descripcion_familia) = LOWER($${paramCounter})`;
        
        // Si la familia está en formato slugificado (ej. "carroceria-frontal"), 
        // intentamos buscar la coincidencia en el nombre real
        if (familia.includes('-')) {
          console.log(`Familia en formato slug: "${familia}", intentando coincidir con nombre real`);
          
          // Reemplazamos guiones por espacios y convertimos a mayúsculas para comparar con los valores en la BD
          const familiaFormatted = familia.replace(/-/g, ' ').toUpperCase();
          whereClause += ` AND (UPPER(p.descripcion_familia) = UPPER($${paramCounter}) OR UPPER(p.descripcion_familia) = UPPER($${paramCounter+1}))`;
          queryParams.push(familia);
          queryParams.push(familiaFormatted);
          paramCounter++;
        } else {
          // Si no tiene guiones, usamos el valor directamente
          whereClause += ` AND ${familiaCondition}`;
          queryParams.push(familia);
        }
      }
      
      // Consulta completa con los filtros aplicados - añadiendo información del vehículo específico
      // Solución más directa y simplificada:
      // 1. Si solo filtramos por marca, seleccionamos las piezas que están asociadas a vehículos de esa marca
      // 2. Si filtramos por marca y modelo, hacemos un filtro exacto
      const query = `
        SELECT 
          p.*,
          v.marca AS original_marca,
          v.modelo AS original_modelo,
          v.version AS original_version,
          v.anyo AS original_anyo,
          COUNT(*) OVER() as total_count
        FROM parts p
        JOIN vehicles v ON p.id_vehiculo = v.id_local
        ${whereClause}
        AND p.activo = true
        AND p.disponible_api = true
        AND CAST(p.precio AS DECIMAL) > 0
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      console.log(`Ejecutando consulta para marca=${marca}${modelo ? ', modelo=' + modelo : ''}`);
      const result = await pool.query(query, queryParams);
      console.log(`Encontradas ${result.rows.length} piezas de ${marca}`);
      
      // Ahora, para cada pieza, vamos a buscar manualmente un vehículo compatible de la marca filtrada
      // y lo guardaremos en el array de compatibles
      if (result.rows.length > 0) {
        // Primero, obtener todos los vehículos de la marca filtrada
        const compatibleVehiclesQuery = `
          SELECT id_local, marca, modelo, version, anyo
          FROM vehicles
          WHERE marca = $1 AND activo = true
        `;
        
        const compatibleVehiclesResult = await pool.query(compatibleVehiclesQuery, [marca]);
        const compatibleVehicles = compatibleVehiclesResult.rows;
        
        console.log(`Encontrados ${compatibleVehicles.length} vehículos de marca ${marca} para compatibilidad`);
        
        // Si estamos filtrando por modelo específico, filtrar los vehículos compatibles solo de ese modelo
        let filteredCompatibleVehicles = compatibleVehicles;
        if (modelo && modelo !== 'all-models') {
          filteredCompatibleVehicles = compatibleVehicles.filter(v => 
            v.modelo === modelo || 
            v.modelo.includes(modelo) || 
            modelo.includes(v.modelo)
          );
          
          // Si no encontramos vehículos específicos del modelo, usamos todos los de la marca
          if (filteredCompatibleVehicles.length === 0) {
            filteredCompatibleVehicles = compatibleVehicles;
          }
          
          console.log(`Filtrados ${filteredCompatibleVehicles.length} vehículos compatibles para modelo ${modelo}`);
        }
        
        // Guardar los vehículos compatibles para acceso rápido
        const compatibleVehicleMap = new Map();
        filteredCompatibleVehicles.forEach(v => {
          if (!compatibleVehicleMap.has(v.modelo)) {
            compatibleVehicleMap.set(v.modelo, v);
          }
        });
        
        // NO crear vehículos genéricos ni asignar compatibilidades artificiales
        // Solo mostrar las asociaciones reales que ya existen
      }
      
      // Obtener el conteo total de las filas
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      
      // Transformar los resultados al formato esperado por el frontend
      const parts = result.rows.map(row => {
        // Solo usar la información real del vehículo asociado (sin crear compatibles artificiales)
        const originalMarca = row.original_marca || "";
        const originalModelo = row.original_modelo || "";
        const originalVersion = row.original_version || "";
        const originalAnyo = row.original_anyo || 0;
        
        // Para mantener consistencia con el filtrado, solo mostrar información del vehículo
        // si realmente corresponde a la marca filtrada
        const vehicleInfo = originalMarca === marca ? {
          id: row.id_vehiculo || 0,
          vehicleId: row.id_vehiculo || 0,
          marca: originalMarca,
          modelo: originalModelo,
          version: originalVersion,
          anyo: originalAnyo
        } : null;
        
        return {
          id: row.id,
          refLocal: row.ref_local,
          idEmpresa: row.id_empresa,
          codArticulo: row.cod_articulo,
          refPrincipal: row.ref_principal,
          descripcionArticulo: row.descripcion_articulo,
          descripcionFamilia: row.descripcion_familia,
          codFamilia: row.cod_familia,
          precio: row.precio,
          peso: row.peso,
          idVehiculo: row.id_vehiculo,
          imagenes: row.imagenes || [], // Asegurar que siempre sea un array
          activo: row.activo,
          fechaCreacion: row.fecha_creacion,
          vehicleMarca: vehicleInfo ? vehicleInfo.marca : "", // Solo mostrar marca si hay vehículo real
          vehicleModelo: vehicleInfo ? vehicleInfo.modelo : "", // Solo mostrar modelo si hay vehículo real
          vehicleVersion: vehicleInfo ? vehicleInfo.version : "",
          vehicleAnyo: vehicleInfo ? vehicleInfo.anyo : 0,
          relatedVehiclesCount: vehicleInfo ? 1 : 0, // Solo contar si hay vehículo real
          vehiclesCount: vehicleInfo ? 1 : 0, // Para compatibilidad con el frontend
          // Solo incluir información del vehículo si existe y corresponde a la marca filtrada
          vehicles: vehicleInfo ? [vehicleInfo] : [],
          vehicleInfo: vehicleInfo // Información del vehículo para compatibilidad
        };
      });
      
      // Devolver la respuesta en el formato esperado
      res.json({
        data: parts,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      });
    } catch (error) {
      console.error(`Error al buscar piezas por marca:`, error);
      res.status(500).json({ 
        error: "Error al buscar piezas",
        data: [],
        pagination: {
          total: 0,
          limit: parseInt(req.query.limit as string) || 12,
          offset: parseInt(req.query.offset as string) || 0,
          hasMore: false
        }
      });
    }
  });
  
  console.log("Rutas específicas de marcas registradas correctamente");
}