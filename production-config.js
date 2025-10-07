#!/usr/bin/env node
/**
 * Production Configuration
 * Detects environment and launches appropriate server mode
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment detection for deployment
const isDevelopmentWorkspace = process.env.NODE_ENV !== 'production' && !process.env.CLOUD_DEPLOYMENT;
const isLocalDevelopment = false;
const isRealDeployment = process.env.REPL_DEPLOYMENT === '1' || process.env.REPL_PUBKEYS;

// Force production mode for deployment
const forceProductionMode = true;

console.log('🔧 DEPLOY CONFIG: Environment detection:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- CLOUD_DEPLOYMENT:', process.env.CLOUD_DEPLOYMENT);
console.log('- isDevelopmentWorkspace:', isDevelopmentWorkspace);
console.log('- forceProductionMode:', forceProductionMode);

if ((isDevelopmentWorkspace || isLocalDevelopment) && !forceProductionMode) {
  
  // Configurar entorno de desarrollo
  process.env.NODE_ENV = 'development';
  delete process.env.CLOUD_DEPLOYMENT;
  
  // Importar desarrollo usando simple starter
  import('./simple-dev-start.js');
  
} else {
  
  console.log('🚀 DEPLOY CONFIG: Starting PRODUCTION mode');
  console.log('📍 Is Real Deployment:', isRealDeployment);
  console.log('📍 Is Dev Workspace:', isDevelopmentWorkspace);
  
  // Set production environment
  process.env.NODE_ENV = 'production';
  process.env.CLOUD_DEPLOYMENT = 'true';
  process.env.PORT = process.env.PORT || '5000';
  
  console.log('✅ DEPLOY CONFIG: Environment set to production');
  console.log('✅ Port configured:', process.env.PORT);
  
  // For real deployments, skip sync and auto-build (files are already built)
  if (isRealDeployment) {
    console.log('🎯 Real deployment detected - starting server directly');
  } else {
    // Check if build exists (dev workspace)
    const distPath = join(__dirname, 'dist', 'public');
    const buildExists = fs.existsSync(distPath);
    
    if (!buildExists) {
      console.log('⚠️  Build directory not found, deployment build may still be running...');
    } else {
      console.log('✅ Build directory found');
    }
    
    // Sync build files if available (non-blocking, dev workspace only)
    if (fs.existsSync(join(__dirname, 'deploy-sync.js'))) {
      console.log('📋 DEPLOY CONFIG: Syncing build files to server/public...');
      const syncProcess = spawn('node', ['deploy-sync.js'], {
        stdio: 'inherit',
        timeout: 10000
      });
      
      syncProcess.on('error', (error) => {
        console.warn('⚠️  Sync process error (continuing anyway):', error.message);
      });
    }
  }
  
  // Start auto-build watcher in background (dev workspace only, not in real deployment)
  let autoBuildWatcher = null;
  if (!isRealDeployment && isDevelopmentWorkspace && fs.existsSync(join(__dirname, 'auto-build-watch.js'))) {
    console.log('🔧 Starting auto-build watcher...');
    autoBuildWatcher = spawn('node', ['auto-build-watch.js'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      detached: false
    });
    
    autoBuildWatcher.on('error', (error) => {
      console.warn('⚠️  Auto-build watcher error (continuing anyway):', error.message);
    });
  }
  
  // Start production server with tsx
  console.log('🚀 Starting production server on port', process.env.PORT);
  const productionServer = spawn('npx', ['tsx', 'server/minimal-server.ts'], {
    env: process.env,
    stdio: 'inherit'
  });

  productionServer.on('error', (error) => {
    console.error('❌ Failed to start production server:', error);
    if (autoBuildWatcher) autoBuildWatcher.kill();
    process.exit(1);
  });

  productionServer.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Production server exited with code ${code}`);
    }
    if (autoBuildWatcher) autoBuildWatcher.kill();
    if (code !== 0 && code !== null) {
      process.exit(code);
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    if (autoBuildWatcher) autoBuildWatcher.kill('SIGTERM');
    productionServer.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    if (autoBuildWatcher) autoBuildWatcher.kill('SIGINT');
    productionServer.kill('SIGINT');
  });
}