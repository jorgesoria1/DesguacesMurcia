import { Request, Response, Router } from 'express';
import { db } from '../db';
import { parts } from '../../shared/schema';
import { like, desc, eq, sql, and, or } from 'drizzle-orm';

const router = Router();

// Ruta principal para obtener piezas
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('🔧 API /api/parts llamada con parámetros:', req.query);
    
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const orden = req.query.orden as string || "newest";

    // Condiciones básicas
    let query = db.select().from(parts).where(eq(parts.activo, true));

    // Aplicar búsqueda si existe
    if (search && search.trim() && search.trim() !== "undefined") {
      query = query.where(
        and(
          eq(parts.activo, true),
          like(parts.descripcionArticulo, `%${search.trim()}%`)
        )
      );
    }

    // Aplicar ordenación
    switch (orden) {
      case "price_asc":
        query = query.orderBy(parts.precio);
        break;
      case "price_desc":
        query = query.orderBy(desc(parts.precio));
        break;
      case "name_asc":
        query = query.orderBy(parts.descripcionArticulo);
        break;
      case "name_desc":
        query = query.orderBy(desc(parts.descripcionArticulo));
        break;
      case "oldest":
        query = query.orderBy(parts.fechaActualizacion);
        break;
      case "newest":
      default:
        query = query.orderBy(desc(parts.fechaActualizacion));
        break;
    }

    // Aplicar paginación
    const partsResult = await query.limit(limit).offset(offset);

    // Obtener conteo total
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(parts)
      .where(eq(parts.activo, true));

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