import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;

(async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // Crear tabla sync_control
    console.log('Creando tabla sync_control...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sync_control (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        last_sync_date TIMESTAMP NOT NULL DEFAULT NOW(),
        last_id INTEGER NOT NULL DEFAULT 0,
        records_processed INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Tabla sync_control creada correctamente.');

    // Crear registros iniciales para vehículos y piezas
    console.log('Creando registros iniciales para control de sincronización...');
    await db.execute(sql`
      INSERT INTO sync_control (type, last_sync_date, last_id, records_processed, active)
      VALUES 
        ('vehicles', '2000-01-01 00:00:00', 0, 0, TRUE),
        ('parts', '2000-01-01 00:00:00', 0, 0, TRUE)
      ON CONFLICT DO NOTHING;
    `);

    console.log('Registros iniciales creados correctamente.');

    // Verificar tablas disponibles después de la migración
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tablas disponibles después de la migración:');
    result.rows.forEach(row => {
      console.log(` - ${row.table_name}`);
    });

    console.log('Migración completada con éxito.');
    await pool.end();

  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
    process.exit(1);
  }
})();