import { Router } from "express";
import { eq, desc, and, or, gte, lte, isNull } from "drizzle-orm";
import { db } from "../db";
import { popups, popupStats, insertPopupSchema } from "../../shared/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { z } from "zod";

const router = Router();

// Esquema base para conversión de fechas
const dateTransformSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

// Esquema completo para crear pop-ups
const apiPopupSchema = insertPopupSchema.extend({
  startDate: z.union([z.string(), z.null()]).optional().transform(val => val && val !== null ? new Date(val) : undefined),
  endDate: z.union([z.string(), z.null()]).optional().transform(val => val && val !== null ? new Date(val) : undefined),
  image: z.string().optional().nullable(),
}).refine(data => {
  // Validar que endDate sea posterior a startDate si ambas están presentes
  if (data.startDate && data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["endDate"]
});

// Esquema para actualizar pop-ups (partial)
const apiPopupUpdateSchema = insertPopupSchema.partial().extend({
  startDate: z.union([z.string(), z.null()]).optional().transform(val => val && val !== null ? new Date(val) : undefined),
  endDate: z.union([z.string(), z.null()]).optional().transform(val => val && val !== null ? new Date(val) : undefined),
  image: z.string().optional().nullable(),
});

// Obtener pop-ups activos para mostrar en frontend
router.get("/active", async (req, res) => {
  try {
    const { page = "/" } = req.query;
    const currentPage = page as string;
    const now = new Date();

    console.log('Checking active popups for page:', currentPage);
    console.log('Current date:', now.toISOString());

    const activePopups = await db
      .select()
      .from(popups)
      .where(
        and(
          eq(popups.isActive, true),
          or(
            isNull(popups.startDate),
            lte(popups.startDate, now)
          ),
          or(
            isNull(popups.endDate),
            gte(popups.endDate, now)
          )
        )
      )
      .orderBy(desc(popups.priority), desc(popups.createdAt));

    console.log('Active popups found:', activePopups.length);
    activePopups.forEach(popup => {
      console.log('Popup:', {
        id: popup.id,
        title: popup.title,
        trigger: popup.trigger,
        startDate: popup.startDate,
        endDate: popup.endDate,
        isActive: popup.isActive
      });
    });

    // Filtrar por páginas objetivo y excluidas
    const filteredPopups = activePopups.filter(popup => {
      console.log('Filtering popup:', popup.title, {
        targetPages: popup.targetPages,
        excludePages: popup.excludePages,
        currentPage: currentPage
      });

      // Si tiene páginas objetivo, verificar que la página actual esté incluida
      if (popup.targetPages && popup.targetPages.length > 0) {
        const isTargetPage = popup.targetPages.some(targetPage => 
          currentPage === targetPage || currentPage.startsWith(targetPage)
        );
        console.log('Target page check:', isTargetPage);
        if (!isTargetPage) return false;
      }

      // Si tiene páginas excluidas, verificar que la página actual no esté excluida
      if (popup.excludePages && popup.excludePages.length > 0) {
        const isExcludedPage = popup.excludePages.some(excludePage => 
          currentPage === excludePage || currentPage.startsWith(excludePage)
        );
        console.log('Excluded page check:', isExcludedPage);
        if (isExcludedPage) return false;
      }

      console.log('Popup passed all filters:', popup.title);
      return true;
    });

    console.log('Final filtered popups:', filteredPopups.length);
    res.json({ popups: filteredPopups });
  } catch (error) {
    console.error("Error obteniendo pop-ups activos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Registrar estadística de visualización/interacción
router.post("/stats", async (req, res) => {
  try {
    const { popupId, action, page, sessionId, userId } = req.body;
    
    if (!popupId || !action || !page) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    await db.insert(popupStats).values({
      popupId: parseInt(popupId),
      userId: userId ? parseInt(userId) : null,
      sessionId: sessionId || null,
      action,
      page,
      userAgent,
      ipAddress
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error registrando estadística de pop-up:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ===== RUTAS DE ADMINISTRACIÓN =====

// Obtener todos los pop-ups (admin)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const allPopups = await db
      .select()
      .from(popups)
      .orderBy(desc(popups.createdAt));

    res.json({ popups: allPopups });
  } catch (error) {
    console.error("Error obteniendo pop-ups:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener pop-up por ID (admin)
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const popup = await db
      .select()
      .from(popups)
      .where(eq(popups.id, id))
      .limit(1);

    if (popup.length === 0) {
      return res.status(404).json({ error: "Pop-up no encontrado" });
    }

    res.json({ popup: popup[0] });
  } catch (error) {
    console.error("Error obteniendo pop-up:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear nuevo pop-up (admin)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const validatedData = apiPopupSchema.parse(req.body);
    
    const newPopup = await db
      .insert(popups)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json({ popup: newPopup[0] });
  } catch (error) {
    console.error("Error creando pop-up:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Datos inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Actualizar pop-up (admin)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = apiPopupUpdateSchema.parse(req.body);
    
    const updatedPopup = await db
      .update(popups)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(popups.id, id))
      .returning();

    if (updatedPopup.length === 0) {
      return res.status(404).json({ error: "Pop-up no encontrado" });
    }

    res.json({ popup: updatedPopup[0] });
  } catch (error) {
    console.error("Error actualizando pop-up:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Datos inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Activar/Desactivar pop-up (admin)
router.patch("/:id/toggle", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Obtener el estado actual
    const currentPopup = await db
      .select()
      .from(popups)
      .where(eq(popups.id, id))
      .limit(1);

    if (currentPopup.length === 0) {
      return res.status(404).json({ error: "Pop-up no encontrado" });
    }

    // Cambiar el estado
    const newActiveState = !currentPopup[0].isActive;
    
    const updatedPopup = await db
      .update(popups)
      .set({
        isActive: newActiveState,
        updatedAt: new Date()
      })
      .where(eq(popups.id, id))
      .returning();

    res.json({ 
      popup: updatedPopup[0],
      message: `Pop-up ${newActiveState ? 'activado' : 'desactivado'} correctamente`
    });
  } catch (error) {
    console.error("Error cambiando estado del pop-up:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Eliminar pop-up (admin)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const deletedPopup = await db
      .delete(popups)
      .where(eq(popups.id, id))
      .returning();

    if (deletedPopup.length === 0) {
      return res.status(404).json({ error: "Pop-up no encontrado" });
    }

    res.json({ message: "Pop-up eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando pop-up:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener estadísticas de un pop-up (admin)
router.get("/:id/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const stats = await db
      .select()
      .from(popupStats)
      .where(eq(popupStats.popupId, id))
      .orderBy(desc(popupStats.createdAt));

    // Calcular estadísticas resumidas
    const summary = {
      totalViews: stats.filter(s => s.action === 'viewed').length,
      totalClicks: stats.filter(s => s.action === 'clicked').length,
      totalCloses: stats.filter(s => s.action === 'closed').length,
      totalIgnored: stats.filter(s => s.action === 'ignored').length,
      clickRate: 0,
      closeRate: 0
    };

    if (summary.totalViews > 0) {
      summary.clickRate = (summary.totalClicks / summary.totalViews) * 100;
      summary.closeRate = (summary.totalCloses / summary.totalViews) * 100;
    }

    res.json({ stats, summary });
  } catch (error) {
    console.error("Error obteniendo estadísticas del pop-up:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export { router as popupsRouter };
export default router;