import { db } from './server/db.js';
import { importHistory, parts } from './shared/schema.js';
import { sql, desc, lt, and, eq, ne, isNotNull } from 'drizzle-orm';

async function monitorImport() {
  try {
    console.log('🔍 Monitoreando importación en curso...\n');
    
    // Verificar si hay importaciones activas
    const activeImports = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.status, 'in_progress'))
      .orderBy(desc(importHistory.startTime))
      .limit(1);
    
    if (activeImports.length === 0) {
      console.log('⏳ No hay importaciones activas en este momento');
      process.exit(0);
    }
    
    const currentImport = activeImports[0];
    console.log(`📥 Importación activa encontrada:`);
    console.log(`   ID: ${currentImport.id}`);
    console.log(`   Tipo: ${currentImport.type}`);
    console.log(`   Estado: ${currentImport.status}`);
    console.log(`   Progreso: ${currentImport.progress}%`);
    console.log(`   Procesados: ${currentImport.processedItems}`);
    console.log(`   Elemento actual: ${currentImport.processingItem}\n`);
    
    // Verificar conteo actual de vehículos procesados
    const processedVehicleStats = await db
      .select({ 
        total: sql`COUNT(*)`,
        activos: sql`COUNT(*) FILTER (WHERE activo = true)`,
        inactivos: sql`COUNT(*) FILTER (WHERE activo = false)`
      })
      .from(parts)
      .where(
        and(
          lt(parts.idVehiculo, 0),
          isNotNull(parts.vehicleMarca),
          ne(parts.vehicleMarca, ''),
          ne(parts.vehicleMarca, '» OTROS...'),
          ne(parts.vehicleModelo, 'MODELOS')
        )
      );
    
    const stats = processedVehicleStats[0];
    console.log(`🚗 Estadísticas de vehículos procesados:`);
    console.log(`   Total con datos válidos: ${stats.total}`);
    console.log(`   ✅ Activos: ${stats.activos} (${((stats.activos / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   ❌ Inactivos: ${stats.inactivos} (${((stats.inactivos / stats.total) * 100).toFixed(1)}%)\n`);
    
    // Total de piezas activas
    const totalActive = await db
      .select({ count: sql`COUNT(*)` })
      .from(parts)
      .where(eq(parts.activo, true));
    
    console.log(`📈 Total piezas activas: ${totalActive[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error monitoreando importación:', error);
    process.exit(1);
  }
}

monitorImport();
