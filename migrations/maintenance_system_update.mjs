/**
 * Migración para actualizar el sistema de mantenimiento
 * - Elimina la tabla site_config anterior si existe
 * - Crea una nueva tabla site_config con el esquema mejorado
 */

import pg from 'pg';
const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Iniciando migración del sistema de mantenimiento...');
    
    // Iniciar transacción para asegurar que toda la migración se completa o ninguna
    await pool.query('BEGIN');
    
    // Verificar si la tabla anterior existe
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'site_config'
      );
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    
    // Si la tabla existe, eliminarla
    if (tableExists) {
      console.log('Eliminando tabla site_config anterior...');
      await pool.query('DROP TABLE IF EXISTS site_config');
    }
    
    // Crear la nueva tabla con el esquema mejorado
    console.log('Creando nueva tabla site_config...');
    await pool.query(`
      CREATE TABLE site_config (
        id SERIAL PRIMARY KEY,
        maintenance_mode BOOLEAN NOT NULL DEFAULT false,
        maintenance_message TEXT NOT NULL DEFAULT 'Estamos realizando mejoras en nuestra plataforma.',
        estimated_time TEXT NOT NULL DEFAULT 'Volveremos pronto',
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Insertar configuración inicial
    console.log('Insertando configuración inicial...');
    await pool.query(`
      INSERT INTO site_config (maintenance_mode, maintenance_message, estimated_time)
      VALUES (false, 'Estamos realizando mejoras en nuestra plataforma.', 'Volveremos pronto');
    `);
    
    // Confirmar la transacción
    await pool.query('COMMIT');
    console.log('Migración completada con éxito');
    
  } catch (error) {
    // Revertir la transacción en caso de error
    await pool.query('ROLLBACK');
    console.error('Error durante la migración:', error);
    throw error;
  } finally {
    // Cerrar la conexión
    await pool.end();
  }
}

// Ejecutar la migración
runMigration().catch(err => {
  console.error('Error al ejecutar la migración:', err);
  process.exit(1);
});