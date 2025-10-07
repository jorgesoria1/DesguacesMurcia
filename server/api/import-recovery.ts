import { Router, Request, Response } from "express";
import { importMonitor } from "../services/import-monitor";
import { db } from "../db";
import { importHistory } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "../auth";
import { disableZeroPricePartsBatch } from "../utils/disable-zero-price-parts";

const router = Router();

// Obtener las importaciones que podrían estar bloqueadas (en estado running por más de 30 minutos)
router.get("/stuck", isAdmin, async (req: Request, res: Response) => {
  try {
    // Calcular tiempo límite (30 minutos atrás)
    const timeThreshold = new Date();
    timeThreshold.setMinutes(timeThreshold.getMinutes() - 30);
    
    // Obtener importaciones en estado "running" con más de 30 minutos
    const stuckImports = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.status, "running"));
    
    // Filtrar las que tienen más de 30 minutos
    const filteredImports = stuckImports.filter(imp => {
      const startTime = new Date(imp.startTime);
      return startTime < timeThreshold;
    });
    
    res.json({ 
      success: true, 
      imports: filteredImports,
      count: filteredImports.length
    });
  } catch (error) {
    console.error("Error al obtener importaciones bloqueadas:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error al obtener importaciones bloqueadas" 
    });
  }
});

// Marcar una importación específica como completada
router.post("/complete/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const importId = parseInt(req.params.id);
    
    if (isNaN(importId)) {
      return res.status(400).json({ 
        success: false, 
        error: "ID de importación inválido" 
      });
    }
    
    // Marcar importación como completada
    const result = await importMonitor.markImportAsCompleted(importId);
    
    res.json({ 
      success: true, 
      message: `Importación #${importId} marcada como completada`,
      importId
    });
  } catch (error) {
    console.error(`Error al marcar importación como completada:`, error);
    res.status(500).json({ 
      success: false, 
      error: "Error al marcar importación como completada" 
    });
  }
});

// Marcar todas las importaciones bloqueadas como completadas
router.post("/complete-all", isAdmin, async (req: Request, res: Response) => {
  try {
    // Calcular tiempo límite (30 minutos atrás)
    const timeThreshold = new Date();
    timeThreshold.setMinutes(timeThreshold.getMinutes() - 30);
    
    // Obtener importaciones en estado "running"
    const runningImports = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.status, "running"));
    
    // Filtrar las que tienen más de 30 minutos
    const stuckImports = runningImports.filter(imp => {
      const startTime = new Date(imp.startTime);
      return startTime < timeThreshold;
    });
    
    if (stuckImports.length === 0) {
      return res.json({ 
        success: true, 
        message: "No hay importaciones bloqueadas para recuperar",
        count: 0
      });
    }
    
    // Marcar cada importación como completada
    for (const imp of stuckImports) {
      await importMonitor.markImportAsCompleted(imp.id);
    }
    
    res.json({ 
      success: true, 
      message: `Se han recuperado ${stuckImports.length} importaciones bloqueadas`,
      count: stuckImports.length,
      importIds: stuckImports.map(imp => imp.id)
    });
  } catch (error) {
    console.error("Error al recuperar importaciones bloqueadas:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error al recuperar importaciones bloqueadas" 
    });
  }
});

// Desactivar piezas con precio cero o nulo
router.post("/disable-zero-price-parts", isAdmin, async (req: Request, res: Response) => {
  try {
    // Procesar la desactivación por lotes para no sobrecargar la BD
    const result = await disableZeroPricePartsBatch();
    
    res.json({ 
      success: true, 
      message: `Se han desactivado ${result.deactivated} piezas con precio cero o nulo`,
      deactivated: result.deactivated
    });
  } catch (error) {
    console.error("Error al desactivar piezas con precio cero:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error al desactivar piezas con precio cero" 
    });
  }
});

export default router;