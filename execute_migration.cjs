// Migration executor script

const { Pool } = require('pg');
require('dotenv').config();

async function executeMigration() {
  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Executing migration to create site_config table...');
    
    // Create site_config table
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

    // Insert a default record
    await pool.query(`
      INSERT INTO site_config (maintenance_mode, maintenance_message, estimated_completion, updated_at)
      VALUES (false, 'Estamos realizando mejoras en nuestra plataforma.', 'Volveremos pronto', NOW())
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ site_config table created successfully');
    console.log('✅ Default configuration record created');
    
    return true;
  } catch (error) {
    console.error('Error executing migration:', error);
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Execute the migration
executeMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during migration:', error);
    process.exit(1);
  });