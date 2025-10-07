/**
 * SCRIPT DE VERIFICACIÓN: Desactivación de piezas "no identificado"
 * Verifica que las piezas con título "no identificado" se desactiven durante importación
 */

import { db } from './server/db.ts';
import { parts } from './shared/schema.ts';
import { eq, sql, and, like } from 'drizzle-orm';

console.log('🔍 VERIFICANDO IMPLEMENTACIÓN DE DESACTIVACIÓN "NO IDENTIFICADO"');
console.log('═'.repeat(70));

async function verificarDesactivacionNoIdentificado() {
  try {
    console.log('\n📊 ANÁLISIS ACTUAL DE PIEZAS CON "NO IDENTIFICADO":');
    
    // Buscar piezas con "no identificado" en el título
    const piezasNoIdentificado = await db.select({
      id: parts.id,
      refLocal: parts.refLocal,
      descripcionArticulo: parts.descripcionArticulo,
      activo: parts.activo,
      idVehiculo: parts.idVehiculo,
      precio: parts.precio
    })
    .from(parts)
    .where(
      and(
        sql`LOWER(${parts.descripcionArticulo}) LIKE '%no identificado%'`,
        eq(parts.activo, true) // Solo buscar las que AÚN están activas
      )
    )
    .limit(20);
    
    console.log(`\n📊 RESULTADOS:`);
    console.log(`   • Piezas activas con "no identificado": ${piezasNoIdentificado.length}`);
    
    if (piezasNoIdentificado.length > 0) {
      console.log('\n❌ PIEZAS QUE DEBERÍAN ESTAR DESACTIVADAS:');
      piezasNoIdentificado.forEach((pieza, index) => {
        console.log(`   ${index + 1}. ID: ${pieza.id}, Ref: ${pieza.refLocal}, Vehículo: ${pieza.idVehiculo}`);
        console.log(`      Título: "${pieza.descripcionArticulo}"`);
        console.log(`      Estado: ${pieza.activo ? 'ACTIVA ❌' : 'INACTIVA ✅'}, Precio: ${pieza.precio}`);
      });
      
      console.log('\n⚠️ PROBLEMA DETECTADO:');
      console.log('   Hay piezas con "no identificado" que siguen activas.');
      console.log('   Estas deberían desactivarse automáticamente durante la importación.');
    } else {
      console.log('\n✅ IMPLEMENTACIÓN CORRECTA:');
      console.log('   No se encontraron piezas activas con "no identificado".');
      console.log('   La lógica de desactivación está funcionando correctamente.');
    }
    
    // Verificar también las desactivadas para confirmar que la lógica funciona
    const piezasDesactivadas = await db.select({
      count: sql<number>`count(*)`
    })
    .from(parts)
    .where(
      and(
        sql`LOWER(${parts.descripcionArticulo}) LIKE '%no identificado%'`,
        eq(parts.activo, false)
      )
    );
    
    console.log(`\n📊 PIEZAS DESACTIVADAS CON "NO IDENTIFICADO": ${piezasDesactivadas[0]?.count || 0}`);
    
    console.log('\n🔍 CÓDIGO IMPLEMENTADO EN normalizePart:');
    console.log('```javascript');
    console.log('// ✅ VERIFICAR TÍTULO "NO IDENTIFICADO" - DESACTIVAR ESTAS PIEZAS');
    console.log('const tituloLower = descripcionArticulo.toLowerCase();');
    console.log('if (tituloLower.includes("no identificado") || tituloLower.includes("no identificada")) {');
    console.log('  console.log(`❌ Pieza ${partData.refLocal}: DESACTIVADA por título "no identificado"`);');
    console.log('  return false;');
    console.log('}');
    console.log('```');
    
    console.log('\n✅ SIGUIENTE PASO:');
    console.log('   Ejecutar una importación para probar la lógica en acción.');
    console.log('   Las piezas con "no identificado" deberían desactivarse automáticamente.');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
}

// Ejecutar verificación
verificarDesactivacionNoIdentificado()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  });