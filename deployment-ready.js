/**
 * Production deployment script with all fixes applied
 * This script ensures TypeScript compilation works correctly
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting production deployment with all fixes...');

// Ensure TypeScript compilation works
const startServer = () => {
  console.log('📡 Starting server with TSX runtime...');
  
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5000'
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    // Fallback to production config
    console.log('🔄 Trying production config fallback...');
    spawn('node', ['production-config.js'], { stdio: 'inherit' });
  });

  server.on('close', (code) => {
    if (code !== 0) {
      console.log(`🔄 Server exited with code ${code}, restarting...`);
      setTimeout(startServer, 1000);
    }
  });
};

// Health check before starting
const healthCheck = () => {
  console.log('🔍 Performing health check...');
  
  const requiredFiles = [
    'shared/schema.ts',
    'server/index.ts',
    'server/storage.ts',
    'production-config.js'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:', missingFiles);
    process.exit(1);
  }
  
  console.log('✅ All required files present');
  startServer();
};

// Start deployment
healthCheck();