import { Request, Response, Router } from 'express';
import { db } from '../db';
import { parts } from '../../shared/schema';
import { like, desc, eq, sql, and } from 'drizzle-orm';

const router = Router();

// Ruta principal para obtener piezas
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('🔧 API /api/parts llamada con parámetros:', req.query);
    
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const marca = req.query.marca as string;
    const modelo = req.query.modelo as string;
    const familia = req.query.familia as string;
    const orden = req.query.orden as string || "newest";
    const page = Math.floor(offset / limit) + 1;

    // Construir las condiciones WHERE
    const conditions = [eq(parts.activo, true)];

    if (search && search.trim() && search.trim() !== "undefined") {
      conditions.push(
        like(parts.descripcionArticulo, `%${search.trim()}%`)
      );
    }

    if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
      conditions.push(
        like(parts.vehicleMarca, `%${marca.trim()}%`)
      );
    }

    if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
      conditions.push(
        like(parts.vehicleModelo, `%${modelo.trim()}%`)
      );
    }

    if (familia && familia !== "all-families" && familia.trim() !== "undefined") {
      conditions.push(
        like(parts.descripcionFamilia, `%${familia.trim()}%`)
      );
    }

    // Construir ORDER BY
    let orderBy;
    switch (orden) {
      case "price_asc":
        orderBy = parts.precio;
        break;
      case "price_desc":
        orderBy = desc(parts.precio);
        break;
      case "name_asc":
        orderBy = parts.descripcionArticulo;
        break;
      case "name_desc":
        orderBy = desc(parts.descripcionArticulo);
        break;
      case "oldest":
        orderBy = parts.fechaActualizacion;
        break;
      case "newest":
      default:
        orderBy = desc(parts.fechaActualizacion);
        break;
    }

    // Obtener piezas con paginación
    const partsQuery = db
      .select()
      .from(parts)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const partsResult = await partsQuery;

    // Obtener conteo total
    const countQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(parts)
      .where(and(...conditions));

    const [countResult] = await countQuery;
    const totalCount = Number(countResult.count) || 0;

    console.log(`✅ Piezas obtenidas: ${partsResult.length} de ${totalCount} total`);

    return res.json({
      data: partsResult,
      pagination: {
        total: totalCount,
        page,
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