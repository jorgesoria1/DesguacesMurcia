// Verificar configuración de deploy
console.log('🔍 VERIFICANDO CONFIGURACIÓN DE DEPLOY');
console.log('');

// Variables de entorno importantes
const envVars = {
  'NODE_ENV': process.env.NODE_ENV,
  'PORT': process.env.PORT,
  'DATABASE_URL': process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA',
  'SESSION_SECRET': process.env.SESSION_SECRET ? 'CONFIGURADA' : 'NO CONFIGURADA'
};

console.log('📋 Variables de Entorno:');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log('');
console.log('🔧 Archivos de Configuración:');

import fs from 'fs';

// Verificar .replit
if (fs.existsSync('.replit')) {
  console.log('  ✅ .replit existe');
} else {
  console.log('  ❌ .replit NO existe');
}

// Verificar production-config.js
if (fs.existsSync('production-config.js')) {
  console.log('  ✅ production-config.js existe');
} else {
  console.log('  ❌ production-config.js NO existe');
}

// Verificar server/minimal-server.ts
if (fs.existsSync('server/minimal-server.ts')) {
  console.log('  ✅ server/minimal-server.ts existe');
} else {
  console.log('  ❌ server/minimal-server.ts NO existe');
}

console.log('');
console.log('🌐 Configuración de Red:');

// Verificar conexión de base de datos
async function testDatabaseConnection() {
  try {
    const { pool } = await import('./server/db.js');
    const result = await pool.query('SELECT 1 as test');
    console.log('  ✅ Conexión de base de datos: OK');
    return true;
  } catch (error) {
    console.log('  ❌ Conexión de base de datos: ERROR -', error.message);
    return false;
  }
}

// Ejecutar verificaciones
testDatabaseConnection().then(() => {
  console.log('');
  console.log('🏁 VERIFICACIÓN COMPLETA');
});