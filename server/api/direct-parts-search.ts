/**
 * Búsqueda directa de piezas con SQL nativo para marcas específicas
 * Esta implementación evita los problemas con el ORM en ciertas consultas
 */
import { Request, Response } from "express";
import { pool } from "../db";

/**
 * Busca piezas de la marca CHRYSLER directamente con SQL nativo
 */
export async function searchChryslerParts(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = parseInt(req.query.offset as string) || 0;
    const orden = req.query.orden as string || 'newest';
    
    console.log(`Buscando piezas CHRYSLER con SQL directo. Limit: ${limit}, Offset: ${offset}`);
    
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
    
    // Consulta directa para encontrar piezas CHRYSLER
    // Añadimos comentario detallado para explicar la lógica de búsqueda
    console.log(`Construyendo consulta SQL para piezas CHRYSLER con orderBy=${orderBy}`);
    
    // Consulta más simple directamente a tabla parts, sin subconsultas
    const query = `
      SELECT 
        p.*,
        COUNT(*) OVER() as total_count
      FROM parts p
      JOIN vehicles v ON p.id_vehiculo = v.id_local
      WHERE v.marca = 'CHRYSLER'
      AND p.activo = true
      AND CAST(p.precio AS DECIMAL) > 0
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    console.log("Consulta SQL generada para CHRYSLER");
    
    const result = await pool.query(query);
    console.log(`Encontradas ${result.rows.length} piezas CHRYSLER`);
    
    // Obtener el conteo total de las filas
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    
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
      imagenes: row.imagenes || [], // Asegurar que siempre sea un array
      activo: row.activo,
      fechaCreacion: row.fecha_creacion,
      vehicleMarca: "CHRYSLER", // Añadir datos del vehículo para consistencia
      vehicleModelo: row.vehicle_modelo || "",
      vehicleVersion: row.vehicle_version || "",
      vehicleAnyo: row.vehicle_anyo || 0,
      relatedVehiclesCount: 1, // Al menos 1 vehículo ya que estamos filtrando por CHRYSLER
      vehiclesCount: 1 // Para compatibilidad con el frontend
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
  } catch (error) {
    console.error("Error al buscar piezas CHRYSLER:", error);
    res.status(500).json({ 
      error: "Error al buscar piezas de CHRYSLER",
      data: [],
      pagination: {
        total: 0,
        limit: parseInt(req.query.limit as string) || 12,
        offset: parseInt(req.query.offset as string) || 0,
        hasMore: false
      }
    });
  }
}