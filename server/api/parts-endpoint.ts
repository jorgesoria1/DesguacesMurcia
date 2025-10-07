
import { Router, Request, Response } from "express";
import { db } from "../db";
import { parts } from "../../shared/schema";
import { eq, like, and, desc, sql, or, ilike } from "drizzle-orm";

const router = Router();

// Endpoint principal de piezas - acceso público
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      limit = '50',
      offset = '0',
      activo = 'true',
      marca,
      modelo,
      familia,
      search,
      orden = 'newest'
    } = req.query;

    let query = db.select().from(parts);
    const conditions = [];

    // Filtro de activo - only filter when specifically requested
    if (activo === 'true') {
      conditions.push(eq(parts.activo, true));
    } else if (activo === 'false') {
      conditions.push(eq(parts.activo, false));
    }
    // Si activo no se especifica o es 'all', no aplicamos filtro

    // Filtros opcionales
    if (marca && marca !== 'all-brands') {
      conditions.push(eq(parts.marca, marca as string));
    }

    if (modelo && modelo !== 'all-models') {
      conditions.push(eq(parts.modelo, modelo as string));
    }

    if (familia) {
      conditions.push(eq(parts.familia, familia as string));
    }

    if (search) {
      // Search across multiple fields
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(parts.descripcionArticulo, searchTerm),
          ilike(parts.descripcionFamilia, searchTerm),
          ilike(parts.refPrincipal, searchTerm),
          ilike(parts.codArticulo, searchTerm),
          like(sql`CAST(${parts.refLocal} AS TEXT)`, searchTerm),
          like(sql`CAST(${parts.id} AS TEXT)`, searchTerm)
        )
      );
    }

    // Aplicar condiciones
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Ordenación
    if (orden === 'oldest') {
      query = query.orderBy(parts.id);
    } else if (orden === 'price_asc') {
      query = query.orderBy(parts.precio);
    } else if (orden === 'price_desc') {
      query = query.orderBy(desc(parts.precio));
    } else if (orden === 'brand') {
      query = query.orderBy(parts.marca, parts.modelo, desc(parts.id));
    } else {
      // Por defecto: newest
      query = query.orderBy(desc(parts.id));
    }

    // Paginación
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    query = query.limit(limitNum).offset(offsetNum);

    const results = await query;

    // Contar total para paginación
    let countQuery = db.select({ count: sql`count(*)` }).from(parts);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    
    const [{ count }] = await countQuery;
    const total = Number(count);

    res.json({
      success: true,
      data: results,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    });

  } catch (error) {
    console.error('Error en endpoint /api/parts:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener piezas',
      data: []
    });
  }
});

export default router;
