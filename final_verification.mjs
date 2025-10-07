import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { sql, and, lt, eq } from 'drizzle-orm';

async function finalVerification() {
  try {
    const activeWithoutVehicles = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(and(lt(parts.idVehiculo, 0), eq(parts.activo, true)));
      
    const totalWithoutVehicles = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(lt(parts.idVehiculo, 0));
      
    console.log(`✅ Active parts without vehicles: ${activeWithoutVehicles[0].count}`);
    console.log(`📊 Total parts without vehicles: ${totalWithoutVehicles[0].count}`);
    console.log(`📈 Activation rate: ${((activeWithoutVehicles[0].count / totalWithoutVehicles[0].count) * 100).toFixed(1)}%`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

finalVerification();
