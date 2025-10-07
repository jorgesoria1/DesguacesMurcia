
import { Router } from 'express';
import { metasyncApi } from './metasync';
import { db } from '../db';
import { apiConfig } from '../../shared/schema';

const router = Router();

// Endpoint para obtener estadísticas reales de la API Metasync
router.get('/api-stats', async (req, res) => {
  try {
    console.log('🔍 Obteniendo estadísticas de API Metasync...');
    
    // Obtener configuración activa
    const config = await db.select()
      .from(apiConfig)
      .where(apiConfig.active, true)
      .limit(1)
      .then(rows => rows[0]);

    if (!config) {
      return res.json({
        success: false,
        error: 'No hay configuración activa de la API',
        data: { vehiclesCount: 0, partsCount: 0 }
      });
    }

    // Configurar la API con los datos obtenidos
    metasyncApi.setConfig({
      apiKey: config.apiKey,
      companyId: config.companyId,
      channel: config.channel || 'webcliente'
    });

    let vehiclesCount = 0;
    let partsCount = 0;

    try {
      // Intentar obtener un pequeño sample de vehículos para contar el total
      console.log('📊 Consultando vehículos desde API...');
      const vehiclesResponse = await metasyncApi.getVehicleChanges(
        new Date('2000-01-01'), // Fecha muy antigua para obtener todos
        0, 
        1 // Solo necesitamos 1 para obtener el total
      );

      if (vehiclesResponse && vehiclesResponse.result_set) {
        vehiclesCount = vehiclesResponse.result_set.total || 0;
        console.log(`✅ Total vehículos en API: ${vehiclesCount}`);
      }
    } catch (vehicleError) {
      console.warn('⚠️ Error obteniendo vehículos:', vehicleError.message);
    }

    try {
      // Intentar obtener un pequeño sample de piezas para contar el total
      console.log('📊 Consultando piezas desde API...');
      const partsResponse = await metasyncApi.getPartChanges(
        new Date('2000-01-01'), // Fecha muy antigua para obtener todos
        0,
        1 // Solo necesitamos 1 para obtener el total
      );

      if (partsResponse && partsResponse.result_set) {
        partsCount = partsResponse.result_set.total || 0;
        console.log(`✅ Total piezas en API: ${partsCount}`);
      }
    } catch (partError) {
      console.warn('⚠️ Error obteniendo piezas:', partError.message);
    }

    const result = {
      success: true,
      data: {
        vehiclesCount,
        partsCount,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📈 Estadísticas de API obtenidas:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: { vehiclesCount: 0, partsCount: 0 }
    });
  }
});

export default router;
