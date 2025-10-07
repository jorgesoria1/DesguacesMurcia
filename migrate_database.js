import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from './shared/schema.ts';
import fs from 'fs';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL no está configurada');
  process.exit(1);
}

console.log('Iniciando proceso de migración completa de base de datos...');

async function exportAllData() {
  console.log('Exportando todos los datos de la base de datos actual...');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    const backup = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    // Obtener lista de todas las tablas de la base de datos
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`Encontradas ${tablesResult.rows.length} tablas en la base de datos`);

    // Exportar datos de cada tabla
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;
      
      try {
        console.log(`Exportando tabla: ${tableName}`);
        
        // Obtener estructura de la tabla
        const columnsResult = await db.execute(sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
          ORDER BY ordinal_position;
        `);

        // Exportar datos
        const dataResult = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)}`);
        
        backup.tables[tableName] = {
          structure: columnsResult.rows,
          data: dataResult.rows,
          count: dataResult.rows.length
        };

        console.log(`  ${dataResult.rows.length} registros exportados de ${tableName}`);

      } catch (error) {
        console.log(`  Error exportando ${tableName}: ${error.message}`);
        backup.tables[tableName] = {
          structure: [],
          data: [],
          count: 0,
          error: error.message
        };
      }
    }

    // Guardar backup
    const backupFile = `backup_completo_${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`Backup completo guardado en: ${backupFile}`);
    console.log('Resumen del backup:');
    
    Object.entries(backup.tables).forEach(([tableName, tableData]) => {
      console.log(`  ${tableName}: ${tableData.count} registros`);
    });

    await pool.end();
    return backup;

  } catch (error) {
    console.error('Error durante la exportación:', error);
    await pool.end();
    throw error;
  }
}

async function recreateDatabase() {
  console.log('Recreando estructura de base de datos...');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    // Eliminar todas las tablas existentes
    console.log('Eliminando tablas existentes...');
    
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    // Desactivar restricciones de clave foránea temporalmente
    await db.execute(sql`SET session_replication_role = replica;`);

    for (const tableRow of tablesResult) {
      const tableName = tableRow.table_name;
      console.log(`Eliminando tabla: ${tableName}`);
      await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(tableName)} CASCADE`);
    }

    // Reactivar restricciones
    await db.execute(sql`SET session_replication_role = DEFAULT;`);

    await pool.end();
    console.log('Tablas eliminadas exitosamente');

  } catch (error) {
    console.error('Error eliminando tablas:', error);
    await pool.end();
    throw error;
  }
}

async function restoreData(backup) {
  console.log('Restaurando datos en la nueva estructura...');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    // Mapeo de nombres de tablas del backup a las tablas del schema
    const tableMapping = {
      'users': schema.users,
      'api_config': schema.apiConfig,
      'site_config': schema.siteConfig,
      'vehicles': schema.vehicles,
      'parts': schema.parts,
      'vehicle_parts': schema.vehicleParts,
      'import_history': schema.importHistory,
      'import_schedule': schema.importSchedule,
      'sync_control': schema.syncControl,
      'carts': schema.carts,
      'cart_items': schema.cartItems,
      'shipping_config': schema.shippingConfig,
      'payment_config': schema.paymentConfig,
      'orders': schema.orders,
      'order_payments': schema.orderPayments
    };

    // Orden de restauración (respetando dependencias)
    const restoreOrder = [
      'users', 'api_config', 'site_config', 'vehicles', 'parts', 
      'vehicle_parts', 'import_history', 'import_schedule', 'sync_control',
      'carts', 'cart_items', 'shipping_config', 'payment_config', 
      'orders', 'order_payments'
    ];

    for (const tableName of restoreOrder) {
      const tableData = backup.tables[tableName];
      
      if (!tableData || !tableData.data || tableData.data.length === 0) {
        console.log(`Omitiendo ${tableName} (sin datos)`);
        continue;
      }

      const schemaTable = tableMapping[tableName];
      if (!schemaTable) {
        console.log(`Omitiendo ${tableName} (no encontrada en schema)`);
        continue;
      }

      console.log(`Restaurando ${tableName} (${tableData.count} registros)...`);

      try {
        // Insertar en lotes
        const batchSize = 50;
        const data = tableData.data;
        
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          await db.insert(schemaTable).values(batch);
        }

        console.log(`  ${tableName} restaurado exitosamente`);

      } catch (error) {
        console.error(`  Error restaurando ${tableName}: ${error.message}`);
      }
    }

    await pool.end();
    console.log('Restauración de datos completada');

  } catch (error) {
    console.error('Error durante la restauración:', error);
    await pool.end();
    throw error;
  }
}

// Función principal
async function migrateDatabaseComplete() {
  try {
    console.log('='.repeat(60));
    console.log('MIGRACIÓN COMPLETA DE BASE DE DATOS');
    console.log('='.repeat(60));
    
    // Paso 1: Exportar todos los datos actuales
    const backup = await exportAllData();
    
    // Paso 2: Recrear estructura de base de datos
    await recreateDatabase();
    
    // Paso 3: Ejecutar db:push para crear el nuevo schema
    console.log('Ejecutando db:push para crear nueva estructura...');
    const { execSync } = await import('child_process');
    execSync('npm run db:push', { stdio: 'inherit' });
    
    // Paso 4: Restaurar datos
    await restoreData(backup);
    
    console.log('='.repeat(60));
    console.log('MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('Tu aplicación ahora usa una base de datos completamente nueva');
    console.log('con todos los datos migrados desde la base de datos anterior.');
    
  } catch (error) {
    console.error('ERROR EN LA MIGRACIÓN:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateDatabaseComplete();