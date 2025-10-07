
import { db } from './server/db.js';
import { vehicles } from './shared/schema.js';
import { sql } from 'drizzle-orm';

async function checkVehiclesCount() {
  try {
    console.log('🔍 Verificando conteo real de vehículos en la base de datos...');
    
    // Conteo total
    const [totalCount] = await db.select({ count: sql`count(*)` }).from(vehicles);
    console.log(`📊 Total de vehículos: ${totalCount.count}`);
    
    // Conteo activos/inactivos
    const [activeCount] = await db.select({ count: sql`count(*)` }).from(vehicles).where(sql`activo = true`);
    const [inactiveCount] = await db.select({ count: sql`count(*)` }).from(vehicles).where(sql`activo = false`);
    
    console.log(`✅ Vehículos activos: ${activeCount.count}`);
    console.log(`❌ Vehículos inactivos: ${inactiveCount.count}`);
    
    // Primeros 5 vehículos
    const sampleVehicles = await db.select().from(vehicles).limit(5);
    console.log('🚗 Muestra de vehículos:');
    sampleVehicles.forEach(v => {
      console.log(`  - ID: ${v.id}, idLocal: ${v.idLocal}, ${v.marca} ${v.modelo}, activo: ${v.activo}`);
    });
    
    // Últimos 5 vehículos creados
    const recentVehicles = await db.select().from(vehicles).orderBy(sql`fecha_creacion DESC`).limit(5);
    console.log('🕒 Últimos vehículos creados:');
    recentVehicles.forEach(v => {
      console.log(`  - ID: ${v.id}, idLocal: ${v.idLocal}, ${v.marca} ${v.modelo}, creado: ${v.fechaCreacion}`);
    });
    
  } catch (error) {
    console.error('❌ Error verificando vehículos:', error);
  }
}

checkVehiclesCount();
