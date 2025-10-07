import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { sql, and, lt, eq, ne, isNotNull } from 'drizzle-orm';

async function verifyProcessedVehiclesClassification() {
  try {
    console.log('🔍 Verificando clasificación de vehículos procesados...\n');
    
    // Contar piezas con idVehiculo < 0 que tienen datos válidos de vehículo
    const processedVehicleParts = await db
      .select({ 
        count: sql`COUNT(*)`,
        activos: sql`COUNT(*) FILTER (WHERE activo = true)`,
        inactivos: sql`COUNT(*) FILTER (WHERE activo = false)`
      })
      .from(parts)
      .where(
        and(
          lt(parts.idVehiculo, 0),
          isNotNull(parts.vehicleMarca),
          ne(parts.vehicleMarca, ''),
          ne(parts.vehicleMarca, '» OTROS...'),
          ne(parts.vehicleModelo, 'MODELOS')
        )
      );
    
    const result = processedVehicleParts[0];
    console.log(`📊 Piezas de vehículos procesados con datos válidos:`);
    console.log(`   Total: ${result.count}`);
    console.log(`   ✅ Activas: ${result.activos}`);
    console.log(`   ❌ Inactivas: ${result.inactivos}`);
    console.log(`   📈 Tasa de activación: ${((result.activos / result.count) * 100).toFixed(1)}%\n`);
    
    // Verificar la lógica del frontend - estas piezas deberían aparecer
    const frontendLogicParts = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(
        sql`(
          ${parts.activo} = true OR 
          (${parts.idVehiculo} < 0 AND ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' 
           AND ${parts.vehicleMarca} != '» OTROS...' AND ${parts.vehicleModelo} != 'MODELOS')
        )`
      );
    
    console.log(`🎯 Piezas que aparecerían en frontend (lógica actual): ${frontendLogicParts[0].count}`);
    
    // Mostrar algunas piezas de ejemplo
    const examples = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        activo: parts.activo,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio
      })
      .from(parts)
      .where(
        and(
          lt(parts.idVehiculo, 0),
          isNotNull(parts.vehicleMarca),
          ne(parts.vehicleMarca, ''),
          ne(parts.vehicleMarca, '» OTROS...')
        )
      )
      .limit(5);
    
    console.log(`\n🔍 Ejemplos de piezas de vehículos procesados:`);
    examples.forEach(part => {
      console.log(`   • ID: ${part.id}, Ref: ${part.refLocal}, Activo: ${part.activo ? '✅' : '❌'}`);
      console.log(`     Vehículo: ${part.vehicleMarca} ${part.vehicleModelo} (ID: ${part.idVehiculo})`);
      console.log(`     Precio: ${part.precio}€\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyProcessedVehiclesClassification();
