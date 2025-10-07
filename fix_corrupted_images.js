import { db } from './server/db.js';
import { vehicles, parts } from './shared/schema.js';
import { normalizeImagenesArray } from './server/utils/array-normalizer.js';
import { eq } from 'drizzle-orm';

async function fixCorruptedImages() {
  console.log('=== FIXING CORRUPTED IMAGES IN DATABASE ===');
  
  try {
    // 1. Arreglar vehículos con imágenes corruptas
    console.log('\n1. Fixing vehicles with corrupted images...');
    
    const vehiclesWithBadImages = await db.execute(`
      SELECT id, id_local, imagenes 
      FROM vehicles 
      WHERE NOT (imagenes::text ~ '^\\[.*\\]$')
    `);
    
    console.log(`Found ${vehiclesWithBadImages.rows.length} vehicles with corrupted images`);
    
    let vehiclesFixes = 0;
    for (const row of vehiclesWithBadImages.rows) {
      const normalized = normalizeImagenesArray(row.imagenes);
      
      await db.update(vehicles)
        .set({ imagenes: normalized })
        .where(eq(vehicles.id, row.id));
      
      vehiclesFixes++;
      
      if (vehiclesFixes % 100 === 0) {
        console.log(`Fixed ${vehiclesFixes} vehicles...`);
      }
    }
    
    console.log(`✅ Fixed ${vehiclesFixes} vehicles with corrupted images`);
    
    // 2. Arreglar piezas con imágenes corruptas
    console.log('\n2. Fixing parts with corrupted images...');
    
    const partsWithBadImages = await db.execute(`
      SELECT id, ref_local, imagenes 
      FROM parts 
      WHERE NOT (imagenes::text ~ '^\\[.*\\]$')
    `);
    
    console.log(`Found ${partsWithBadImages.rows.length} parts with corrupted images`);
    
    let partsFixes = 0;
    for (const row of partsWithBadImages.rows) {
      const normalized = normalizeImagenesArray(row.imagenes);
      
      await db.update(parts)
        .set({ imagenes: normalized })
        .where(eq(parts.id, row.id));
      
      partsFixes++;
      
      if (partsFixes % 100 === 0) {
        console.log(`Fixed ${partsFixes} parts...`);
      }
    }
    
    console.log(`✅ Fixed ${partsFixes} parts with corrupted images`);
    
    // 3. Verificar que todo esté arreglado
    console.log('\n3. Verifying fixes...');
    
    const remainingVehicles = await db.execute(`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE NOT (imagenes::text ~ '^\\[.*\\]$')
    `);
    
    const remainingParts = await db.execute(`
      SELECT COUNT(*) as count 
      FROM parts 
      WHERE NOT (imagenes::text ~ '^\\[.*\\]$')
    `);
    
    console.log(`Remaining vehicles with bad images: ${remainingVehicles.rows[0].count}`);
    console.log(`Remaining parts with bad images: ${remainingParts.rows[0].count}`);
    
    if (remainingVehicles.rows[0].count === 0 && remainingParts.rows[0].count === 0) {
      console.log('✅ All corrupted images have been fixed!');
    } else {
      console.log('⚠️ Some corrupted images remain - may need manual intervention');
    }
    
    console.log('\n=== CORRUPTED IMAGES FIX COMPLETED ===');
    
  } catch (error) {
    console.error('Error fixing corrupted images:', error);
    console.error('Error stack:', error.stack);
  }
}

fixCorruptedImages();