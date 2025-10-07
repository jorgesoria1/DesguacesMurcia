import { db } from './server/db';
import { parts } from './shared/schema';
import { eq, and, isNotNull, ne, sql, notInArray } from 'drizzle-orm';

console.log('🔧 Reactivando piezas procesadas con datos válidos de vehículo...');

async function reactivateProcessedPartsWithValidVehicleData() {
  try {
    console.log('🔍 Identificando piezas procesadas desactivadas con datos válidos...');
    
    // Familias genéricas que NO representan marcas válidas
    const invalidFamilies = [
      'ELECTRICIDAD', 'CARROCERÍA TRASERA', 'INTERIOR', 'SUSPENSIÓN', 
      'FRENOS', 'DIRECCIÓN', 'TRANSMISIÓN', 'MOTOR', 'ADMISIÓN', 
      'ESCAPE', 'ALUMBRADO', 'CLIMATIZACIÓN', 'ACCESORIOS',
      'CARROCERÍA', 'CAMBIO', 'EMBRAGUE', 'REFRIGERACIÓN'
    ];
    
    // Encontrar piezas procesadas desactivadas con datos válidos de vehículo
    const partsToReactivate = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio
      })
      .from(parts)
      .where(
        and(
          sql`${parts.idVehiculo} < 0`, // Solo piezas procesadas
          eq(parts.activo, false), // Solo inactivas
          isNotNull(parts.vehicleMarca), // Que tengan marca
          ne(parts.vehicleMarca, ''), // Marca no vacía
          notInArray(parts.vehicleMarca, invalidFamilies) // Marca válida (no genérica)
        )
      );
    
    console.log(`📊 Encontradas ${partsToReactivate.length} piezas procesadas para reactivar`);
    
    if (partsToReactivate.length === 0) {
      console.log('✅ No hay piezas procesadas que requieran reactivación');
      return 0;
    }
    
    // Mostrar distribución por marca
    const marcaCount = {};
    partsToReactivate.forEach(part => {
      marcaCount[part.vehicleMarca] = (marcaCount[part.vehicleMarca] || 0) + 1;
    });
    
    console.log('📋 Distribución por marca:');
    Object.entries(marcaCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([marca, count]) => {
        console.log(`  • ${marca}: ${count} piezas`);
      });
    
    // Reactivar todas las piezas en lotes de 1000
    let reactivatedCount = 0;
    const batchSize = 1000;
    
    for (let i = 0; i < partsToReactivate.length; i += batchSize) {
      const batch = partsToReactivate.slice(i, i + batchSize);
      const batchIds = batch.map(part => part.id);
      
      console.log(`📦 Reactivando lote ${Math.floor(i/batchSize) + 1}: ${batch.length} piezas`);
      
      // Reactivar el lote usando consulta SQL directa
      await db.execute(sql`
        UPDATE parts 
        SET activo = true, fecha_actualizacion = NOW() 
        WHERE id = ANY(ARRAY[${sql.join(batchIds.map(id => sql`${id}`), sql`, `)}])
      `);
      
      reactivatedCount += batch.length;
      console.log(`  ✅ ${reactivatedCount}/${partsToReactivate.length} piezas reactivadas...`);
    }
    
    console.log(`📊 Proceso completado:`);
    console.log(`  • Piezas procesadas reactivadas: ${reactivatedCount}`);
    console.log(`  • Estado: TODAS las piezas con datos válidos están ahora activas`);
    
    return reactivatedCount;
    
  } catch (error) {
    console.error('❌ Error reactivando piezas procesadas:', error);
    throw error;
  }
}

// Ejecutar reactivación
reactivateProcessedPartsWithValidVehicleData()
  .then(result => {
    console.log(`✅ Reactivación completada: ${result} piezas procesadas reactivadas`);
    console.log('🎯 Objetivo alcanzado: TODAS las piezas procesadas con datos válidos están activas');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });