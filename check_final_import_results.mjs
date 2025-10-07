import { db } from './server/db.js';
import { importHistory, parts } from './shared/schema.js';
import { sql, desc, lt, and, eq, ne, isNotNull } from 'drizzle-orm';

async function checkFinalResults() {
  try {
    console.log('🎯 Verificando resultados finales de la importación...\n');
    
    // Buscar la importación más reciente
    const recentImports = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.startTime))
      .limit(3);
    
    console.log('📋 Últimas 3 importaciones:');
    recentImports.forEach((imp, index) => {
      console.log(`   ${index + 1}. ID: ${imp.id}, Tipo: ${imp.type}, Estado: ${imp.status}, Progreso: ${imp.progress}%`);
      if (imp.endTime) {
        console.log(`      Finalizada: ${imp.endTime.toISOString()}`);
      }
    });
    console.log('');
    
    // Estadísticas actuales completas
    const currentStats = await db
      .select({ 
        totalParts: sql`COUNT(*)`,
        activeParts: sql`COUNT(*) FILTER (WHERE activo = true)`,
        inactiveParts: sql`COUNT(*) FILTER (WHERE activo = false)`,
        processedVehicleParts: sql`COUNT(*) FILTER (WHERE id_vehiculo < 0)`,
        activeProcessedParts: sql`COUNT(*) FILTER (WHERE id_vehiculo < 0 AND activo = true)`,
        physicalVehicleParts: sql`COUNT(*) FILTER (WHERE id_vehiculo > 0)`,
        activePhysicalParts: sql`COUNT(*) FILTER (WHERE id_vehiculo > 0 AND activo = true)`
      })
      .from(parts);
    
    const stats = currentStats[0];
    console.log('📊 Estadísticas finales completas:');
    console.log(`   Total piezas: ${stats.totalParts}`);
    console.log(`   ✅ Piezas activas: ${stats.activeParts}`);
    console.log(`   ❌ Piezas inactivas: ${stats.inactiveParts}\n`);
    
    console.log('🚗 Distribución por tipo de vehículo:');
    console.log(`   Vehículos procesados (ID < 0): ${stats.processedVehicleParts}`);
    console.log(`   └─ Activas: ${stats.activeProcessedParts} (${((stats.activeProcessedParts / stats.processedVehicleParts) * 100).toFixed(1)}%)`);
    console.log(`   Vehículos físicos (ID > 0): ${stats.physicalVehicleParts}`);
    console.log(`   └─ Activas: ${stats.activePhysicalParts} (${((stats.activePhysicalParts / stats.physicalVehicleParts) * 100).toFixed(1)}%)\n`);
    
    // Verificar endpoint de frontend
    console.log('🌐 Verificando total disponible en frontend...');
    try {
      const response = await fetch('http://localhost:5000/api/search-parts?getTotalCount=true&limit=1');
      const data = await response.json();
      console.log(`   Frontend muestra: ${data.pagination.total} piezas disponibles\n`);
    } catch (error) {
      console.log('   No se pudo verificar frontend\n');
    }
    
    console.log('✅ Verificación completa');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFinalResults();
