
import { Router, Request, Response } from 'express';
import { getMaintenanceConfig, updateMaintenanceConfig } from '../services/maintenance';
import { isAuthenticated, isAdmin } from '../middleware/auth-middleware';
import type { Express } from 'express';

// Crear un router para las rutas de mantenimiento
export const maintenanceRouter = Router();

/**
 * Obtener la configuración actual de mantenimiento
 * Esta ruta es pública para que el componente de alerta pueda verificar el estado
 */
maintenanceRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await getMaintenanceConfig();
    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración de mantenimiento:', error);
    res.status(500).json({ error: 'Error al obtener configuración de mantenimiento' });
  }
});

/**
 * Actualizar la configuración de mantenimiento
 * Solo administradores pueden modificar esta configuración
 */
maintenanceRouter.post('/config', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔧 MAINTENANCE CONFIG: Solicitud recibida:', req.body);
    console.log('🔧 MAINTENANCE CONFIG: Usuario:', req.user);
    
    const { maintenanceMode, maintenanceMessage, estimatedTime } = req.body;
    
    // Validar los datos de entrada con logs detallados
    const configUpdate: any = {};
    
    if (typeof maintenanceMode === 'boolean') {
      console.log('🔧 MAINTENANCE CONFIG: Actualizando maintenanceMode:', maintenanceMode);
      configUpdate.maintenanceMode = maintenanceMode;
    }
    
    if (maintenanceMessage && typeof maintenanceMessage === 'string') {
      console.log('🔧 MAINTENANCE CONFIG: Actualizando mensaje:', maintenanceMessage);
      configUpdate.maintenanceMessage = maintenanceMessage;
    }
    
    if (estimatedTime && typeof estimatedTime === 'string') {
      console.log('🔧 MAINTENANCE CONFIG: Actualizando tiempo estimado:', estimatedTime);
      configUpdate.estimatedTime = estimatedTime;
    }
    
    if (Object.keys(configUpdate).length === 0) {
      console.log('❌ MAINTENANCE CONFIG: No hay datos válidos para actualizar');
      return res.status(400).json({ error: 'No se proporcionaron datos válidos para actualizar' });
    }
    
    // Actualizar la configuración con logs detallados
    console.log('🔧 MAINTENANCE CONFIG: Enviando a updateMaintenanceConfig:', configUpdate);
    const updatedConfig = await updateMaintenanceConfig(configUpdate);
    console.log('✅ MAINTENANCE CONFIG: Configuración actualizada:', updatedConfig);
    
    // Registrar el cambio
    const userInfo = (req.user as any)?.username || (req.user as any)?.email || 'desconocido';
    console.log(`✅ MAINTENANCE CONFIG: Configuración actualizada por usuario ${userInfo}`);
    
    res.json({
      success: true,
      message: 'Configuración de mantenimiento actualizada correctamente',
      config: updatedConfig
    });
    
  } catch (error) {
    console.error('❌ MAINTENANCE CONFIG: Error crítico:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ 
      error: 'Ha ocurrido un error al actualizar la configuración', 
      details: errorMessage 
    });
  }
});

/**
 * Función para registrar las rutas de mantenimiento en la aplicación Express
 */
export function registerMaintenanceRoutes(app: Express): void {
  app.use('/api/maintenance', maintenanceRouter);
}
