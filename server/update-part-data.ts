/**
 * Script simplificado para actualizar directamente la información
 * de vehículos en las piezas usando SQL
 */

import { db } from './db';
import { sql } from 'drizzle-orm';

async function updatePartsWithFamilyData() {
  console.log('Iniciando actualización simplificada de información de vehículos en piezas...');

  try {
    // Actualizar los campos de vehículo basados en descripcionFamilia y codFamilia
    // cuando esos campos no estén ya establecidos
    const result = await db.execute(sql`
      UPDATE parts
      SET 
        vehicle_marca = CASE 
          WHEN descripcion_familia != 'GENERICO' AND descripcion_familia != '' THEN descripcion_familia
          WHEN cod_familia != '010' AND cod_familia != '' THEN cod_familia
          ELSE vehicle_marca
        END,
        vehicle_modelo = CASE
          WHEN vehicle_modelo = '' OR vehicle_modelo IS NULL THEN cod_articulo
          ELSE vehicle_modelo
        END
      WHERE 
        (vehicle_marca = '' OR vehicle_marca IS NULL)
        AND (descripcion_familia != '' OR cod_familia != '')
    `);
    
    console.log('Actualización completada.');

    // Mostrar estadísticas
    const stats = await db.select({
      total: sql`COUNT(*)`,
      withVehicleMarca: sql`SUM(CASE WHEN vehicle_marca != '' AND vehicle_marca IS NOT NULL THEN 1 ELSE 0 END)`,
      withVehicleModelo: sql`SUM(CASE WHEN vehicle_modelo != '' AND vehicle_modelo IS NOT NULL THEN 1 ELSE 0 END)`,
      withRelatedVehicles: sql`SUM(CASE WHEN related_vehicles_count > 0 THEN 1 ELSE 0 END)`
    }).from(sql`parts`);
    
    if (stats.length > 0) {
      console.log('Estadísticas:');
      console.log(`- Total de piezas: ${stats[0].total}`);
      console.log(`- Piezas con marca de vehículo: ${stats[0].withVehicleMarca}`);
      console.log(`- Piezas con modelo de vehículo: ${stats[0].withVehicleModelo}`);
      console.log(`- Piezas con vehículos relacionados: ${stats[0].withRelatedVehicles}`);
    }
    
  } catch (error) {
    console.error('Error durante la actualización:', error);
  }
}

// Ejecutar directamente
updatePartsWithFamilyData()
  .then(() => console.log('Proceso finalizado'))
  .catch(err => console.error('Error en el proceso principal:', err));