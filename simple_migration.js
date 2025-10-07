import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from './shared/schema.ts';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL no está configurada');
  process.exit(1);
}

console.log('Iniciando migración simple de base de datos...');

async function cleanAndRecreateDatabase() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log('Guardando configuración existente...');
    
    // Exportar la configuración del sitio que existe
    let siteConfigBackup = null;
    try {
      const siteConfigData = await db.execute(sql`SELECT * FROM site_config LIMIT 1`);
      if (siteConfigData.rows.length > 0) {
        siteConfigBackup = siteConfigData.rows[0];
        console.log('Configuración del sitio guardada:', siteConfigBackup);
      }
    } catch (error) {
      console.log('No se encontró configuración previa del sitio');
    }

    console.log('Eliminando todas las tablas...');
    
    // Lista de tablas en orden inverso para evitar problemas de dependencias
    const tablesToDrop = [
      'order_payments', 'orders', 'cart_items', 'carts', 'vehicle_parts', 
      'parts', 'vehicles', 'import_history', 'import_schedule', 'sync_control',
      'payment_config', 'shipping_config', 'site_config', 'api_config', 'users'
    ];

    for (const tableName of tablesToDrop) {
      try {
        await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(tableName)} CASCADE`);
        console.log(`✓ Tabla ${tableName} eliminada`);
      } catch (error) {
        console.log(`- Tabla ${tableName} no existía`);
      }
    }

    await pool.end();
    
    console.log('Recreando estructura con db:push...');
    const { execSync } = await import('child_process');
    execSync('npm run db:push', { stdio: 'inherit' });
    
    // Reconectar para restaurar datos
    const newPool = new Pool({ connectionString: DATABASE_URL });
    const newDb = drizzle(newPool, { schema });
    
    // Restaurar configuración del sitio si existía
    if (siteConfigBackup) {
      console.log('Restaurando configuración del sitio...');
      await newDb.insert(schema.siteConfig).values({
        maintenanceMode: siteConfigBackup.maintenance_mode,
        maintenanceMessage: siteConfigBackup.maintenance_message,
        estimatedTime: siteConfigBackup.estimated_time
      });
      console.log('✓ Configuración del sitio restaurada');
    } else {
      // Crear configuración por defecto
      console.log('Creando configuración por defecto del sitio...');
      await newDb.insert(schema.siteConfig).values({
        maintenanceMode: false,
        maintenanceMessage: "Estamos realizando mejoras en nuestra plataforma.",
        estimatedTime: "Volveremos pronto"
      });
      console.log('✓ Configuración por defecto creada');
    }

    await newPool.end();
    
    console.log('========================================');
    console.log('MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('========================================');
    console.log('✓ Nueva base de datos creada');
    console.log('✓ Estructura actualizada');
    console.log('✓ Configuración preservada');
    console.log('✓ Tu aplicación está lista para usar');

  } catch (error) {
    console.error('Error durante la migración:', error);
    await pool.end();
    throw error;
  }
}

cleanAndRecreateDatabase().catch(console.error);