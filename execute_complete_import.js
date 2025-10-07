#!/usr/bin/env node

/**
 * Script para ejecutar una importación completa de piezas con protección de piezas procesadas
 */

import { MetasyncOptimizedImportService } from './server/api/metasync-optimized-import-service.js';

console.log('🚀 Iniciando importación completa de piezas...');

async function executeCompleteImport() {
  try {
    const importService = new MetasyncOptimizedImportService();
    
    console.log('📋 Configurando servicio de importación...');
    await importService.configure();
    
    // Verificar configuración de API
    console.log('🔑 API configurada y lista para importación');
    
    // Ejecutar importación completa
    console.log('🔄 Iniciando importación completa de piezas...');
    const importId = await importService.startImport('parts', undefined, true);
    
    console.log(`✅ Importación iniciada con ID: ${importId}`);
    console.log('📈 La importación se está ejecutando en segundo plano');
    console.log('🔒 Las piezas procesadas están protegidas contra desactivación automática');
    
    // Monitorear progreso cada 30 segundos
    console.log('\n📊 Monitoreando progreso de importación...');
    
    let completed = false;
    let attempts = 0;
    const maxAttempts = 120; // 60 minutos máximo
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Esperar 30 segundos
      attempts++;
      
      try {
        // Consultar estado de la importación
        const { db } = await import('./server/db.js');
        const { importHistory } = await import('./shared/schema.js');
        const { eq } = await import('drizzle-orm');
        
        const [status] = await db
          .select({
            status: importHistory.status,
            progress: importHistory.progress,
            processedItems: importHistory.processedItems,
            newItems: importHistory.newItems,
            updatedItems: importHistory.updatedItems,
            processingItem: importHistory.processingItem
          })
          .from(importHistory)
          .where(eq(importHistory.id, importId));
        
        if (status) {
          console.log(`[${attempts * 0.5}min] Estado: ${status.status}, Progreso: ${status.progress}%`);
          console.log(`   Procesados: ${status.processedItems}, Nuevos: ${status.newItems}, Actualizados: ${status.updatedItems}`);
          console.log(`   Acción: ${status.processingItem}`);
          
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'partial') {
            completed = true;
            console.log(`\n✅ Importación ${status.status.toUpperCase()}`);
            
            // Verificar estado final de piezas procesadas
            console.log('\n📊 Verificando estado final de piezas procesadas...');
            
            const { parts } = await import('./shared/schema.js');
            const { sql } = await import('drizzle-orm');
            
            const [stats] = await db
              .select({
                totalProcesadas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 THEN 1 END)`,
                procesadasActivas: sql`COUNT(CASE WHEN ${parts.idVehiculo} < 0 AND ${parts.activo} = true THEN 1 END)`,
                totalActivas: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`
              })
              .from(parts);
            
            console.log(`   • Total piezas procesadas: ${stats.totalProcesadas}`);
            console.log(`   • Piezas procesadas activas: ${stats.procesadasActivas}`);
            console.log(`   • Total piezas activas: ${stats.totalActivas}`);
            
            if (stats.procesadasActivas > 90000) {
              console.log('🎉 ¡ÉXITO! Las piezas procesadas se mantuvieron activas correctamente');
            } else {
              console.log('⚠️ ADVERTENCIA: Algunas piezas procesadas fueron desactivadas');
            }
          }
        } else {
          console.log(`[${attempts * 0.5}min] No se pudo obtener el estado de la importación`);
        }
        
      } catch (statusError) {
        console.error(`Error consultando estado: ${statusError.message}`);
      }
    }
    
    if (!completed) {
      console.log('⏰ Tiempo de espera agotado. La importación sigue ejecutándose.');
    }
    
  } catch (error) {
    console.error('❌ Error en importación completa:', error);
    process.exit(1);
  }
}

// Ejecutar importación
executeCompleteImport()
  .then(() => {
    console.log('\n✅ Script de importación completa finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en script:', error);
    process.exit(1);
  });