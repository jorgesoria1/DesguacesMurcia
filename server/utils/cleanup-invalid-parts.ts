
/**
 * Utilidad para limpiar piezas con precio inválido que puedan estar activas
 */
import { pool } from '../db';

export async function cleanupInvalidParts(): Promise<{ deactivated: number; found: any[] }> {
  try {
    console.log('🔍 FUNCIÓN DESHABILITADA (30/07/2025): Limpieza de piezas desactivada para preservar catálogo de piezas procesadas');
    console.log('ℹ️ Retornando sin ejecutar limpieza para mantener integridad del catálogo');
    return { deactivated: 0, found: [] };
    
    // Buscar piezas activas con precio problemático (excluyendo vehículos procesados)
    const findQuery = `
      SELECT id, precio, descripcion_articulo, activo
      FROM parts 
      WHERE activo = true 
      AND id_vehiculo > 0
      AND (
        precio IS NULL 
        OR precio = '' 
        OR TRIM(precio) = ''
        OR TRIM(precio) = '0'
        OR TRIM(precio) = '0.0'
        OR TRIM(precio) = '0.00'  
        OR TRIM(precio) = '0,00'
        OR TRIM(precio) = '-0'
        OR TRIM(precio) = '-0.0'
        OR TRIM(precio) = '-0.00'
        OR TRIM(precio) = '-0,00'
        OR (precio ~ '^0+(\\.|,)?0*$')
        OR (precio ~ '^-0+(\\.|,)?0*$')
        OR (precio ~ '^-.*')
        OR (
          precio ~ '^[0-9]+([.,][0-9]+)?$' 
          AND CAST(REPLACE(precio, ',', '.') AS DECIMAL) <= 0
        )
        OR (
          precio ~ '^[0-9.]+$' 
          AND CAST(precio AS DECIMAL) <= 0
        )
      )
      ORDER BY id
      LIMIT 1000
    `;

    const foundParts = await pool.query(findQuery);
    console.log(`🚨 Encontradas ${foundParts.rows.length} piezas activas con precio inválido`);
    
    if (foundParts.rows.length > 0) {
      console.log('📋 Primeras 10 piezas con problema:');
      foundParts.rows.slice(0, 10).forEach((part, index) => {
        console.log(`  ${index + 1}. ID: ${part.id}, Precio: "${part.precio}", Activo: ${part.activo}, Descripción: ${part.descripcion_articulo?.substring(0, 50)}...`);
      });

      // Desactivar las piezas encontradas (excluyendo vehículos procesados)
      const updateQuery = `
        UPDATE parts 
        SET activo = false, updated_at = NOW()
        WHERE activo = true 
        AND id_vehiculo > 0
        AND (
          precio IS NULL 
          OR precio = '' 
          OR TRIM(precio) = ''
          OR TRIM(precio) = '0'
          OR TRIM(precio) = '0.0'
          OR TRIM(precio) = '0.00'  
          OR TRIM(precio) = '0,00'
          OR TRIM(precio) = '-0'
          OR TRIM(precio) = '-0.0'
          OR TRIM(precio) = '-0.00'
          OR TRIM(precio) = '-0,00'
          OR (precio ~ '^0+(\\.|,)?0*$')
          OR (precio ~ '^-0+(\\.|,)?0*$')
          OR (precio ~ '^-.*')
          OR (
            precio ~ '^[0-9]+([.,][0-9]+)?$' 
            AND CAST(REPLACE(precio, ',', '.') AS DECIMAL) <= 0
          )
          OR (
            precio ~ '^[0-9.]+$' 
            AND CAST(precio AS DECIMAL) <= 0
          )
        )
      `;

      const result = await pool.query(updateQuery);
      const deactivatedCount = Number(result.rowCount || 0);
      
      console.log(`✅ Se han desactivado ${deactivatedCount} piezas con precio inválido`);

      return {
        deactivated: deactivatedCount,
        found: foundParts.rows.map(p => ({
          id: p.id,
          precio: p.precio,
          descripcion: p.descripcion_articulo?.substring(0, 50),
          activo: p.activo
        }))
      };
    } else {
      console.log('✅ No se encontraron piezas activas con precio inválido');
      return { deactivated: 0, found: [] };
    }
  } catch (error) {
    console.error('❌ Error al limpiar piezas con precio inválido:', error);
    throw error;
  }
}

export async function auditActiveParts(): Promise<{ total: number; withValidPrice: number; withInvalidPrice: number }> {
  try {
    console.log('🔍 Auditando piezas activas...');
    
    // Contar total de piezas activas
    const totalQuery = `SELECT COUNT(*) as count FROM parts WHERE activo = true`;
    const totalResult = await pool.query(totalQuery);
    const total = parseInt(totalResult.rows[0].count);

    // Contar piezas activas con precio válido
    const validQuery = `
      SELECT COUNT(*) as count 
      FROM parts 
      WHERE activo = true 
      AND precio IS NOT NULL 
      AND precio != '' 
      AND TRIM(precio) != ''
      AND TRIM(precio) != '0'
      AND NOT (precio ~ '^0+(\\.|,)?0*$')
      AND NOT (precio ~ '^-.*')
      AND (
        (precio ~ '^[0-9]+([.,][0-9]+)?$' AND CAST(REPLACE(precio, ',', '.') AS DECIMAL) > 0)
        OR (precio ~ '^[0-9.]+$' AND CAST(precio AS DECIMAL) > 0)
      )
    `;
    const validResult = await pool.query(validQuery);
    const withValidPrice = parseInt(validResult.rows[0].count);
    
    const withInvalidPrice = total - withValidPrice;

    console.log(`📊 Auditoría de piezas activas:
      - Total activas: ${total}
      - Con precio válido: ${withValidPrice}
      - Con precio inválido: ${withInvalidPrice}
    `);

    return { total, withValidPrice, withInvalidPrice };
  } catch (error) {
    console.error('❌ Error en auditoría de piezas:', error);
    throw error;
  }
}
