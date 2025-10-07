const bcrypt = require('bcrypt');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const { eq } = require('drizzle-orm');
const schema = require('./shared/schema.ts');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function resetAdminPassword() {
  try {
    console.log('🔧 Reseteando contraseña del administrador...');
    
    const adminEmail = 'test@admin.com';
    const newPassword = 'admin123';
    
    // Verificar si existe el usuario
    const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.email, adminEmail)).limit(1);
    
    if (existingAdmin.length === 0) {
      console.log('❌ Usuario no encontrado:', adminEmail);
      return;
    }
    
    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña
    await db.update(schema.users)
      .set({ password: hashedPassword })
      .where(eq(schema.users.email, adminEmail));
    
    console.log('✅ Contraseña actualizada exitosamente');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Nueva Password:', newPassword);
    
  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();