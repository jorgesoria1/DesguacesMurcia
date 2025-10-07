/**
 * Script para actualizar los datos de vehículo en todas las piezas
 * Obtiene información directamente del endpoint de piezas para actualizar los campos de vehículo
 */

import { db } from './db';
import { eq, sql, inArray, gt, isNull, or, and, ne } from 'drizzle-orm';
import { parts, vehicles, vehicleParts, apiConfig } from '../shared/schema';
import axios from 'axios';

// Estructura para almacenar información de vehículos desde la API
interface VehiculoInfo {
  marca: string;
  modelo: string;
  version: string;
  anyo: number;
  idLocal: number;
}

async function updatePartsWithVehicleInfo() {
  console.log('Iniciando actualización de información de vehículos en piezas...');

  try {
    // 1. Obtener la configuración de la API
    const configResult = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    
    if (!configResult || configResult.length === 0) {
      throw new Error('No se encontró configuración activa de API');
    }
    
    const apiConfigData = configResult[0];

    // 2. Obtener las piezas que necesitan actualización (todas o las que no tienen info de vehículo)
    const piezasParaActualizar = await db.select({
      id: parts.id,
      refLocal: parts.refLocal,
      idVehiculo: parts.idVehiculo,
    })
    .from(parts)
    .where(sql`(vehicle_marca = '' OR vehicle_marca IS NULL)`);

    if (piezasParaActualizar.length === 0) {
      console.log('No hay piezas que necesiten actualización de datos de vehículo');
      return;
    }

    console.log(`Se actualizarán ${piezasParaActualizar.length} piezas con información de vehículo`);

    // 3. Hacer la solicitud a la API para obtener los datos de las piezas con sus vehículos
    // Agrupamos las piezas en lotes para evitar solicitudes muy grandes
    const BATCH_SIZE = 1000;
    let actualizadas = 0;

    for (let i = 0; i < piezasParaActualizar.length; i += BATCH_SIZE) {
      const lote = piezasParaActualizar.slice(i, i + BATCH_SIZE);
      const refLocales = lote.map(p => p.refLocal);

      // Obtener datos de la API para este lote
      const response = await axios.post('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
        apiKey: apiConfig.apiKey,
        companyId: apiConfig.companyId,
        channel: apiConfig.channel,
        filtro: {
          refLocales: refLocales,
          incluirPiezas: true,
          incluirVehiculos: true
        }
      });

      if (!response.data || !response.data.success || !response.data.data || !response.data.data.piezas) {
        console.error('Error en la respuesta de la API o formato incorrecto');
        continue;
      }

      const piezasAPI = response.data.data.piezas;
      
      // Buscar vehículos en la respuesta
      const vehiculosAPI = response.data.data.vehiculos || [];
      
      // Crear un mapa de vehículos para búsqueda rápida
      const mapaVehiculos = new Map<number, VehiculoInfo>();
      
      // Agregar vehículos de la respuesta al mapa
      for (const vehiculo of vehiculosAPI) {
        mapaVehiculos.set(vehiculo.idLocal, {
          marca: vehiculo.marca || '',
          modelo: vehiculo.modelo || '',
          version: vehiculo.version || '',
          anyo: vehiculo.anyo || 0,
          idLocal: vehiculo.idLocal
        });
      }
      
      // También buscar en la base de datos los vehículos que no están en la respuesta API
      const idVehiculosNoEncontrados = lote
        .map(p => p.idVehiculo)
        .filter(id => id > 0 && !mapaVehiculos.has(id));
      
      if (idVehiculosNoEncontrados.length > 0) {
        const vehiculosDB = await db.select()
          .from(vehicles)
          .where(inArray(vehicles.idLocal, idVehiculosNoEncontrados));
          
        for (const vehiculo of vehiculosDB) {
          mapaVehiculos.set(vehiculo.idLocal, {
            marca: vehiculo.marca || '',
            modelo: vehiculo.modelo || '',
            version: vehiculo.version || '',
            anyo: vehiculo.anyo || 0,
            idLocal: vehiculo.idLocal
          });
        }
      }

      // Procesar cada pieza y actualizar su información de vehículo
      for (const piezaAPI of piezasAPI) {
        const refLocal = piezaAPI.refLocal;
        const idVehiculo = piezaAPI.idVehiculo;
        
        // Si la pieza tiene un vehículo asociado en el API, usar esa información
        let vehicleInfo: VehiculoInfo | undefined;
        
        if (idVehiculo > 0) {
          vehicleInfo = mapaVehiculos.get(idVehiculo);
        }

        // Si no encontramos el vehículo, intentamos extraer información del API directamente
        // (ya que el endpoint puede tener info de vehículo sin el vehículo completo)
        if (!vehicleInfo && piezaAPI.datosVehiculo) {
          vehicleInfo = {
            marca: piezaAPI.datosVehiculo.marca || '',
            modelo: piezaAPI.datosVehiculo.modelo || '',
            version: piezaAPI.datosVehiculo.version || '',
            anyo: piezaAPI.datosVehiculo.anyo || 0,
            idLocal: idVehiculo
          };
        }

        // Si aún no tenemos información pero tenemos codFamilia (que a veces tiene info de marca)
        if (!vehicleInfo || (!vehicleInfo.marca && !vehicleInfo.modelo)) {
          const marca = piezaAPI.codFamilia || '';
          
          // Actualizar la pieza con la información mínima disponible
          await db.update(parts)
            .set({
              vehicleMarca: marca,
              vehicleModelo: '',
              vehicleVersion: '',
              vehicleAnyo: 0
            })
            .where(eq(parts.refLocal, refLocal));
        } else {
          // Actualizar la pieza con la información completa
          await db.update(parts)
            .set({
              vehicleMarca: vehicleInfo.marca,
              vehicleModelo: vehicleInfo.modelo,
              vehicleVersion: vehicleInfo.version,
              vehicleAnyo: vehicleInfo.anyo
            })
            .where(eq(parts.refLocal, refLocal));
        }
        
        actualizadas++;
      }
      
      console.log(`Procesadas ${actualizadas} piezas hasta ahora`);
    }

    // 4. Actualizar el contador de vehículos relacionados
    const updateCountResult = await db.execute(sql`
      UPDATE parts p
      SET related_vehicles_count = (
        SELECT COUNT(*) 
        FROM vehicle_parts vp 
        WHERE vp.part_id = p.id
      )
    `);
    
    console.log('Actualización de contador de vehículos completada');
    
    // 5. Mostrar estadísticas
    const stats = await db.select({
      total: sql`COUNT(*)`,
      withVehicleData: sql`SUM(CASE WHEN vehicle_marca != '' AND vehicle_marca IS NOT NULL THEN 1 ELSE 0 END)`,
      withRelatedVehicles: sql`SUM(CASE WHEN related_vehicles_count > 0 THEN 1 ELSE 0 END)`
    }).from(parts);
    
    if (stats.length > 0) {
      const data = stats[0];
      console.log('Estadísticas:');
      console.log(`- Total de piezas: ${data.total}`);
      console.log(`- Piezas con datos de vehículo: ${data.withVehicleData}`);
      console.log(`- Piezas con vehículos relacionados: ${data.withRelatedVehicles}`);
    }
    
    console.log('Proceso finalizado correctamente');
  } catch (error) {
    console.error('Error al actualizar datos de vehículo:', error);
  }
}

// Ejecutar la función
updatePartsWithVehicleInfo()
  .then(() => console.log('Proceso completado exitosamente'))
  .catch((error) => {
    console.error('Error en el proceso:', error);
  });

export { updatePartsWithVehicleInfo };