/**
 * Script para crear un usuario administrador de prueba
 */

import { db } from './server/db.js';
import { users } from './shared/schema.js';
import bcrypt from 'bcrypt';

async function createAdminTestUser() {
  try {
    console.log('Creating admin test user...');
    
    // Verificar si ya existe un usuario admin
    const existingAdmin = await db.select().from(users).where(users.username.eq('admin'));
    
    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const newAdmin = await db.insert(users).values({
      username: 'admin',
      email: 'admin@test.com',
      password: hashedPassword,
      isAdmin: true,
      role: 'admin'
    }).returning();
    
    console.log('✅ Admin user created successfully:', newAdmin[0]);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminTestUser().catch(console.error);