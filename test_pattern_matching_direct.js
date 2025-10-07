// Script para probar directamente el pattern matching en piezas procesadas
import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { sql, eq, and } from 'drizzle-orm';

async function testPatternMatchingDirect() {
  console.log('🧪 Probando extracción directa de marcas/modelos...\n');

  try {
    // Obtener algunas piezas procesadas para probar pattern matching
    const processedParts = await db
      .select({
        id: parts.id,
        refLocal: parts.refLocal,
        idVehiculo: parts.idVehiculo,
        descripcionArticulo: parts.descripcionArticulo,
        vehicleMarca: parts.vehicleMarca,
        vehicleModelo: parts.vehicleModelo
      })
      .from(parts)
      .where(
        and(
          eq(parts.activo, true),
          sql`${parts.idVehiculo} < 0`,
          sql`(${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '')`
        )
      )
      .limit(20);

    console.log(`📋 Encontradas ${processedParts.length} piezas procesadas sin marca`);

    // Función de pattern matching
    function extractVehicleInfoFromDescription(description) {
      if (!description) return { brand: null, model: null };

      const upperDesc = description.toUpperCase();
      
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
          // Intentar extraer modelo
          let model = null;
          const brandRemovedDesc = description.replace(new RegExp(brand, 'gi'), '').trim();
          const words = brandRemovedDesc.split(/\s+/).filter(word => word.length > 2);
          if (words.length > 0) {
            model = words.slice(0, 2).join(' ');
          }
          
          return { brand, model };
        }
      }

      return { brand: null, model: null };
    }

    // Probar pattern matching en ejemplos
    let successCount = 0;
    for (const part of processedParts) {
      const extracted = extractVehicleInfoFromDescription(part.descripcionArticulo);
      
      if (extracted.brand) {
        successCount++;
        console.log(`✅ ÉXITO - Ref: ${part.refLocal}`);
        console.log(`   Descripción: "${part.descripcionArticulo}"`);
        console.log(`   Extraído: ${extracted.brand} ${extracted.model || '(sin modelo)'}`);
        console.log(`   ID vehículo: ${part.idVehiculo}`);
        console.log('');
      } else {
        console.log(`❌ FALLO - Ref: ${part.refLocal}`);
        console.log(`   Descripción: "${part.descripcionArticulo}"`);
        console.log('');
      }
    }

    const successRate = ((successCount / processedParts.length) * 100).toFixed(2);
    console.log(`📊 RESULTADOS DEL PATTERN MATCHING:`);
    console.log(`   Piezas analizadas: ${processedParts.length}`);
    console.log(`   Extracciones exitosas: ${successCount}`);
    console.log(`   Tasa de éxito: ${successRate}%`);

    if (successRate > 0) {
      console.log('\n🎉 ¡PATTERN MATCHING FUNCIONANDO! Encontramos marcas en las descripciones');
    } else {
      console.log('\n⚠️ Pattern matching no está funcionando, revisar lógica o datos');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testPatternMatchingDirect();