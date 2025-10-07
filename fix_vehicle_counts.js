/**
 * Fix Vehicle Parts Count Script
 * Updates active_parts_count and total_parts_count fields for all vehicles
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

async function fixVehicleCounts() {
  try {
    console.log('🔧 Iniciando corrección de contadores de vehículos...');
    
    // Obtener el total de vehículos con contadores incorrectos
    const [countResult] = await db.execute(sql`
      SELECT COUNT(*) as total_vehicles
      FROM vehicles v
      WHERE v.active_parts_count != (
        SELECT COUNT(*)
        FROM parts p
        WHERE p.id_vehiculo = v.id_local AND p.activo = true
      )
      OR v.total_parts_count != (
        SELECT COUNT(*)
        FROM parts p
        WHERE p.id_vehiculo = v.id_local
      )
    `);
    
    const totalVehicles = Number(countResult.total_vehicles);
    console.log(`📊 Vehículos con contadores incorrectos: ${totalVehicles}`);
    
    if (totalVehicles === 0) {
      console.log('✅ Todos los contadores están correctos');
      return;
    }
    
    // Procesar en lotes de 100 vehículos
    const batchSize = 100;
    let processed = 0;
    
    console.log('🔄 Procesando en lotes...');
    
    while (processed < totalVehicles) {
      const updateResult = await db.execute(sql`
        UPDATE vehicles 
        SET 
          total_parts_count = (
            SELECT COUNT(*)
            FROM parts p
            WHERE p.id_vehiculo = vehicles.id_local
          ),
          active_parts_count = (
            SELECT COUNT(*)
            FROM parts p
            WHERE p.id_vehiculo = vehicles.id_local AND p.activo = true
          )
        WHERE vehicles.id IN (
          SELECT v.id
          FROM vehicles v
          WHERE v.active_parts_count != (
            SELECT COUNT(*)
            FROM parts p
            WHERE p.id_vehiculo = v.id_local AND p.activo = true
          )
          OR v.total_parts_count != (
            SELECT COUNT(*)
            FROM parts p
            WHERE p.id_vehiculo = v.id_local
          )
          LIMIT ${batchSize}
        )
      `);
      
      const batchUpdated = Number(updateResult.rowCount) || 0;
      processed += batchUpdated;
      
      console.log(`   Lote completado: ${batchUpdated} vehículos actualizados (${processed}/${totalVehicles})`);
      
      // Si no se actualizó nada en este lote, salir para evitar bucle infinito
      if (batchUpdated === 0) {
        break;
      }
      
      // Pausa breve entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verificar el resultado final
    const [finalCount] = await db.execute(sql`
      SELECT COUNT(*) as remaining_incorrect
      FROM vehicles v
      WHERE v.active_parts_count != (
        SELECT COUNT(*)
        FROM parts p
        WHERE p.id_vehiculo = v.id_local AND p.activo = true
      )
      OR v.total_parts_count != (
        SELECT COUNT(*)
        FROM parts p
        WHERE p.id_vehiculo = v.id_local
      )
    `);
    
    const remainingIncorrect = Number(finalCount.remaining_incorrect);
    
    console.log(`\n✅ Corrección completada:`);
    console.log(`   - Vehículos procesados: ${processed}`);
    console.log(`   - Vehículos con contadores incorrectos restantes: ${remainingIncorrect}`);
    
    if (remainingIncorrect === 0) {
      console.log('🎉 Todos los contadores están ahora correctos');
    } else {
      console.log(`⚠️  Quedan ${remainingIncorrect} vehículos con contadores incorrectos`);
    }
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixVehicleCounts()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { fixVehicleCounts };