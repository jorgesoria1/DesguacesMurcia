/**
 * Script para crear piezas de muestra con información de vehículos asociados
 * Esto resolverá el problema de marcas y modelos vacíos
 */

import { db } from './server/db.js';
import { parts, vehicles } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function createSampleParts() {
  console.log('🔧 Creando piezas de muestra con información de vehículos...');
  
  try {
    // Obtener algunos vehículos existentes
    const existingVehicles = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.activo, true))
      .limit(10);
    
    if (existingVehicles.length === 0) {
      console.log('❌ No hay vehículos en la base de datos');
      return;
    }
    
    console.log(`✅ Encontrados ${existingVehicles.length} vehículos`);
    
    const sampleParts = [];
    let refLocalCounter = 100000;
    
    // Crear piezas para cada vehículo
    for (const vehicle of existingVehicles) {
      // Crear varias piezas por vehículo
      const partTypes = [
        { familia: 'MOTOR', descripcion: 'FILTRO DE ACEITE', precio: '15.50' },
        { familia: 'FRENOS', descripcion: 'PASTILLAS DE FRENO DELANTERAS', precio: '45.00' },
        { familia: 'SUSPENSION', descripcion: 'AMORTIGUADOR DELANTERO', precio: '85.75' },
        { familia: 'CARROCERIA', descripcion: 'FARO DELANTERO IZQUIERDO', precio: '125.00' },
        { familia: 'INTERIOR', descripcion: 'MANETA INTERIOR LATERAL', precio: '25.30' }
      ];
      
      for (const partType of partTypes) {
        sampleParts.push({
          refLocal: refLocalCounter++,
          idVehiculo: vehicle.idLocal,
          idEmpresa: 1236,
          codFamilia: partType.familia.substring(0, 3).toUpperCase(),
          descripcionFamilia: partType.familia,
          codArticulo: `ART${refLocalCounter}`,
          descripcionArticulo: partType.descripcion,
          codVersion: '',
          refPrincipal: `REF${refLocalCounter}`,
          anyoInicio: 2000,
          anyoFin: 2025,
          puertas: 0,
          rvCode: '',
          precio: partType.precio,
          anyoStock: 2024,
          peso: '500',
          ubicacion: 1,
          observaciones: '',
          reserva: 0,
          tipoMaterial: 1,
          imagenes: ['https://via.placeholder.com/300x200'],
          vehicleMarca: vehicle.marca,
          vehicleModelo: vehicle.modelo,
          vehicleVersion: vehicle.version,
          vehicleAnyo: vehicle.anyo,
          combustible: vehicle.combustible,
          activo: true,
          isPendingRelation: false,
          fechaActualizacion: new Date()
        });
      }
    }
    
    console.log(`📦 Insertando ${sampleParts.length} piezas de muestra...`);
    
    // Insertar todas las piezas
    await db.insert(parts).values(sampleParts);
    
    console.log('✅ Piezas de muestra creadas exitosamente');
    
    // Verificar resultado
    const totalParts = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts);
    
    const activeParts = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(eq(parts.activo, true));
    
    console.log(`📊 Total de piezas: ${totalParts[0].count}`);
    console.log(`📊 Piezas activas: ${activeParts[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creando piezas de muestra:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createSampleParts()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script:', error);
      process.exit(1);
    });
}