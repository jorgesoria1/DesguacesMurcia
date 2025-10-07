import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { importHistory, importSchedule } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function forceScheduledImport() {
    console.log('🔧 Forzando ejecución de importación programada...');
    
    try {
        // Obtener la importación programada
        const schedules = await db
            .select()
            .from(importSchedule)
            .where(eq(importSchedule.active, true));
        
        console.log(`📋 Programaciones encontradas: ${schedules.length}`);
        
        for (const schedule of schedules) {
            console.log(`📅 Programación ID: ${schedule.id}, Tipo: ${schedule.type}, Próxima ejecución: ${schedule.next_run}`);
            
            // Verificar si es hora de ejecutar
            const now = new Date();
            const nextRun = new Date(schedule.next_run);
            
            console.log(`⏰ Hora actual: ${now.toISOString()}`);
            console.log(`⏰ Próxima ejecución: ${nextRun.toISOString()}`);
            console.log(`⏰ Diferencia: ${now.getTime() - nextRun.getTime()}ms`);
            
            if (now >= nextRun) {
                console.log('✅ Es hora de ejecutar la importación!');
                
                // Iniciar importación
                const response = await fetch('http://localhost:5000/api/import/start-all', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        type: schedule.type,
                        fullImport: true 
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Importación iniciada:', result);
                } else {
                    console.log('❌ Error al iniciar importación:', response.status);
                }
            } else {
                console.log('⏳ Aún no es hora de ejecutar');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

forceScheduledImport();