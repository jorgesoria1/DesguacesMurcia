#!/usr/bin/env node
/**
 * Sistema de compilación automática
 * Observa cambios en el código y recompila automáticamente
 */

import { spawn } from 'child_process';
import { watch } from 'fs';
import path from 'path';

let buildProcess = null;
let isBuilding = false;
let buildQueue = false;

console.log('🔧 Auto-build watcher iniciado');
console.log('📁 Observando cambios en client/src/...');

function runBuild() {
  if (isBuilding) {
    buildQueue = true;
    return;
  }

  isBuilding = true;
  console.log('🔄 Ejecutando npm run build...');

  buildProcess = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true
  });

  buildProcess.on('close', (code) => {
    isBuilding = false;
    if (code === 0) {
      console.log('✅ Build completado exitosamente');
      
      // Sincronizar archivos desde dist/public a server/public
      try {
        const syncProcess = spawn('cp', ['-r', 'dist/public/.', 'server/public/'], { shell: true });
        syncProcess.on('close', (syncCode) => {
          if (syncCode === 0) {
            console.log('🔄 Archivos sincronizados a server/public exitosamente');
          } else {
            console.log('⚠️ Error en sincronización, código:', syncCode);
          }
        });
      } catch (error) {
        console.log('⚠️ Error sincronizando archivos:', error.message);
      }
    } else {
      console.log('❌ Build falló con código:', code);
    }

    // Si hay una compilación en cola, ejecutarla
    if (buildQueue) {
      buildQueue = false;
      setTimeout(runBuild, 1000); // Esperar 1 segundo antes de recompilar
    }
  });

  buildProcess.on('error', (error) => {
    console.error('❌ Error en build:', error);
    isBuilding = false;
  });
}

// Observar cambios en el directorio client/src
const clientSrcPath = path.resolve(process.cwd(), 'client/src');
const sharedPath = path.resolve(process.cwd(), 'shared');

console.log('👁️  Observando:', clientSrcPath);
console.log('👁️  Observando:', sharedPath);

// Compilación inicial
runBuild();

// Observar cambios en client/src
watch(clientSrcPath, { recursive: true }, (eventType, filename) => {
  if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts') || filename.endsWith('.css'))) {
    console.log(`📝 Cambio detectado: ${filename}`);
    runBuild();
  }
});

// Observar cambios en shared
watch(sharedPath, { recursive: true }, (eventType, filename) => {
  if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts'))) {
    console.log(`📝 Cambio detectado en shared: ${filename}`);
    runBuild();
  }
});

// Manejo de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando auto-build watcher...');
  if (buildProcess) {
    buildProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando auto-build watcher...');
  if (buildProcess) {
    buildProcess.kill('SIGINT');
  }
  process.exit(0);
});