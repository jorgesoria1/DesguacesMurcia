import { db } from './server/db.js';
import { vehicles } from './shared/schema.js';
import { max, min } from 'drizzle-orm';

async function findMissingVehicles() {
  console.log('🔍 Buscando los 5 vehículos faltantes en la base de datos...');
  
  try {
    // Obtener el rango de IDs en nuestra base de datos
    const [range] = await db
      .select({
        minId: min(vehicles.idLocal),
        maxId: max(vehicles.idLocal)
      })
      .from(vehicles);
    
    console.log(`📊 Rango en BD local: ${range.minId} - ${range.maxId}`);
    
    // Verificar si hay gaps en la secuencia
    const gaps = await db.execute(`
      WITH RECURSIVE vehicle_sequence AS (
        SELECT ${range.minId} as expected_id
        UNION ALL
        SELECT expected_id + 1
        FROM vehicle_sequence
        WHERE expected_id < ${range.maxId}
      )
      SELECT vs.expected_id as missing_id
      FROM vehicle_sequence vs
      LEFT JOIN vehicles v ON v.id_local = vs.expected_id
      WHERE v.id_local IS NULL
      ORDER BY vs.expected_id
      LIMIT 10
    `);
    
    console.log(`🔍 IDs faltantes en el rango ${range.minId}-${range.maxId}:`);
    gaps.forEach(gap => {
      console.log(`   ID Local faltante: ${gap.missing_id}`);
    });
    
    // La API dice que hay 4,277 vehículos, pero nuestro máximo ID es 55788
    // Esto sugiere que hay 5 vehículos con IDs > 55788 o que hay gaps
    console.log(`\n💡 Análisis:`);
    console.log(`   API total: 4,277 vehículos`);
    console.log(`   BD local: 4,272 vehículos`);
    console.log(`   Diferencia: 5 vehículos`);
    console.log(`   Último ID en BD: ${range.maxId}`);
    
    if (gaps.length > 0) {
      console.log(`\n📝 Conclusión: Hay ${gaps.length} gaps en la secuencia de IDs locales`);
      console.log(`   Esto explica por qué tenemos menos registros que la API`);
    } else {
      console.log(`\n📝 Conclusión: No hay gaps, probablemente hay 5 vehículos nuevos con ID > ${range.maxId}`);
    }
    
  } catch (error) {
    console.error('❌ Error buscando vehículos faltantes:', error);
  }
}

findMissingVehicles();