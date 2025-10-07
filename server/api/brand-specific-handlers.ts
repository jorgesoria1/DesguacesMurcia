/**
 * Handlers específicos para marcas que requieren un tratamiento especial
 * en la búsqueda y filtrado de piezas.
 */
import { Request, Response } from "express";
import { pool } from "../db";

interface ChryslerSearchOptions {
  limit: number;
  offset: number;
  activo?: boolean;
  orden?: string;
  modelo?: string;
}

/**
 * Maneja específicamente las consultas de piezas para la marca CHRYSLER
 * Implementación directa con SQL nativo para evitar problemas con el ORM
 */
export async function handleChryslerParts(
  req: Request, 
  res: Response, 
  options: ChryslerSearchOptions
): Promise<boolean> {
  try {
    console.log("Ejecutando manejador especializado para piezas CHRYSLER");
    
    const { limit, offset, activo = true, orden = 'newest' } = options;
    const modelo = req.query.modelo as string;
    
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
    
    // Construir la consulta base con parámetros seguros
    const params: any[] = [];
    let modeloCondition = '';
    
    if (modelo && modelo !== 'all-models') {
      params.push(modelo);
      modeloCondition = ` AND modelo = $${params.length}`;
    }
    
    params.push(activo);
    const activoParam = `$${params.length}`;
    
    let baseQuery = `
      FROM parts p
      WHERE p.id_vehiculo IN (
        SELECT id_local FROM vehicles WHERE marca = 'CHRYSLER'
        ${modeloCondition}
      )
      AND p.activo = ${activoParam}
      AND CAST(p.precio AS DECIMAL) > 0
    `;
    
    // Consulta para contar el total de resultados
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    
    // Parámetros para la consulta de datos (incluye limit y offset)
    const dataParams = [...params];
    dataParams.push(limit, offset);
    
    // Consulta para obtener los datos paginados
    const dataQuery = `
      SELECT p.* 
      ${baseQuery}
      ORDER BY ${orderBy}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    
    // Ejecutar la consulta de conteo
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);
    
    // Ejecutar la consulta de datos
    const result = await pool.query(dataQuery, dataParams);
    console.log(`CHRYSLER: Encontradas ${result.rows.length} piezas de ${totalCount} totales`);
    
    // Transformar los resultados al formato esperado por el frontend
    const parts = result.rows.map(row => ({
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
      imagenes: row.imagenes,
      activo: row.activo,
      fechaCreacion: row.fecha_creacion,
      vehiclesCount: 1 // Al menos 1 vehículo ya que estamos filtrando por CHRYSLER
    }));
    
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
    
    return true; // Indicar que se ha manejado la solicitud
  } catch (error) {
    console.error("Error en manejador CHRYSLER:", error);
    return false; // Indicar que no se ha podido manejar la solicitud
  }
}