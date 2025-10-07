// Migración: añadir tabla para configuración del sitio

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

async function runMigration() {
  // Conexión a la base de datos
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Ejecutando migración para crear tabla site_config...');
    
    // Crear tabla site_config
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_config (
        id SERIAL PRIMARY KEY,
        maintenance_mode BOOLEAN DEFAULT FALSE NOT NULL,
        maintenance_message TEXT DEFAULT 'Estamos realizando mejoras en nuestra plataforma.',
        estimated_completion TEXT DEFAULT 'Volveremos pronto',
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_by INTEGER REFERENCES users(id)
      );
    `);

    // Insertar un registro por defecto
    await pool.query(`
      INSERT INTO site_config (maintenance_mode, maintenance_message, estimated_completion, updated_at)
      VALUES (false, 'Estamos realizando mejoras en nuestra plataforma.', 'Volveremos pronto', NOW())
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Tabla site_config creada correctamente');
    console.log('✅ Registro inicial de configuración creado');
    
    return true;
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
    throw error;
  } finally {
    // Cerrar la conexión a la base de datos
    await pool.end();
  }
}

// Ejecutar la migración como función principal
runMigration()
  .then(() => {
    console.log('Migración completada exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error durante la migración:', error);
    process.exit(1);
  });