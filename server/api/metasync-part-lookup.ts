
import { Router } from 'express';
import { metasyncApi } from './metasync';

const router = Router();

/**
 * Busca una pieza específica en la API de Metasync por su refLocal
 * Hace búsquedas incrementales por rangos de fechas hasta encontrar la pieza
 */
router.post('/search', async (req, res) => {
  try {
    const { refLocal } = req.body;

    if (!refLocal) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere refLocal'
      });
    }

    const refLocalNum = parseInt(refLocal);
    console.log(`🔍 Buscando pieza refLocal=${refLocalNum} en API Metasync`);

    let foundPart = null;
    const now = new Date();
    
    // Estrategia: buscar solo en períodos recientes (últimos 1-60 días)
    // La API de Metasync solo acepta fechas recientes
    const searchPeriods = [
      { days: 1, offset: 500 },
      { days: 7, offset: 500 },
      { days: 30, offset: 1000 },
      { days: 60, offset: 1000 }
    ];

    for (const period of searchPeriods) {
      if (foundPart) break;

      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - period.days);
      
      console.log(`📅 Buscando en período: últimos ${period.days} días (desde ${fromDate.toISOString().split('T')[0]})`);

      let lastId = 0;
      let attempts = 0;
      const maxAttempts = 10; // Máximo 10 páginas por periodo

      while (attempts < maxAttempts && !foundPart) {
        try {
          console.log(`   📄 Página ${attempts + 1}, lastId: ${lastId}, offset: ${period.offset}`);
          
          const response = await metasyncApi.getPartChanges(fromDate, lastId, period.offset);

          if (response && response.piezas && Array.isArray(response.piezas)) {
            console.log(`   ✅ Recibidas ${response.piezas.length} piezas`);
            
            // Buscar la pieza específica en la respuesta
            foundPart = response.piezas.find((p: any) => {
              const pRefLocal = p.refLocal || p.RefLocal;
              return pRefLocal === refLocalNum;
            });

            if (foundPart) {
              console.log(`   🎯 ¡Pieza encontrada en los últimos ${period.days} días!`);
              break;
            }

            // Si no hay más resultados, salir del loop
            if (response.piezas.length === 0) {
              console.log(`   ℹ️  No hay más piezas en este período`);
              break;
            }

            // Actualizar lastId para la siguiente página
            if (response.result_set && response.result_set.lastId) {
              lastId = response.result_set.lastId;
            } else {
              // Si no hay lastId, usar el último refLocal de las piezas
              const lastPiece = response.piezas[response.piezas.length - 1];
              lastId = lastPiece.refLocal || lastId;
            }
          } else {
            console.log(`   ⚠️  Respuesta vacía o sin piezas`);
            break;
          }

          attempts++;
        } catch (error) {
          console.error(`   ❌ Error en búsqueda:`, error instanceof Error ? error.message : 'Error desconocido');
          break;
        }
      }
    }

    if (foundPart) {
      console.log(`✅ Pieza encontrada en API Metasync: refLocal=${refLocalNum}`);
      return res.json({
        success: true,
        part: foundPart,
        source: 'metasync_api'
      });
    } else {
      console.log(`❌ Pieza no encontrada en API Metasync: refLocal=${refLocalNum}`);
      return res.json({
        success: false,
        message: `No se encontró la pieza con referencia ${refLocalNum} en la API de Metasync (búsqueda limitada a los últimos 60 días de actualizaciones)`
      });
    }

  } catch (error) {
    console.error('❌ Error al buscar pieza en API Metasync:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al consultar la API de Metasync',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
