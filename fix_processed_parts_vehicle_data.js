#!/usr/bin/env node

// Script para corregir datos de vehículo en piezas procesadas
// Ejecuta la corrección automática de datos de vehículo usando el PartsVehicleUpdater

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 Iniciando corrección automática de datos de vehículo en piezas procesadas...');

// Ejecutar el script de corrección usando tsx
const scriptPath = path.join(__dirname, 'server', 'services', 'parts-vehicle-updater.ts');

exec(`npx tsx ${scriptPath}`, { 
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'development' }
}, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error ejecutando corrección:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️ Advertencias:', stderr);
  }
  
  console.log('📋 Salida de corrección:');
  console.log(stdout);
  
  console.log('✅ Corrección automática completada');
});