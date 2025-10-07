/**
 * Fix Vehicle-Parts Association System
 * Maps parts to vehicles using multiple matching strategies
 */

import { db } from './server/db/index.js';
import { parts, vehicles } from './shared/schema.js';
import { eq, sql, and, isNotNull } from 'drizzle-orm';

class VehiclePartsAssociationFixer {
  constructor() {
    this.processedCount = 0;
    this.associatedCount = 0;
    this.missingCount = 0;
  }

  async getVehicleMapping() {
    console.log('📋 Building vehicle mapping index...');
    
    const vehicleList = await db.select({
      id: vehicles.id,
      idLocal: vehicles.idLocal,
      marca: vehicles.marca,
      modelo: vehicles.modelo,
      version: vehicles.version,
      anyo: vehicles.anyo
    }).from(vehicles).where(eq(vehicles.activo, true));

    const mapping = new Map();
    
    // Map by id_local (direct match)
    vehicleList.forEach(vehicle => {
      mapping.set(vehicle.idLocal.toString(), vehicle);
    });

    console.log(`📊 Vehicle mapping created: ${mapping.size} vehicles indexed`);
    return { mapping, vehicleList };
  }

  async fixPartsWithPositiveVehicleIds() {
    console.log('🔧 Fixing parts with positive vehicle IDs...');
    
    // Update parts that have positive vehicle IDs matching vehicle id_local
    const result = await db.execute(sql`
      UPDATE parts 
      SET vehicle_marca = v.marca,
          vehicle_modelo = v.modelo,
          vehicle_version = v.version,
          vehicle_anyo = v.anyo
      FROM vehicles v
      WHERE parts.id_vehiculo = v.id_local 
        AND parts.id_vehiculo > 0
        AND v.activo = true
        AND (parts.vehicle_marca IS NULL OR parts.vehicle_marca = '')
    `);

    console.log(`✅ Updated ${result.rowCount} parts with positive vehicle ID matches`);
    return result.rowCount;
  }

  async fixPartsWithNegativeVehicleIds() {
    console.log('🔧 Fixing parts with negative vehicle IDs using brand/model matching...');
    
    // Get parts with negative vehicle IDs that need vehicle info
    const partsNeedingVehicles = await db.select({
      id: parts.id,
      idVehiculo: parts.idVehiculo,
      descripcionArticulo: parts.descripcionArticulo,
      vehicleMarca: parts.vehicleMarca,
      vehicleModelo: parts.vehicleModelo
    }).from(parts)
    .where(
      and(
        sql`${parts.idVehiculo} < 0`,
        sql`(${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '')`
      )
    )
    .limit(10000);

    console.log(`📊 Found ${partsNeedingVehicles.length} parts with negative vehicle IDs`);

    let updated = 0;
    const batchSize = 1000;

    for (let i = 0; i < partsNeedingVehicles.length; i += batchSize) {
      const batch = partsNeedingVehicles.slice(i, i + batchSize);
      
      for (const part of batch) {
        try {
          // Extract brand/model info from part description or other fields
          const brandModelInfo = this.extractVehicleInfoFromDescription(part.descripcionArticulo);
          
          if (brandModelInfo.brand) {
            // Find matching vehicle by brand and model
            const matchingVehicle = await db.select({
              id: vehicles.id,
              idLocal: vehicles.idLocal,
              marca: vehicles.marca,
              modelo: vehicles.modelo,
              version: vehicles.version,
              anyo: vehicles.anyo
            }).from(vehicles)
            .where(
              and(
                eq(vehicles.activo, true),
                sql`UPPER(${vehicles.marca}) LIKE UPPER(${'%' + brandModelInfo.brand + '%'})`
              )
            )
            .limit(1);

            if (matchingVehicle.length > 0) {
              const vehicle = matchingVehicle[0];
              
              await db.update(parts)
                .set({
                  vehicleMarca: vehicle.marca,
                  vehicleModelo: vehicle.modelo,
                  vehicleVersion: vehicle.version,
                  vehicleAnyo: vehicle.anyo
                })
                .where(eq(parts.id, part.id));
              
              updated++;
            }
          }
        } catch (error) {
          console.error(`Error processing part ${part.id}:`, error.message);
        }
      }
      
      console.log(`📦 Processed batch ${Math.ceil((i + batchSize) / batchSize)}: ${updated} parts updated`);
    }

    return updated;
  }

