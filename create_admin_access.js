const bcrypt = require('bcrypt');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const { users } = require('./shared/schema.ts');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function createAdminUser() {
  try {
    console.log('🔧 Creando usuario administrador...');
    
    const adminEmail = 'admin@desguacesmurcia.com';
    const adminPassword = 'Admin2025!';
    
    // Verificar si ya existe
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('✅ Usuario administrador ya existe:', adminEmail);
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
      return;
    }
    
    // Crear nuevo usuario administrador
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const newAdmin = await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Sistema',
      phone: '123456789',
      address: 'Sistema',
      city: 'Murcia',
      postalCode: '30001',
      role: 'admin',
      isActive: true,
      emailVerified: true
    }).returning();
    
    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 ID:', newAdmin[0].id);
    
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();