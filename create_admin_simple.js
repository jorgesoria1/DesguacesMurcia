/**
 * Script simple para crear usuario administrador
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

async function createAdmin() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Verificar si ya existe
    const existing = await sql`SELECT id FROM users WHERE username = 'admin'`;
    
    if (existing.length > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const result = await sql`
      INSERT INTO users (username, email, password, "isAdmin", role)
      VALUES ('admin', 'admin@test.com', ${hashedPassword}, true, 'admin')
      RETURNING id, username, email, "isAdmin"
    `;
    
    console.log('✅ Admin user created:', result[0]);
    
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin().catch(console.error);