import { Request, Response, Router } from 'express';
import { db } from '../db';
import { parts } from '../../shared/schema';
import { like, desc, eq, sql, and, or } from 'drizzle-orm';

const router = Router();

// Ruta principal para obtener piezas
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const marca = req.query.marca as string;
    const modelo = req.query.modelo as string;
    const familia = req.query.familia as string;
    const orden = req.query.orden as string || "newest";
    const showAssociated = req.query.showAssociated === 'true';
    const showProcessed = req.query.showProcessed === 'true';
    
    console.log('🔧 API /api/parts llamada con parámetros:', req.query);
    console.log(`   - showAssociated: ${showAssociated} (filtro vehículos asociados)`);
    console.log(`   - showProcessed: ${showProcessed} (filtro vehículos procesados)`);

    // Construir las condiciones WHERE
    const conditions = [];
    
    // Condición base: solo piezas activas (disponible_api ya no es necesario tras eliminación directa)
    conditions.push(eq(parts.activo, true));

    // Búsqueda por descripción
    if (search && search.trim() && search.trim() !== "undefined") {
      conditions.push(like(parts.descripcionArticulo, `%${search.trim()}%`));
    }

    // Filtro por marca del vehículo
    if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
      conditions.push(like(parts.vehicleMarca, `%${marca.trim()}%`));
    }

    // Filtro por modelo del vehículo
    if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
      conditions.push(like(parts.vehicleModelo, `%${modelo.trim()}%`));
    }

    // Filtro por familia
    if (familia && familia !== "all-families" && familia.trim() !== "undefined") {
      conditions.push(like(parts.descripcionFamilia, `%${familia.trim()}%`));
    }

    // Filtros por tipo de vehículos
    const vehicleConditions = [];
    if (showAssociated) {
      // Piezas con idVehiculo positivo (vehículos asociados)
      vehicleConditions.push(sql`${parts.idVehiculo} > 0`);
    }
    if (showProcessed) {
      // Piezas con idVehiculo negativo (vehículos procesados)
      vehicleConditions.push(sql`${parts.idVehiculo} < 0`);
    }
    
    // Si al menos uno de los filtros está activo, agregar la condición
    if (vehicleConditions.length > 0) {
      console.log(`   📋 Aplicando filtros de vehículos: ${vehicleConditions.length} condiciones`);
      conditions.push(or(...vehicleConditions));
    } else {
      // Si ninguno está seleccionado, no mostrar ninguna pieza
      console.log(`   ❌ Ningún filtro de vehículos seleccionado - sin resultados`);
      conditions.push(sql`false`);
    }

    // Determinar ordenación
    let orderByClause;
    switch (orden) {
      case "price_asc":
        orderByClause = parts.precio;
        break;
      case "price_desc":
        orderByClause = sql`${parts.precio} DESC`;
        break;
      case "name_asc":
        orderByClause = parts.descripcionArticulo;
        break;
      case "name_desc":
        orderByClause = sql`${parts.descripcionArticulo} DESC`;
        break;
      case "oldest":
        orderByClause = parts.fechaActualizacion;
        break;
      case "newest":
      default:
        orderByClause = sql`${parts.fechaActualizacion} DESC`;
        break;
    }

    // Construir la consulta completa sin reasignaciones
    const baseQuery = db.select().from(parts);
    const queryWithWhere = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    const partsResult = await queryWithWhere
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Obtener conteo total con las mismas condiciones
    const countQueryBase = db.select({ count: sql<number>`COUNT(*)` }).from(parts);
    const countQueryWithWhere = conditions.length > 0
      ? countQueryBase.where(and(...conditions))
      : countQueryBase;
    
    const countResult = await countQueryWithWhere;
    const totalCount = Number(countResult[0].count) || 0;

    console.log(`✅ Piezas obtenidas: ${partsResult.length} de ${totalCount} total`);

    return res.json({
      data: partsResult,
      pagination: {
        total: totalCount,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        offset
      }
    });
  } catch (error) {
    console.error('Error en /api/parts:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      data: [],
      pagination: { total: 0, page: 1, limit: 12 }
    });
  }
});

export default router;