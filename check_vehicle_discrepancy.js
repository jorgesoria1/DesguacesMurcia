import { db } from './server/db.js';
import { vehicles } from './shared/schema.js';
import { count as dbCount, max, min } from 'drizzle-orm';

async function checkVehicleDiscrepancy() {
  console.log('🔍 Verificando discrepancia entre API y base de datos local...');
  
  try {
    // Estadísticas de la base de datos local
    const [localStats] = await db
      .select({
        total: dbCount(),
        lastUpdate: max(vehicles.fechaActualizacion),
        firstCreated: min(vehicles.fechaCreacion)
      })
      .from(vehicles);
    
    console.log('📊 Estadísticas de base de datos local:');
    console.log(`   Total vehículos: ${localStats.total}`);
    console.log(`   Última actualización: ${localStats.lastUpdate}`);
    console.log(`   Primera creación: ${localStats.firstCreated}`);
    
    // Verificar conteo por estado activo
    const activeStats = await db
      .select({
        activos: dbCount()
      })
      .from(vehicles)
      .where(vehicles.activo);
    
    console.log(`   Vehículos activos: ${activeStats[0].activos}`);
    
    // Verificar último ID importado
    const [lastVehicle] = await db
      .select({
        idLocal: vehicles.idLocal,
        marca: vehicles.marca,
        modelo: vehicles.modelo,
        fechaActualizacion: vehicles.fechaActualizacion
      })
      .from(vehicles)
      .orderBy(vehicles.idLocal)
      .limit(1)
      .offset(localStats.total - 1);
    
    console.log('🚗 Último vehículo en base de datos:');
    console.log(`   ID Local: ${lastVehicle.idLocal}`);
    console.log(`   Marca: ${lastVehicle.marca}`);
    console.log(`   Modelo: ${lastVehicle.modelo}`);
    console.log(`   Actualizado: ${lastVehicle.fechaActualizacion}`);
    
    // Verificar si hay duplicados por idLocal
    const duplicates = await db
      .select({
        idLocal: vehicles.idLocal,
        count: dbCount()
      })
      .from(vehicles)
      .groupBy(vehicles.idLocal)
      .having(({ count }) => count > 1);
    
    console.log(`🔍 Duplicados encontrados: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log('   Primeros 5 duplicados:', duplicates.slice(0, 5));
    }
    
    // Verificar último import y su estado
    console.log('\n📋 Información del último import...');
    // Hacer llamada a la API para comparar
    console.log('📞 Consultando API para verificar total actual...');
    
  } catch (error) {
    console.error('❌ Error verificando discrepancia:', error);
  }
}

checkVehicleDiscrepancy();