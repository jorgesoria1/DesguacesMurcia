import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { siteConfig } from '../../shared/schema';

/**
 * Middleware mejorado para controlar el acceso al sitio durante el modo mantenimiento
 * - Excluye completamente rutas de API, health checks y assets
 * - Solo aplica verificación a rutas de frontend
 * - Cache de configuración para mejor rendimiento
 */

let cachedConfig: { maintenanceMode: boolean; lastCheck: number } | null = null;
const CACHE_DURATION = 30000; // 30 segundos

async function getMaintenanceConfig() {
  const now = Date.now();
  
  // Usar cache si está disponible y es reciente
  if (cachedConfig && (now - cachedConfig.lastCheck) < CACHE_DURATION) {
    return { maintenanceMode: cachedConfig.maintenanceMode };
  }

  try {
    const config = await db.select().from(siteConfig).limit(1);
    const maintenanceMode = config[0]?.maintenanceMode || false;
    
    // Actualizar cache
    cachedConfig = {
      maintenanceMode,
      lastCheck: now
    };
    
    return { maintenanceMode };
  } catch (error) {
    console.error('Error fetching maintenance config:', error);
    // En caso de error, asumir que no está en mantenimiento
    return { maintenanceMode: false };
  }
}

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // EARLY EXIT - Skip ALL development files, assets, and API routes IMMEDIATELY
  if (req.path.startsWith('/api/') || req.path.startsWith('/@') || 
      req.path.startsWith('/node_modules/') || req.path.startsWith('/src/') ||
      req.path.includes('.js') || req.path.includes('.css') || req.path.includes('.png') || 
      req.path.includes('.jpg') || req.path.includes('.ico') || req.path.includes('.svg') ||
      req.path.includes('.ts') || req.path.includes('.tsx') || req.path.includes('.json') ||
      req.path.includes('?') || req.path.includes('__vite') || req.path.includes('hot-update') ||
      req.path === '/health' || req.path.startsWith('/assets/') || req.path.startsWith('/admin') || req.path.startsWith('/login')) {
    return next();
  }

  // Obtener configuración de mantenimiento SOLO para páginas reales
  try {
    const config = await getMaintenanceConfig();
    
    // Si no está en modo mantenimiento, permitir acceso a todo
    if (!config.maintenanceMode) {
      return next();
    }
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return next(); // En caso de error, permitir acceso
  }

  try {
    // Verificar si el usuario es administrador
    const isAdmin = req.isAuthenticated && req.isAuthenticated() && (req.user as any)?.isAdmin;
    
    if (isAdmin) {
      return next();
    }
    
    // En modo mantenimiento y no es admin, mostrar página de mantenimiento
    console.log(`🚧 Maintenance mode active - blocking access to: ${req.path}`);
    return res.status(503).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sitio en Mantenimiento</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
            color: #111827;
          }
          .maintenance-container {
            max-width: 600px;
            text-align: center;
            padding: 40px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: #1f2937;
          }
          p {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 24px;
            color: #4b5563;
          }
          .info {
            background-color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="maintenance-container">
          <h1>🔧 Sitio en Mantenimiento</h1>
          <p>Estamos realizando mejoras en nuestra plataforma para ofrecerte una mejor experiencia.</p>
          <div class="info">
            <p><strong>Volveremos pronto</strong></p>
            <p>Disculpa las molestias.</p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in maintenance middleware:', error);
    // En caso de error, permitir acceso normal
    return next();
  }
};