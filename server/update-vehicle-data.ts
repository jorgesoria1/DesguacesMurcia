/**
 * Script para actualizar los datos de vehículo en todas las piezas
 * Esto mejorará el rendimiento del filtrado por marca, modelo, etc.
 */

import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import { parts, vehicles, vehicleParts } from '../shared/schema';

async function updateVehicleDataInParts() {
  console.log('Iniciando actualización de datos de vehículo en piezas...');

  try {
    // 1. Actualizar campos de vehículo en piezas basado en el vehiculo principal
    const updateResult = await db.execute(sql`
      UPDATE parts p
      SET 
        vehicle_marca = v.marca,
        vehicle_modelo = v.modelo,
        vehicle_version = v.version,
        vehicle_anyo = v.anyo
      FROM vehicles v
      WHERE p.id_vehiculo = v.id_local
    `);
    
    console.log('Actualización de datos de vehículo completada');
    
    // 2. Actualizar contador de vehículos relacionados
    const updateCountResult = await db.execute(sql`
      UPDATE parts p
      SET related_vehicles_count = (
        SELECT COUNT(*) 
        FROM vehicle_parts vp 
        WHERE vp.part_id = p.id
      )
    `);
    
    console.log('Actualización de contador de vehículos completada');
    
    // 3. Mostrar estadísticas
    const stats = await db.select({
      total: sql`COUNT(*)`,
      withVehicleData: sql`SUM(CASE WHEN vehicle_marca != '' THEN 1 ELSE 0 END)`,
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
updateVehicleDataInParts()
  .then(() => console.log('Proceso completado exitosamente'))
  .catch((error) => {
    console.error('Error en el proceso:', error);
  });

export { updateVehicleDataInParts };