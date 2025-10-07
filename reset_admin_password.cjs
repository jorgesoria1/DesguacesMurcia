const bcrypt = require('bcrypt');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const { eq } = require('drizzle-orm');

// Simple schema definition for users table
const users = {
  email: 'text',
  password: 'text'
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function resetAdminPassword() {
  try {
    console.log('🔧 Reseteando contraseña del administrador...');
    
    const adminEmail = 'test@admin.com';
    const newPassword = 'admin123';
    
    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña directamente con SQL
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, adminEmail]
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Contraseña actualizada exitosamente');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Nueva Password:', newPassword);
    } else {
      console.log('❌ Usuario no encontrado:', adminEmail);
    }
    
  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();