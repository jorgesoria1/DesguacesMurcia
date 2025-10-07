import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { normalizeImagenesArray } from './server/utils/array-normalizer.js';
import { eq } from 'drizzle-orm';

async function fixCorruptedImagesBatch() {
  console.log('=== FIXING CORRUPTED IMAGES IN BATCHES ===');
  
  try {
    // Solo arreglar las piezas ya que los vehículos están bien
    console.log('\n1. Fixing parts with corrupted images in batches...');
    
    const BATCH_SIZE = 500;
    let offset = 0;
    let totalFixed = 0;
    
    while (true) {
      console.log(`\nProcessing batch starting at offset ${offset}...`);
      
      const partsWithBadImages = await db.execute(`
        SELECT id, ref_local, imagenes 
        FROM parts 
        WHERE NOT (imagenes::text ~ '^\\[.*\\]$')
        LIMIT ${BATCH_SIZE}
        OFFSET ${offset}
      `);
      
      if (partsWithBadImages.rows.length === 0) {
        console.log('No more parts to process');
        break;
      }
      
      console.log(`Found ${partsWithBadImages.rows.length} parts in this batch`);
      
      // Procesar lote por lote
      for (const row of partsWithBadImages.rows) {
        try {
          const normalized = normalizeImagenesArray(row.imagenes);
          
          await db.update(parts)
            .set({ imagenes: normalized })
            .where(eq(parts.id, row.id));
          
          totalFixed++;
          
          if (totalFixed % 100 === 0) {
            console.log(`Fixed ${totalFixed} parts...`);
          }
        } catch (error) {
          console.error(`Error fixing part ${row.id}:`, error.message);
        }
      }
      
      offset += BATCH_SIZE;
      
      // Pausa pequeña para no sobrecargar la base de datos
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Fixed ${totalFixed} parts with corrupted images`);
    
    // Verificar resultado final
    const remainingParts = await db.execute(`
      SELECT COUNT(*) as count 
      FROM parts 
      WHERE NOT (imagenes::text ~ '^\\[.*\\]$')
    `);
    
    console.log(`Remaining parts with bad images: ${remainingParts.rows[0].count}`);
    
    if (remainingParts.rows[0].count === 0) {
      console.log('✅ All corrupted images have been fixed!');
    } else {
      console.log(`⚠️ ${remainingParts.rows[0].count} parts still have corrupted images`);
    }
    
    console.log('\n=== CORRUPTED IMAGES FIX COMPLETED ===');
    
  } catch (error) {
    console.error('Error fixing corrupted images:', error);
    console.error('Error stack:', error.stack);
  }
}

fixCorruptedImagesBatch();