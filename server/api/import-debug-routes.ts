
import { Router } from 'express';
import { isAdmin, isAuthenticated } from '../auth';
import { importScheduler } from '../services/scheduler';
import { storage } from '../storage';

const router = Router();

// Proteger todas las rutas con autenticación y rol de admin
router.use(isAuthenticated);
router.use(isAdmin);

// Ruta para obtener información detallada del estado de importaciones
router.get('/debug/schedules', async (req, res) => {
  try {
    const schedules = await storage.getImportSchedules();
    
    const scheduleInfo = schedules.map(schedule => ({
      id: schedule.id,
      type: schedule.type,
      frequency: schedule.frequency,
      active: schedule.active,
      lastRun: schedule.lastRun,
      nextRun: schedule.nextRun,
      intervalMs: getIntervalMilliseconds(schedule.frequency),
      intervalHours: getIntervalMilliseconds(schedule.frequency) / (1000 * 60 * 60)
    }));

    res.json({
      schedules: scheduleInfo,
      currentTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting schedule debug info:', error);
    res.status(500).json({ error: 'Error al obtener información de programaciones' });
  }
});

// Ruta para obtener estadísticas de importaciones activas
router.get('/debug/active-imports', async (req, res) => {
  try {
    const activeImports = [];
    
    // Obtener importaciones en progreso
    const importHistory = await storage.getImportHistory();
    const inProgressImports = importHistory.filter(imp => 
      imp.status === 'in_progress' || imp.status === 'processing'
    );

    res.json({
      activeImports: inProgressImports.length,
      imports: inProgressImports.map(imp => ({
        id: imp.id,
        type: imp.type,
        status: imp.status,
        progress: imp.progress,
        startTime: imp.startTime,
        processingItem: imp.processingItem
      }))
    });
  } catch (error) {
    console.error('Error getting active imports:', error);
    res.status(500).json({ error: 'Error al obtener importaciones activas' });
  }
});

function getIntervalMilliseconds(frequency: string): number {
  switch (frequency) {
    case '5m':
      return 5 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case '30m':
      return 30 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '2h':
      return 2 * 60 * 60 * 1000;
    case '4h':
      return 4 * 60 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case '8h':
      return 8 * 60 * 60 * 1000;
    case '12h':
      return 12 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

export default router;
