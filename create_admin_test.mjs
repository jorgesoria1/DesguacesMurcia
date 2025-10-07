import { db } from './server/db.js';
import { users } from './shared/schema.js';
import bcrypt from 'bcrypt';

async function createAdminUser() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const newUser = await db.insert(users).values({
      username: 'admin_test',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin'
    }).returning();

    console.log('Usuario admin creado:', newUser[0]);
    process.exit(0);
  } catch (error) {
    if (error.code === '23505') {
      console.log('Usuario admin ya existe');
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

createAdminUser();
