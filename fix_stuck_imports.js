#!/usr/bin/env node

/**
 * Corrige importaciones bloqueadas y marca las pendientes como completadas
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function fixStuckImports() {
  try {
    console.log('🔧 Corrigiendo importaciones bloqueadas...\n');

    // Buscar importaciones bloqueadas (más de 10 minutos sin actualizar)
    const stuckImports = await sql`
      SELECT 
        id,
        type,
        status,
        start_time,
        last_updated,
        processing_item
      FROM import_history
      WHERE status IN ('in_progress', 'processing', 'pending')
        AND start_time < NOW() - INTERVAL '10 minutes'
      ORDER BY start_time DESC
    `;

    if (stuckImports.length === 0) {
      console.log('✅ No hay importaciones bloqueadas');
      return;
    }

    console.log(`🔍 Encontradas ${stuckImports.length} importaciones bloqueadas:`);

    for (const imp of stuckImports) {
      const elapsedMinutes = Math.round((Date.now() - new Date(imp.start_time).getTime()) / 60000);
      
      console.log(`\n📋 ID ${imp.id} - ${imp.type} (${imp.status})`);
      console.log(`   Iniciada: hace ${elapsedMinutes} minutos`);
      console.log(`   Estado: ${imp.processing_item || 'Sin información'}`);
      
      // Marcar como fallida con información del error
      await sql`
        UPDATE import_history 
        SET 
          status = 'failed',
          end_time = NOW(),
          errors = ARRAY['Importación bloqueada - marcada como fallida automáticamente'],
          error_count = 1,
          processing_item = 'Importación bloqueada - timeout después de ' || ${elapsedMinutes} || ' minutos'
        WHERE id = ${imp.id}
      `;
      
      console.log(`   ✅ Marcada como fallida`);
    }

    console.log(`\n✅ ${stuckImports.length} importaciones corregidas`);

    // Mostrar estadísticas actualizadas
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status IN ('in_progress', 'processing', 'pending')) as active
      FROM import_history 
      WHERE start_time > NOW() - INTERVAL '24 hours'
    `;

    console.log('\n📊 Estado actual (últimas 24h):');
    console.log(`   ✅ Completadas: ${stats[0].completed}`);
    console.log(`   ❌ Fallidas: ${stats[0].failed}`);
    console.log(`   🔄 Activas: ${stats[0].active}`);

  } catch (error) {
    console.error('❌ Error corrigiendo importaciones:', error.message);
  }
}

// Ejecutar corrección
fixStuckImports()
  .then(() => {
    console.log('\n✅ Corrección completada');
  })
  .catch(console.error);