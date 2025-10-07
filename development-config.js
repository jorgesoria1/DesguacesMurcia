#!/usr/bin/env node
/**
 * Development configuration for Replit with hot reload
 */

// Set development environment if not already set  
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
const basePort = parseInt(process.env.PORT || '80', 10);

console.log('🔧 Development Server Starting with Hot Reload...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Base Port: ${basePort}`);

// Kill any existing processes
async function cleanupExistingProcesses() {
  try {
    const { exec } = await import('child_process');
    
    exec('pkill -f "tsx.*server"', (error) => {
      if (error && !error.message.includes('No such process')) {
        console.log('🧹 Cleaned up existing server processes');
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.log('⚠️ Process cleanup completed');
  }
}

// Start development server
async function startDevelopmentServer() {
  try {
    console.log('🧹 Cleaning up any existing processes...');
    await cleanupExistingProcesses();
    
    console.log(`⚡ Starting development server with hot reload on port ${basePort}...`);
    
    const { spawn } = await import('child_process');
    
    const tsxProcess = spawn('npx', ['tsx', '--no-warnings', 'server/index.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: basePort.toString(),
        TSX_TSCONFIG_PATH: './tsconfig.json'
      },
      stdio: 'inherit',
      cwd: process.cwd()
    });

    tsxProcess.on('error', (error) => {
      console.error('❌ Failed to start development server:', error);
      console.log('🔄 Attempting to restart in 3 seconds...');
      setTimeout(startDevelopmentServer, 3000);
    });

    tsxProcess.on('close', (code) => {
      console.log(`🔄 Development server exited with code ${code}`);
      if (code !== 0 && code !== null) {
        console.log(`❌ Server crashed with error code ${code}, restarting...`);
        setTimeout(startDevelopmentServer, 3000);
      } else if (code === null) {
        console.log('⚠️ Server process terminated unexpectedly, restarting...');
        setTimeout(startDevelopmentServer, 3000);
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully');
      tsxProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully');
      tsxProcess.kill('SIGINT');
    });

  } catch (error) {
    console.error('❌ Failed to start development server:', error);
    process.exit(1);
  }
}

// Start immediately
startDevelopmentServer();