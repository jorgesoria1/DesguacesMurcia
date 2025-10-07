#!/usr/bin/env node
/**
 * Verificador de estado de sincronización
 * Comprueba que los archivos compilados estén correctamente sincronizados
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando estado de sincronización de archivos...');

const distIndexPath = path.resolve('dist/public/index.html');
const serverIndexPath = path.resolve('server/public/index.html');

function extractHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/index-([a-zA-Z0-9_-]+)\.js/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

// Verificar archivos HTML
const distExists = checkFileExists(distIndexPath);
const serverExists = checkFileExists(serverIndexPath);

console.log(`📂 dist/public/index.html: ${distExists ? '✅ Existe' : '❌ No existe'}`);
console.log(`📂 server/public/index.html: ${serverExists ? '✅ Existe' : '❌ No existe'}`);

if (!distExists) {
  console.log('❌ ERROR: Archivos compilados no encontrados. Ejecuta "npm run build"');
  process.exit(1);
}

if (!serverExists) {
  console.log('❌ ERROR: Archivos de servidor no sincronizados. Ejecuta "./sync-build-files.sh"');
  process.exit(1);
}

// Comparar hashes
const distHash = extractHash(distIndexPath);
const serverHash = extractHash(serverIndexPath);

console.log(`🔑 Hash en dist/public: ${distHash || 'No encontrado'}`);
console.log(`🔑 Hash en server/public: ${serverHash || 'No encontrado'}`);

if (distHash && serverHash && distHash === serverHash) {
  console.log('✅ SINCRONIZACIÓN CORRECTA: Los archivos están actualizados');
  
  // Verificar que el archivo JS existe
  const jsFile = path.resolve(`server/public/assets/index-${serverHash}.js`);
  if (checkFileExists(jsFile)) {
    console.log('✅ Archivo JavaScript compilado encontrado y accesible');
  } else {
    console.log('⚠️ ADVERTENCIA: Archivo JavaScript no encontrado en assets/');
  }
  
  process.exit(0);
} else {
  console.log('❌ DESINCRONIZACIÓN DETECTADA: Los archivos no coinciden');
  console.log('💡 Solución: Ejecuta "./sync-build-files.sh" para sincronizar');
  process.exit(1);
}