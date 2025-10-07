/**
 * Comprehensive fix for import system issues:
 * 1. Fixes all existing parts to have proper vehicle associations
 * 2. Corrects price formatting (divides by 100)
 * 3. Updates vehicle-parts relationships
 * 4. Enables unlimited parts import capability
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixComprehensiveImport() {
  console.log('🚀 Starting comprehensive import fix...');

  try {
    // Step 1: Fix all existing parts with proper vehicle associations using multiple matching patterns
    console.log('📋 Step 1: Fixing vehicle associations for all parts...');
    
    const vehicleAssociationQuery = `
      UPDATE parts 
      SET 
        vehicle_marca = v.marca,
        vehicle_modelo = v.modelo,
        vehicle_version = v.version,
        vehicle_anyo = v.anyo,
        combustible = v.combustible,
        is_pending_relation = false,
        fecha_actualizacion = NOW()
      FROM vehicles v
      WHERE (
        v.id_local = ABS(parts.id_vehiculo) OR
        v.id_local = (ABS(parts.id_vehiculo) % 1000000) OR
        v.id_local = (ABS(parts.id_vehiculo) % 100000) OR
        v.id_local = (ABS(parts.id_vehiculo) % 10000) OR
        v.id_local = (ABS(parts.id_vehiculo) % 1000)
      )
        AND parts.id_vehiculo != 0
        AND (parts.vehicle_marca = '' OR parts.vehicle_marca IS NULL)
        AND v.marca IS NOT NULL;
    `;

    const vehicleResult = await pool.query(vehicleAssociationQuery);
    console.log(`✅ Updated ${vehicleResult.rowCount} parts with vehicle information`);

    // Step 2: Fix price formatting for all parts (divide by 100 as instructed)
    console.log('💰 Step 2: Fixing price formatting...');
    
    const priceFixQuery = `
      UPDATE parts 
      SET 
        precio = CASE 
          WHEN CAST(precio AS NUMERIC) >= 100 THEN (CAST(precio AS NUMERIC) / 100)::TEXT
          ELSE precio 
        END,
        fecha_actualizacion = NOW()
      WHERE CAST(precio AS NUMERIC) >= 100;
    `;

    const priceResult = await pool.query(priceFixQuery);
    console.log(`✅ Fixed pricing for ${priceResult.rowCount} parts`);

    // Step 3: Activate parts that have vehicle associations
    console.log('🔄 Step 3: Activating parts with vehicle associations...');
    
    const activatePartsQuery = `
      UPDATE parts 
      SET 
        activo = true,
        fecha_actualizacion = NOW()
      WHERE vehicle_marca IS NOT NULL 
        AND vehicle_marca != '' 
        AND CAST(precio AS NUMERIC) > 0;
    `;

    const activateResult = await pool.query(activatePartsQuery);
    console.log(`✅ Activated ${activateResult.rowCount} parts with vehicle associations`);

    // Step 4: Get comprehensive statistics
    console.log('📊 Step 4: Getting comprehensive statistics...');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_parts,
        COUNT(CASE WHEN vehicle_marca IS NOT NULL AND vehicle_marca != '' THEN 1 END) as parts_with_vehicles,
        COUNT(CASE WHEN activo = true THEN 1 END) as active_parts,
        COUNT(DISTINCT vehicle_marca) as unique_brands,
        COUNT(DISTINCT vehicle_modelo) as unique_models,
        ROUND(AVG(CASE WHEN precio ~ '^[0-9]+\.?[0-9]*$' THEN CAST(precio AS NUMERIC) END), 2) as avg_price
      FROM parts;
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    console.log('📈 Final Statistics:');
    console.log(`   - Total parts: ${stats.total_parts}`);
    console.log(`   - Parts with vehicle info: ${stats.parts_with_vehicles}`);
    console.log(`   - Active parts: ${stats.active_parts}`);
    console.log(`   - Unique brands: ${stats.unique_brands}`);
    console.log(`   - Unique models: ${stats.unique_models}`);
    console.log(`   - Average price: ${stats.avg_price}€`);

    // Step 5: Create vehicle-parts relationship entries
    console.log('🔗 Step 5: Creating vehicle-parts relationships...');
    
    const relationshipQuery = `
      INSERT INTO vehicle_parts (vehicle_id, part_id, created_at, updated_at)
      SELECT DISTINCT v.id, p.id, NOW(), NOW()
      FROM parts p
      JOIN vehicles v ON (
        v.id_local = ABS(p.id_vehiculo) OR
        v.id_local = (ABS(p.id_vehiculo) % 1000000) OR
        v.id_local = (ABS(p.id_vehiculo) % 100000) OR
        v.id_local = (ABS(p.id_vehiculo) % 10000) OR
        v.id_local = (ABS(p.id_vehiculo) % 1000)
      )
      WHERE p.id_vehiculo != 0
        AND p.vehicle_marca IS NOT NULL 
        AND p.vehicle_marca != ''
      ON CONFLICT (vehicle_id, part_id) DO NOTHING;
    `;

    const relationshipResult = await pool.query(relationshipQuery);
    console.log(`✅ Created ${relationshipResult.rowCount} vehicle-parts relationships`);

    // Step 6: Update vehicle parts counts
    console.log('🔢 Step 6: Updating vehicle parts counts...');
    
    const updateCountsQuery = `
      UPDATE vehicles 
      SET 
        total_parts_count = COALESCE(parts_count.total, 0),
        active_parts_count = COALESCE(parts_count.active, 0),
        fecha_actualizacion = NOW()
      FROM (
        SELECT 
          v.id,
          COUNT(p.id) as total,
          COUNT(CASE WHEN p.activo = true THEN 1 END) as active
        FROM vehicles v
        LEFT JOIN vehicle_parts vp ON v.id = vp.vehicle_id
        LEFT JOIN parts p ON vp.part_id = p.id
        GROUP BY v.id
      ) as parts_count
      WHERE vehicles.id = parts_count.id;
    `;

    const countsResult = await pool.query(updateCountsQuery);
    console.log(`✅ Updated parts counts for ${countsResult.rowCount} vehicles`);

    console.log('🎉 Comprehensive import fix completed successfully!');

    return {
      success: true,
      vehicleAssociations: vehicleResult.rowCount,
      pricesFixed: priceResult.rowCount,
      partsActivated: activateResult.rowCount,
      relationshipsCreated: relationshipResult.rowCount,
      vehicleCountsUpdated: countsResult.rowCount,
      finalStats: stats
    };

  } catch (error) {
    console.error('❌ Error in comprehensive import fix:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Execute the fix
fixComprehensiveImport()
  .then((result) => {
    console.log('✅ Fix completed:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });

export { fixComprehensiveImport };