  extractVehicleInfoFromDescription(description) {
    if (!description) return { brand: null, model: null };

    const upperDesc = description.toUpperCase();
    
    // Common brand patterns
    const brandPatterns = {
      'VOLKSWAGEN': /VOLKSWAGEN|VW\s/,
      'AUDI': /AUDI/,
      'BMW': /BMW/,
      'MERCEDES': /MERCEDES|BENZ/,
      'FORD': /FORD/,
      'RENAULT': /RENAULT/,
      'PEUGEOT': /PEUGEOT/,
      'CITROEN': /CITROEN|CITROËN/,
      'OPEL': /OPEL/,
      'SEAT': /SEAT/,
      'SKODA': /SKODA|ŠKODA/,
      'FIAT': /FIAT/,
      'ALFA ROMEO': /ALFA\s*ROMEO/,
      'TOYOTA': /TOYOTA/,
      'NISSAN': /NISSAN/,
      'HONDA': /HONDA/,
      'MAZDA': /MAZDA/,
      'HYUNDAI': /HYUNDAI/,
      'KIA': /KIA/,
      'CHEVROLET': /CHEVROLET/,
      'DODGE': /DODGE/
    };

    for (const [brand, pattern] of Object.entries(brandPatterns)) {
      if (pattern.test(upperDesc)) {
        return { brand, model: null };
      }
    }

    return { brand: null, model: null };
  }

  async updatePartsVehicleStats() {
    console.log('📊 Updating parts vehicle statistics...');
    
    const stats = await db.select({
      totalParts: sql`COUNT(*)`,
      partsWithVehicles: sql`COUNT(CASE WHEN vehicle_marca IS NOT NULL AND vehicle_marca != '' THEN 1 END)`,
      partsWithPositiveIds: sql`COUNT(CASE WHEN id_vehiculo > 0 THEN 1 END)`,
      partsWithNegativeIds: sql`COUNT(CASE WHEN id_vehiculo < 0 THEN 1 END)`
    }).from(parts);

    console.log('📈 Current statistics:', stats[0]);
    return stats[0];
  }

  async execute() {
    try {
      console.log('🚀 Starting vehicle-parts association fix...');
      
      // Get initial statistics
      const initialStats = await this.updatePartsVehicleStats();
      
      // Build vehicle mapping
      await this.getVehicleMapping();
      
      // Fix parts with positive vehicle IDs first
      const positiveUpdates = await this.fixPartsWithPositiveVehicleIds();
      
      // Fix parts with negative vehicle IDs using pattern matching
      const negativeUpdates = await this.fixPartsWithNegativeVehicleIds();
      
      // Get final statistics
      const finalStats = await this.updatePartsVehicleStats();
      
      console.log('✅ Vehicle-parts association fix completed!');
      console.log(`📊 Results:`);
      console.log(`  - Parts with positive vehicle IDs fixed: ${positiveUpdates}`);
      console.log(`  - Parts with negative vehicle IDs fixed: ${negativeUpdates}`);
      console.log(`  - Total parts with vehicle info: ${finalStats.partsWithVehicles}/${finalStats.totalParts}`);
      
    } catch (error) {
      console.error('❌ Error fixing vehicle-parts associations:', error);
      throw error;
    }
  }
}

async function main() {
  const fixer = new VehiclePartsAssociationFixer();
  await fixer.execute();
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default VehiclePartsAssociationFixer;