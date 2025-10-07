import { db } from '../db';
import { parts } from '../../shared/schema';
import { eq, sql, isNull, and, or } from 'drizzle-orm';

/**
 * Utilidad para desactivar piezas con precios a cero o nulos
 * Esta función verifica y desactiva todas las piezas que tengan precio 0 o nulo
 * PRESERVA piezas procesadas (idVehiculo < 0) que usan precio -1 como marcador normal
 */
export async function disableZeroPriceParts(): Promise<number> {
  try {
    console.log("🔍 FUNCIÓN DESHABILITADA (30/07/2025): Desactivación de piezas deshabilitada para preservar catálogo de piezas procesadas");
    console.log("ℹ️ Retornando sin ejecutar desactivación para mantener integridad del catálogo");
    return 0;
    
    // CÓDIGO ORIGINAL DESHABILITADO:
    // const result = await db
    //   .update(parts)
    //   .set({ 
    //     activo: false,
    //     fechaActualizacion: sql`NOW()`
    //   })
    //   .where(
    //     and(
    //       eq(parts.activo, true),
    //       or(
    //         // Piezas regulares con precio cero/nulo
    //         and(
    //           sql`${parts.idVehiculo} > 0`,
    //           or(
    //             eq(parts.precio, "0"),
    //             eq(parts.precio, "0.00"),
    //             eq(parts.precio, ""),
    //             isNull(parts.precio)
    //           )
    //         ),
    //         // Piezas procesadas con precio negativo (excepto -1) o nombre "NO IDENTIFICADO"
    //         and(
    //           sql`${parts.idVehiculo} < 0`,
    //           or(
    //             sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) < -1`,
    //             sql`UPPER(${parts.descripcionArticulo}) LIKE '%NO IDENTIFICADO%'`,
    //             sql`UPPER(${parts.vehicleMarca}) LIKE '%NO IDENTIFICADO%'`
    //           )
    //         )
    //       )
    //     )
    //   );
    // return result.rowCount || 0;
  } catch (error) {
    console.error("Error al desactivar piezas con precio cero:", error);
    return 0; // Retornar 0 en lugar de lanzar error para no bloquear la aplicación
  }
}

/**
 * Función para desactivar piezas por lote
 * Útil para procesar grandes cantidades de datos sin sobrecargar la BD
 * PRESERVA piezas procesadas (idVehiculo < 0) que usan precio -1 como marcador normal
 */
export async function disableZeroPricePartsBatch(batchSize: number = 1000): Promise<{ deactivated: number }> {
  try {
    console.log("🔍 FUNCIÓN DESHABILITADA (30/07/2025): Desactivación por lotes deshabilitada para preservar catálogo de piezas procesadas");
    console.log("ℹ️ Retornando sin ejecutar desactivación para mantener integridad del catálogo");
    return { deactivated: 0 };

    let totalDeactivated = 0;
    let hasMore = true;

    while (hasMore) {
      // Buscar un lote de piezas activas que deben desactivarse:
      // 1. Piezas regulares (idVehiculo > 0) con precio cero/nulo
      // 2. Piezas procesadas (idVehiculo < 0) con precio negativo (excepto -1) o nombre "NO IDENTIFICADO"
      const zeroPriceParts = await db
        .select()
        .from(parts)
        .where(
          and(
            eq(parts.activo, true),
            or(
              // Piezas regulares con precio cero/nulo
              and(
                sql`${parts.idVehiculo} > 0`,
                or(
                  sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) = 0`,
                  isNull(parts.precio),
                  eq(parts.precio, ''),
                  eq(parts.precio, '0'),
                  eq(parts.precio, '0,00')
                )
              ),
              // Piezas procesadas con precio negativo (excepto -1) o nombre "NO IDENTIFICADO"
              and(
                sql`${parts.idVehiculo} < 0`,
                or(
                  sql`CAST(REPLACE(${parts.precio}, ',', '.') AS NUMERIC) < -1`, // Precios más negativos que -1
                  sql`UPPER(${parts.descripcionArticulo}) LIKE '%NO IDENTIFICADO%'`,
                  sql`UPPER(${parts.vehicleMarca}) LIKE '%NO IDENTIFICADO%'`
                )
              )
            )
          )
        )
        .limit(batchSize);

      if (zeroPriceParts.length === 0) {
        hasMore = false;
        break;
      }

      // Obtener IDs para actualizar
      const partIds = zeroPriceParts.map(p => p.id);

      // Actualizar piezas en un lote
      const result = await db
        .update(parts)
        .set({ 
          activo: false,
          fechaActualizacion: sql`NOW()`
        })
        .where(sql`${parts.id} IN (${sql.join(partIds)})`);

      // Contabilizar piezas desactivadas
      totalDeactivated += partIds.length;

      console.log(`Lote procesado: ${partIds.length} piezas desactivadas. Total: ${totalDeactivated}`);

      // Si el batch no está completo, significa que no hay más
      if (partIds.length < batchSize) {
        hasMore = false;
      }
    }

    console.log(`Completado: Se han desactivado ${totalDeactivated} piezas con precio cero o nulo`);

    return { deactivated: totalDeactivated };
  } catch (error) {
    console.error('Error al desactivar piezas con precio cero por lotes:', error);
    return { deactivated: 0 };
  }
}