import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import postgres from 'postgres';

// Importar esquemas
import { parts, vehicles } from './shared/schema.js';

async function fixPartsVehicleInfo() {
  console.log('🔧 Iniciando corrección de información de vehículos en piezas...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL no encontrada');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Obtener piezas que necesitan actualización (sin marca o modelo de vehículo)
    const partsToUpdate = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`(${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '' OR ${parts.vehicleModelo} IS NULL OR ${parts.vehicleModelo} = '')`
        )
      );

    console.log(`📊 Encontradas ${partsToUpdate.length} piezas que necesitan actualización`);

    let updated = 0;
    let notFound = 0;

    // Procesar en lotes de 100
    const batchSize = 100;
    for (let i = 0; i < partsToUpdate.length; i += batchSize) {
      const batch = partsToUpdate.slice(i, i + batchSize);
      
      for (const part of batch) {
        if (part.idVehiculo && part.idVehiculo !== -1) {
          try {
            // Buscar información del vehículo
            const [vehicleInfo] = await db
              .select({
                marca: vehicles.marca,
                modelo: vehicles.modelo,
                anyo: vehicles.anyo,
                anyoInicio: vehicles.anyoInicio,
                anyoFin: vehicles.anyoFin,
                combustible: vehicles.combustible
              })
              .from(vehicles)
              .where(eq(vehicles.idLocal, Math.abs(part.idVehiculo)))
              .limit(1);

            if (vehicleInfo && vehicleInfo.marca && vehicleInfo.modelo) {
              // Actualizar la pieza con información del vehículo
              await db.update(parts)
                .set({
                  vehicleMarca: vehicleInfo.marca,
                  vehicleModelo: vehicleInfo.modelo,
                  vehicleAnyo: vehicleInfo.anyo || 0,
                  anyoInicio: vehicleInfo.anyoInicio || vehicleInfo.anyo || 2000,
                  anyoFin: vehicleInfo.anyoFin || vehicleInfo.anyo || 2050,
                  combustible: vehicleInfo.combustible || '',
                  relatedVehiclesCount: 1,
                  isPendingRelation: false,
                  fechaActualizacion: new Date()
                })
                .where(eq(parts.id, part.id));
              
              updated++;
              
              if (updated % 50 === 0) {
                console.log(`✅ Actualizadas ${updated} piezas...`);
              }
            } else {
              notFound++;
            }
          } catch (error) {
            console.error(`❌ Error actualizando pieza ${part.refLocal}:`, error.message);
          }
        }
      }

      // Pausa breve entre lotes
      if (i + batchSize < partsToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Corrección completada:`);
    console.log(`   - Piezas actualizadas: ${updated}`);
    console.log(`   - Vehículos no encontrados: ${notFound}`);
    console.log(`   - Total procesadas: ${partsToUpdate.length}`);

    // Verificar resultado
    const [stats] = await db
      .select({
        total: sql`COUNT(*)`,
        withBrand: sql`COUNT(CASE WHEN ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        withModel: sql`COUNT(CASE WHEN ${parts.vehicleModelo} IS NOT NULL AND ${parts.vehicleModelo} != '' THEN 1 END)`
      })
      .from(parts)
      .where(eq(parts.activo, true));

    console.log(`\n📈 Estadísticas finales:`);
    console.log(`   - Total piezas activas: ${stats.total}`);
    console.log(`   - Con marca de vehículo: ${stats.withBrand}`);
    console.log(`   - Con modelo de vehículo: ${stats.withModel}`);

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    await client.end();
  }
}

// Ejecutar función
fixPartsVehicleInfo();