import { Router } from 'express';
import { PartsVehicleUpdater } from '../services/parts-vehicle-updater';

const router = Router();

/**
 * Endpoint para corregir la información de vehículos en las piezas
 * POST /api/fix-parts-vehicle-info
 */
router.post('/', async (req, res) => {
  try {
    console.log('🔧 Iniciando corrección de información de vehículos en piezas...');
    
    const updater = new PartsVehicleUpdater();
    await updater.executeFullUpdate();
    
    res.json({
      success: true,
      message: 'Información de vehículos actualizada correctamente en las piezas'
    });
    
  } catch (error) {
    console.error('Error ejecutando corrección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar información de vehículos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;