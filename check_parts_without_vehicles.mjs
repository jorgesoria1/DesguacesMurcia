import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { sql, and, lt, eq } from 'drizzle-orm';

async function checkPartsWithoutVehicles() {
  try {
    console.log('🔍 Analizando piezas sin vehículo asociado...\n');
    
    // Piezas con idVehiculo < 0 (sin vehículo asociado)
    const partsWithoutVehicles = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        descripcionArticulo: parts.descripcionArticulo,
        activo: parts.activo,
        idVehiculo: parts.idVehiculo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo,
        precio: parts.precio
      })
      .from(parts)
      .where(lt(parts.idVehiculo, 0))
      .limit(20);
    
    console.log(`📊 Total muestra de piezas con idVehiculo < 0: ${partsWithoutVehicles.length}`);
    
    const activeParts = partsWithoutVehicles.filter(p => p.activo);
    const inactiveParts = partsWithoutVehicles.filter(p => !p.activo);
    
    console.log(`✅ Activas: ${activeParts.length}`);
    console.log(`❌ Inactivas: ${inactiveParts.length}\n`);
    
    if (inactiveParts.length > 0) {
      console.log('🔍 Ejemplos de piezas sin vehículo marcadas como INACTIVAS:');
      inactiveParts.slice(0, 3).forEach(part => {
        console.log(`- ID: ${part.id}, Ref: ${part.refLocal}, Activo: ${part.activo}`);
        console.log(`  Desc: ${part.descripcionArticulo?.substring(0, 40)}...`);
        console.log(`  Vehículo: ${part.vehicleMarca || 'N/A'} ${part.vehicleModelo || 'N/A'}`);
        console.log(`  Precio: ${part.precio}\n`);
      });
    }
    
    if (activeParts.length > 0) {
      console.log('✅ Ejemplos de piezas sin vehículo marcadas como ACTIVAS:');
      activeParts.slice(0, 3).forEach(part => {
        console.log(`- ID: ${part.id}, Ref: ${part.refLocal}, Activo: ${part.activo}`);
        console.log(`  Desc: ${part.descripcionArticulo?.substring(0, 40)}...`);
        console.log(`  Vehículo: ${part.vehicleMarca || 'N/A'} ${part.vehicleModelo || 'N/A'}`);
        console.log(`  Precio: ${part.precio}\n`);
      });
    }
    
    // Obtener totales
    const totalNegativeId = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(lt(parts.idVehiculo, 0));
      
    const activeNegativeId = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(and(lt(parts.idVehiculo, 0), eq(parts.activo, true)));
      
    console.log(`📊 Estadísticas totales:`);
    console.log(`- Total piezas con idVehiculo < 0: ${totalNegativeId[0].count}`);
    console.log(`- Piezas activas con idVehiculo < 0: ${activeNegativeId[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPartsWithoutVehicles();
