import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { sql, and, lt, eq, ne, isNotNull } from 'drizzle-orm';

async function activatePartsWithoutVehicles() {
  try {
    console.log('🔄 Activando piezas sin vehículo asociado que están desactivadas...\n');
    
    // Encontrar piezas sin vehículo (idVehiculo < 0) que están inactivas pero tienen datos válidos
    const inactivePartsWithoutVehicles = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(
        and(
          lt(parts.idVehiculo, 0),
          eq(parts.activo, false),
          isNotNull(parts.vehicleMarca),
          ne(parts.vehicleMarca, ''),
          ne(parts.vehicleMarca, '» OTROS...'),
          ne(parts.vehicleModelo, 'MODELOS'),
          sql`CAST(${parts.precio} AS DECIMAL) > 0`
        )
      );
    
    console.log(`📊 Piezas sin vehículo inactivas con datos válidos: ${inactivePartsWithoutVehicles[0].count}`);
    
    // Activar piezas sin vehículo asociado que tienen datos válidos
    const result = await db
      .update(parts)
      .set({
        activo: true,
        ultimaSincronizacion: sql`NOW()`
      })
      .where(
        and(
          lt(parts.idVehiculo, 0),
          eq(parts.activo, false),
          isNotNull(parts.vehicleMarca),
          ne(parts.vehicleMarca, ''),
          ne(parts.vehicleMarca, '» OTROS...'),
          ne(parts.vehicleModelo, 'MODELOS'),
          sql`CAST(${parts.precio} AS DECIMAL) > 0`
        )
      );
    
    console.log(`✅ Activadas ${result.rowCount || 0} piezas sin vehículo asociado`);
    
    // Verificar resultados
    const totalNegativeIdActive = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(and(lt(parts.idVehiculo, 0), eq(parts.activo, true)));
      
    console.log(`📊 Total piezas activas con idVehiculo < 0 después de la corrección: ${totalNegativeIdActive[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

activatePartsWithoutVehicles();
