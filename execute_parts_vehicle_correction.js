import { db } from './server/db.js';
import { parts, vehicles } from './shared/schema.js';
import { eq, and, isNull, or, ne, sql } from 'drizzle-orm';

console.log('🔧 Iniciando corrección automática de datos de vehículo...');

async function correctProcessedPartsVehicleData() {
  try {
    console.log('🔍 Analizando piezas procesadas sin datos de vehículo...');
    
    // Encontrar piezas procesadas sin datos válidos de vehículo
    const processedPartsWithoutVehicleData = await db
      .select({
        id: parts.id,
        idVehiculo: parts.idVehiculo,
        refLocal: parts.refLocal,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        descripcionFamilia: parts.descripcionFamilia
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`, // Piezas procesadas
          or(
            isNull(parts.vehicleMarca),
            eq(parts.vehicleMarca, ''),
            sql`${parts.vehicleMarca} LIKE '%ELECTRICIDAD%'`,
            sql`${parts.vehicleMarca} LIKE '%CARROCER%'`,
            sql`${parts.vehicleMarca} LIKE '%SUSPENSIÓN%'`,
            sql`${parts.vehicleMarca} LIKE '%FRENOS%'`,
            sql`${parts.vehicleMarca} LIKE '%DIRECCIÓN%'`,
            sql`${parts.vehicleMarca} LIKE '%TRANSMISIÓN%'`,
            sql`${parts.vehicleMarca} LIKE '%MOTOR%'`,
            sql`${parts.vehicleMarca} LIKE '%INTERIOR%'`
          )
        )
      )
      .limit(10000); // Procesar en lotes
    
    console.log(`📊 Encontradas ${processedPartsWithoutVehicleData.length} piezas procesadas sin datos válidos de vehículo`);
    
    if (processedPartsWithoutVehicleData.length === 0) {
      console.log('✅ No hay piezas procesadas que requieran corrección');
      return;
    }
    
    // Cargar todos los vehículos físicos para buscar coincidencias
    console.log('📋 Cargando vehículos físicos para correlación...');
    const physicalVehicles = await db
      .select({
        id: vehicles.id,
        idLocal: vehicles.idLocal,
        marca: vehicles.marca,
        modelo: vehicles.modelo,
        version: vehicles.version,
        anyo: vehicles.anyo,
        combustible: vehicles.combustible
      })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.activo, true),
          sql`${vehicles.idLocal} > 0` // Solo vehículos físicos
        )
      );
    
    console.log(`📋 Cargados ${physicalVehicles.length} vehículos físicos para correlación`);
    
    let updatedCount = 0;
    let batchCount = 0;
    
    // Procesar piezas en lotes de 100
    for (let i = 0; i < processedPartsWithoutVehicleData.length; i += 100) {
      const batch = processedPartsWithoutVehicleData.slice(i, i + 100);
      batchCount++;
      
      console.log(`📦 Procesando lote ${batchCount}: ${batch.length} piezas`);
      
      for (const part of batch) {
        // Intentar encontrar vehículo correlacionado basado en similitud semántica
        // Esta es una implementación simplificada - en producción usaríamos ML/NLP
        let foundVehicle = null;
        
        // Estrategia 1: Buscar por descripción de familia que contenga marca/modelo
        if (part.descripcionFamilia) {
          const familiaUpper = part.descripcionFamilia.toUpperCase();
          
          // Buscar marcas conocidas en la descripción
          for (const vehicle of physicalVehicles) {
            if (vehicle.marca && vehicle.modelo) {
              const marcaUpper = vehicle.marca.toUpperCase();
              const modeloUpper = vehicle.modelo.toUpperCase();
              
              if (familiaUpper.includes(marcaUpper) || familiaUpper.includes(modeloUpper)) {
                foundVehicle = vehicle;
                break;
              }
            }
          }
        }
        
        // Si encontramos correlación, actualizar la pieza
        if (foundVehicle) {
          try {
            await db
              .update(parts)
              .set({
                vehicleMarca: foundVehicle.marca,
                vehicleModelo: foundVehicle.modelo,
                vehicleVersion: foundVehicle.version || '',
                vehicleAnyo: foundVehicle.anyo || 0,
                fechaActualizacion: sql`NOW()`
              })
              .where(eq(parts.id, part.id));
            
            updatedCount++;
            
            if (updatedCount % 50 === 0) {
              console.log(`  ✅ ${updatedCount} piezas actualizadas hasta ahora...`);
            }
          } catch (error) {
            console.error(`⚠️ Error actualizando pieza ${part.refLocal}:`, error.message);
          }
        }
      }
    }
    
    console.log(`📊 Proceso completado:`);
    console.log(`  • Piezas analizadas: ${processedPartsWithoutVehicleData.length}`);
    console.log(`  • Piezas actualizadas: ${updatedCount}`);
    console.log(`  • Tasa de éxito: ${((updatedCount / processedPartsWithoutVehicleData.length) * 100).toFixed(2)}%`);
    
    return updatedCount;
    
  } catch (error) {
    console.error('❌ Error en corrección automática:', error);
    throw error;
  }
}

// Ejecutar corrección
correctProcessedPartsVehicleData()
  .then(result => {
    console.log('✅ Corrección automática completada exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });