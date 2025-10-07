#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Configuración de la base de datos
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { users } = require('./shared/schema');
const { eq } = require('drizzle-orm');

async function testStartTimeImport() {
  try {
    console.log('🧪 Iniciando prueba de configuración startTime para importaciones programadas...');
    
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    // Crear usuario admin temporal para pruebas
    const testEmail = 'test@admin.com';
    const testPassword = 'testpassword';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    console.log('👤 Creando usuario admin temporal...');
    try {
      await db.insert(users).values({
        email: testEmail,
        password: hashedPassword,
        isAdmin: true,
        nombre: 'Test Admin',
        apellido: 'User'
      });
      console.log('✅ Usuario admin creado');
    } catch (error) {
      console.log('ℹ️  Usuario admin ya existe, continuando...');
    }

    // Función para hacer login
    async function login() {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: testEmail,
        password: testPassword
      });
      
      const cookies = response.headers['set-cookie'];
      return cookies ? cookies.join('; ') : '';
    }

    // Obtener cookie de sesión
    console.log('🔐 Iniciando sesión...');
    const sessionCookie = await login();
    console.log('✅ Sesión iniciada');

    // Configurar headers con cookie
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    };

    // Prueba 1: Crear programación con startTime personalizado
    console.log('\n📅 Prueba 1: Creando programación con startTime personalizado...');
    const scheduleData = {
      type: 'parts',
      frequency: '24h',
      startTime: '14:30',
      active: true,
      isFullImport: false
    };

    try {
      const createResponse = await axios.post(
        'http://localhost:5000/api/import/schedule',
        scheduleData,
        { headers }
      );
      
      console.log('✅ Programación creada exitosamente:');
      console.log(`   - Tipo: ${createResponse.data.schedule.type}`);
      console.log(`   - Frecuencia: ${createResponse.data.schedule.frequency}`);
      console.log(`   - Hora de inicio: ${createResponse.data.schedule.startTime}`);
      console.log(`   - Activa: ${createResponse.data.schedule.active}`);
      console.log(`   - Próxima ejecución: ${createResponse.data.schedule.nextRun}`);
      
      const scheduleId = createResponse.data.schedule.id;
      
      // Prueba 2: Actualizar startTime de la programación
      console.log('\n📅 Prueba 2: Actualizando startTime de la programación...');
      const updateData = {
        startTime: '08:15',
        frequency: '12h'
      };

      const updateResponse = await axios.put(
        `http://localhost:5000/api/import/schedule/${scheduleId}`,
        updateData,
        { headers }
      );
      
      console.log('✅ Programación actualizada exitosamente:');
      console.log(`   - Nueva hora de inicio: ${updateResponse.data.schedule.startTime}`);
      console.log(`   - Nueva frecuencia: ${updateResponse.data.schedule.frequency}`);
      console.log(`   - Nueva próxima ejecución: ${updateResponse.data.schedule.nextRun}`);
      
      // Prueba 3: Listar todas las programaciones
      console.log('\n📅 Prueba 3: Listando todas las programaciones...');
      const listResponse = await axios.get('http://localhost:5000/api/import/schedules', { headers });
      
      console.log('✅ Programaciones actuales:');
      listResponse.data.schedules.forEach((schedule, index) => {
        console.log(`   ${index + 1}. ${schedule.type} - ${schedule.frequency} - ${schedule.startTime || 'No definido'} - ${schedule.active ? 'Activa' : 'Inactiva'}`);
      });
      
      // Prueba 4: Validar formato de hora incorrecto
      console.log('\n📅 Prueba 4: Validando formato de hora incorrecto...');
      try {
        await axios.put(
          `http://localhost:5000/api/import/schedule/${scheduleId}`,
          { startTime: '25:70' },
          { headers }
        );
        console.log('❌ Error: Debería haber rechazado formato inválido');
      } catch (error) {
        console.log('✅ Formato de hora inválido rechazado correctamente:', error.response.data.message);
      }
      
      // Prueba 5: Eliminar programación de prueba
      console.log('\n📅 Prueba 5: Eliminando programación de prueba...');
      await axios.delete(`http://localhost:5000/api/import/schedule/${scheduleId}`, { headers });
      console.log('✅ Programación eliminada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en las pruebas:', error.response?.data || error.message);
    }

    // Limpiar usuario de prueba
    console.log('\n🧹 Limpiando usuario de prueba...');
    await db.delete(users).where(eq(users.email, testEmail));
    console.log('✅ Usuario de prueba eliminado');

    console.log('\n🎉 Pruebas de startTime completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error general en las pruebas:', error.message);
  }
}

// Ejecutar pruebas
testStartTimeImport().catch(console.error);