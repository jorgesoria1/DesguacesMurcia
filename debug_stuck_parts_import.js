const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { importHistory } = require('./shared/schema');
const { eq } = require('drizzle-orm');

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function debugStuckPartsImport() {
    console.log('🔍 Analizando importaciones de piezas bloqueadas...');
    
    try {
        // Obtener historial de importaciones recientes
        const recentImports = await db
            .select()
            .from(importHistory)
            .where(eq(importHistory.type, 'parts'))
            .orderBy(importHistory.id.desc())
            .limit(10);
        
        console.log('\n📋 Historial de importaciones de piezas:');
        recentImports.forEach(imp => {
            console.log(`ID: ${imp.id}, Estado: ${imp.status}, Procesadas: ${imp.processed_items}, Inicio: ${imp.start_time}`);
        });
        
        // Buscar importaciones "in_progress" por mucho tiempo
        const stuckImports = recentImports.filter(imp => 
            imp.status === 'in_progress' && 
            new Date() - new Date(imp.start_time) > 10 * 60 * 1000 // Más de 10 minutos
        );
        
        if (stuckImports.length > 0) {
            console.log('\n⚠️  Importaciones bloqueadas encontradas:');
            
            for (const stuckImport of stuckImports) {
                console.log(`\n🔧 Cancelando importación bloqueada ID: ${stuckImport.id}`);
                
                await db
                    .update(importHistory)
                    .set({ 
                        status: 'cancelled',
                        error_messages: ['Cancelada por timeout - reiniciando proceso']
                    })
                    .where(eq(importHistory.id, stuckImport.id));
                
                console.log(`✅ Importación ${stuckImport.id} cancelada`);
            }
        }
        
        // Contar piezas en base de datos
        const partsCount = await sql`SELECT COUNT(*) as total FROM parts WHERE activo = true`;
        console.log(`\n📊 Total de piezas activas en BD: ${partsCount[0].total}`);
        
        // Obtener última importación exitosa
        const lastSuccessful = await db
            .select()
            .from(importHistory)
            .where(eq(importHistory.type, 'parts'))
            .where(eq(importHistory.status, 'completed'))
            .orderBy(importHistory.id.desc())
            .limit(1);
        
        if (lastSuccessful.length > 0) {
            console.log(`\n✅ Última importación exitosa: ID ${lastSuccessful[0].id}, procesadas: ${lastSuccessful[0].processed_items}`);
        }
        
        console.log('\n🔄 Análisis completado');
        
    } catch (error) {
        console.error('❌ Error analizando importaciones:', error);
    }
}

debugStuckPartsImport();