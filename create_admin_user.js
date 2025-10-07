
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { hashPassword } from './server/auth.js';
import { eq } from 'drizzle-orm';

async function createAdminUser() {
  try {
    console.log('Creando usuario administrador...');
    
    const hashedPassword = await hashPassword('jsn7953dzp');
    
    // Verificar si el usuario ya existe
    const existingUser = await db.select().from(users).where(eq(users.username, 'jorgesoria')).limit(1);
    
    if (existingUser.length > 0) {
      console.log('El usuario administrador ya existe');
      return;
    }
    
    // Crear el usuario administrador
    const newUser = await db.insert(users).values({
      username: 'jorgesoria',
      email: 'jorgesoria@admin.com',
      password: hashedPassword,
      firstName: 'Jorge',
      lastName: 'Soria',
      isAdmin: true
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      isAdmin: users.isAdmin
    });
    
    console.log('Usuario administrador creado exitosamente:');
    console.log('Username: jorgesoria');
    console.log('Password: jsn7953dzp');
    console.log('Admin: true');
    console.log('Usuario creado:', newUser[0]);
  } catch (error) {
    console.error('Error creando usuario administrador:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
