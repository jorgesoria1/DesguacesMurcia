/**
 * SCRIPT: Desactivar piezas existentes con "no identificado"
 * Limpia las piezas que ya están en la base de datos con este título
 */

import { db } from './server/db.ts';
import { parts } from './shared/schema.ts';
import { eq, sql, and } from 'drizzle-orm';

console.log('🔧 DESACTIVANDO PIEZAS EXISTENTES CON "NO IDENTIFICADO"');
console.log('═'.repeat(60));

async function desactivarPiezasNoIdentificado() {
  try {
    // Encontrar todas las piezas activas con "no identificado"
    const piezasParaDesactivar = await db.select({
      id: parts.id,
      refLocal: parts.refLocal,
      descripcionArticulo: parts.descripcionArticulo,
      idVehiculo: parts.idVehiculo
    })
    .from(parts)
    .where(
      and(
        sql`LOWER(${parts.descripcionArticulo}) LIKE '%no identificado%'`,
        eq(parts.activo, true)
      )
    );
    
    console.log(`🔍 Encontradas ${piezasParaDesactivar.length} piezas con "no identificado" para desactivar`);
    
    if (piezasParaDesactivar.length === 0) {
      console.log('✅ No se encontraron piezas para desactivar');
      return;
    }
    
    // Mostrar las piezas que se van a desactivar
    console.log('\n📋 PIEZAS QUE SE DESACTIVARÁN:');
    piezasParaDesactivar.forEach((pieza, index) => {
      console.log(`   ${index + 1}. ID: ${pieza.id}, Ref: ${pieza.refLocal}, Vehículo: ${pieza.idVehiculo}`);
      console.log(`      Título: "${pieza.descripcionArticulo}"`);
    });
    
    // Desactivar las piezas
    const resultado = await db
      .update(parts)
      .set({ 
        activo: false,
        fechaActualizacion: sql`NOW()`
      })
      .where(
        and(
          sql`LOWER(${parts.descripcionArticulo}) LIKE '%no identificado%'`,
          eq(parts.activo, true)
        )
      );
    
    console.log(`\n✅ DESACTIVACIÓN COMPLETADA`);
    console.log(`   • ${piezasParaDesactivar.length} piezas desactivadas exitosamente`);
    console.log('   • Estas piezas ya no aparecerán en búsquedas públicas');
    console.log('   • Los administradores pueden verlas en el backend');
    
    console.log('\n🔄 PRÓXIMOS PASOS:');
    console.log('   • Las futuras importaciones automáticamente desactivarán');
    console.log('     nuevas piezas con "no identificado"');
    console.log('   • La lógica está implementada en normalizePart()');
    
  } catch (error) {
    console.error('❌ Error desactivando piezas:', error);
    throw error;
  }
}

// Ejecutar desactivación
desactivarPiezasNoIdentificado()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });