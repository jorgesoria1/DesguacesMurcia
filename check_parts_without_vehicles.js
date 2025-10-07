const { db } = require('./server/db.js');
const { parts } = require('./shared/schema.js');
const { sql, and, lt, isNotNull, ne } = require('drizzle-orm');

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
    
    console.log(`📊 Total de piezas con idVehiculo < 0: ${partsWithoutVehicles.length}`);
    
    const activeParts = partsWithoutVehicles.filter(p => p.activo);
    const inactiveParts = partsWithoutVehicles.filter(p => !p.activo);
    
    console.log(`✅ Activas: ${activeParts.length}`);
    console.log(`❌ Inactivas: ${inactiveParts.length}\n`);
    
    if (inactiveParts.length > 0) {
      console.log('🔍 Ejemplos de piezas sin vehículo marcadas como INACTIVAS:');
      inactiveParts.slice(0, 5).forEach(part => {
        console.log(`- ID: ${part.id}, Ref: ${part.refLocal}, Desc: ${part.descripcionArticulo?.substring(0, 50)}`);
        console.log(`  Vehículo: ${part.vehicleMarca} ${part.vehicleModelo}, Precio: ${part.precio}`);
      });
    }
    
    if (activeParts.length > 0) {
      console.log('\n✅ Ejemplos de piezas sin vehículo marcadas como ACTIVAS:');
      activeParts.slice(0, 5).forEach(part => {
        console.log(`- ID: ${part.id}, Ref: ${part.refLocal}, Desc: ${part.descripcionArticulo?.substring(0, 50)}`);
        console.log(`  Vehículo: ${part.vehicleMarca} ${part.vehicleModelo}, Precio: ${part.precio}`);
      });
    }
    
    // Verificar si estas piezas aparecen en el frontend
    console.log('\n🌐 Verificando endpoint público /api/search-parts...');
    const frontendParts = await db.execute(sql`
      SELECT p.id, p.ref_local, p.descripcion_articulo, p.activo, p.id_vehiculo, p.vehicle_marca, p.vehicle_modelo
      FROM ${parts} p
      WHERE (
        CAST(p.precio AS DECIMAL) > 0 AND
        (p.activo = true OR 
         (p.id_vehiculo < 0 AND p.vehicle_marca IS NOT NULL AND p.vehicle_marca != '' 
          AND p.vehicle_marca != '» OTROS...' AND p.vehicle_modelo != 'MODELOS'))
      ) AND p.id_vehiculo < 0
      LIMIT 10
    `);
    
    console.log(`📱 Piezas sin vehículo que aparecen en frontend: ${frontendParts.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPartsWithoutVehicles();
