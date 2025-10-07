import { db } from './server/db';
import { parts, vehicles } from './shared/schema';
import { eq, and, isNull, or, ne, sql } from 'drizzle-orm';

console.log('🔧 Iniciando corrección automática de datos de vehículo...');

async function correctProcessedPartsVehicleData() {
  try {
    console.log('🔍 Analizando piezas procesadas sin datos de vehículo...');
    
    // Encontrar piezas procesadas sin datos válidos
    const processedPartsQuery = await db
      .select({
        id: parts.id,
        idVehiculo: parts.idVehiculo,
        refLocal: parts.refLocal,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        descripcionFamilia: parts.descripcionFamilia,
        descripcionArticulo: parts.descripcionArticulo
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`, // Solo piezas procesadas
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
      .limit(5000); // Procesar en lotes
    
    console.log(`📊 Encontradas ${processedPartsQuery.length} piezas procesadas sin datos válidos de vehículo`);
    
    if (processedPartsQuery.length === 0) {
      console.log('✅ No hay piezas procesadas que requieran corrección');
      return 0;
    }
    
    // Cargar vehículos físicos para correlación
    console.log('📋 Cargando vehículos físicos...');
    const physicalVehicles = await db
      .select({
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
          sql`${vehicles.idLocal} > 0`
        )
      );
    
    console.log(`📋 Cargados ${physicalVehicles.length} vehículos físicos`);
    
    // Crear mapa de marcas comunes para búsqueda rápida
    const marcasComunes = ['FORD', 'PEUGEOT', 'RENAULT', 'CHEVROLET', 'SEAT', 'AUDI', 'BMW', 'MERCEDES', 'VOLKSWAGEN', 'OPEL', 'TOYOTA', 'NISSAN', 'HONDA', 'HYUNDAI', 'KIA', 'SKODA', 'FIAT', 'CITROEN'];
    
    let updatedCount = 0;
    
    // Procesar cada pieza
    for (const part of processedPartsQuery) {
      let vehicleDataFound = null;
      
      // Estrategia: Buscar marcas conocidas en descripción de familia o artículo
      const textoCompleto = `${part.descripcionFamilia || ''} ${part.descripcionArticulo || ''}`.toUpperCase();
      
      // Buscar marca conocida en descripción
      for (const marca of marcasComunes) {
        if (textoCompleto.includes(marca)) {
          // Buscar vehículo de esta marca en nuestra base
          const vehiculoEncontrado = physicalVehicles.find(v => 
            v.marca && v.marca.toUpperCase().includes(marca)
          );
          
          if (vehiculoEncontrado) {
            vehicleDataFound = {
              marca: vehiculoEncontrado.marca,
              modelo: vehiculoEncontrado.modelo || '',
              version: vehiculoEncontrado.version || '',
              anyo: vehiculoEncontrado.anyo || 0,
              combustible: vehiculoEncontrado.combustible || ''
            };
            break;
          }
        }
      }
      
      // Si encontramos datos de vehículo, actualizar
      if (vehicleDataFound) {
        try {
          await db
            .update(parts)
            .set({
              vehicleMarca: vehicleDataFound.marca,
              vehicleModelo: vehicleDataFound.modelo,
              vehicleVersion: vehicleDataFound.version,
              vehicleAnyo: vehicleDataFound.anyo,
              fechaActualizacion: sql`NOW()`
            })
            .where(eq(parts.id, part.id));
          
          updatedCount++;
          
          if (updatedCount % 100 === 0) {
            console.log(`  ✅ ${updatedCount} piezas actualizadas...`);
          }
          
        } catch (error) {
          console.error(`⚠️ Error actualizando pieza ${part.refLocal}:`, error);
        }
      }
    }
    
    console.log(`📊 Proceso completado:`);
    console.log(`  • Piezas analizadas: ${processedPartsQuery.length}`);
    console.log(`  • Piezas actualizadas: ${updatedCount}`);
    console.log(`  • Tasa de éxito: ${((updatedCount / processedPartsQuery.length) * 100).toFixed(2)}%`);
    
    return updatedCount;
    
  } catch (error) {
    console.error('❌ Error en corrección automática:', error);
    throw error;
  }
}

// Ejecutar
correctProcessedPartsVehicleData()
  .then(result => {
    console.log(`✅ Corrección completada: ${result} piezas actualizadas`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });