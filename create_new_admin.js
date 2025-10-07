/**
 * Crear nuevo usuario administrador con hash scrypt
 */

import { neon } from '@neondatabase/serverless';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createNewAdmin() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const hashedPassword = await hashPassword('admin123');
    
    const result = await sql`
      INSERT INTO users (username, email, password, is_admin, role)
      VALUES ('admin', 'admin@test.com', ${hashedPassword}, true, 'admin')
      RETURNING id, username, email, is_admin, role
    `;
    
    console.log('✅ Admin user created:', result[0]);
    
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createNewAdmin().catch(console.error);