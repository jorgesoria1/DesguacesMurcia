/**
 * Utilidad para desactivar automáticamente piezas con precio 0
 */
import { db } from '../db';
import { parts } from '@shared/schema';

/**
 * Desactiva todas las piezas con precio 0 (o menor)
 * Esta función se puede ejecutar periódicamente o como parte del proceso de importación
 * 
 * @returns Número de piezas desactivadas
 */
export async function disableZeroPriceParts(): Promise<{ deactivated: number }> {
  try {
    console.log('🔍 FUNCIÓN DESHABILITADA (30/07/2025): Desactivación de piezas deshabilitada para preservar catálogo de piezas procesadas');
    console.log('ℹ️ Retornando sin ejecutar desactivación para mantener integridad del catálogo');
    return { deactivated: 0 };

    // Realizamos un conteo previo para saber cuántas piezas se verán afectadas (excluyendo vehículos procesados)
    const countResult = await db.execute(
      `SELECT COUNT(*) as count
       FROM parts 
       WHERE activo = true 
         AND id_vehiculo > 0
         AND (
           precio IS NULL 
           OR precio = '' 
           OR precio = '0' 
           OR precio = '0,00'
           OR precio = '0.00'
           OR (precio ~ '^[0-9]+([,.][0-9]+)?$' AND CAST(REPLACE(precio, ',', '.') AS NUMERIC) = 0)
         )
       `
    );

    const count = countResult.rows && countResult.rows.length > 0 ? parseInt(countResult.rows[0].count) : 0;

    if (count === 0) {
      console.log('No se encontraron piezas con precio 0 que estén activas.');
      return { deactivated: 0 };
    }

    console.log(`Se encontraron ${count} piezas con precio 0 que estaban activas.`);

    // Desactivar todas las piezas con precio 0 o negativo en una sola operación (excluyendo vehículos procesados)
    await db.execute(
      `UPDATE parts 
         SET activo = false, updated_at = NOW()
         WHERE activo = true 
           AND id_vehiculo > 0
           AND (
             precio IS NULL 
             OR precio = '' 
             OR precio = '0' 
             OR precio = '0,00' 
             OR precio = '0.00'
             OR (precio ~ '^[0-9]+([,.][0-9]+)?$' AND CAST(REPLACE(precio, ',', '.') AS NUMERIC) = 0)
           )
       `
    );

    console.log(`Se desactivaron ${count} piezas con precio 0.`);
    return { deactivated: count };
  } catch (error) {
    console.error('Error al desactivar piezas con precio 0:', error);
    throw error;
  }
}