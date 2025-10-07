#!/usr/bin/env node
/**
 * Production configuration launcher for Replit
 * DEPLOYMENT OPTIMIZED: Instant health check response for deployment platform
 */

// Set production environment if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}
const basePort = parseInt(process.env.PORT || '5000', 10);

console.log('🚀 Deployment-Optimized Server Starting...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Base Port: ${basePort}`);

// Check if port is available before starting
async function findAvailablePort(startPort) {
  const net = await import('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(startPort, '0.0.0.0', () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', () => {
      // Port is in use, try next one
      findAvailablePort(startPort + 1).then(resolve);
    });
  });
}

// Kill any existing processes on the target port
async function cleanupExistingProcesses() {
  try {
    const { exec } = await import('child_process');
    
    // Kill any existing tsx processes for this server
    exec('pkill -f "tsx.*server/index.ts"', (error) => {
      if (error && !error.message.includes('No such process')) {
        console.log('🧹 Cleaned up existing server processes');
      }
    });
    
    // Brief delay to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.log('⚠️ Process cleanup completed');
  }
}

// Start the deployment-optimized TypeScript application
async function startApplication() {
  try {
    console.log('🧹 Cleaning up any existing processes...');
    await cleanupExistingProcesses();
    
    console.log('🔍 Using configured port...');
    const availablePort = basePort;
    
    console.log(`⚡ Starting deployment-ready server on port ${availablePort}...`);
    
    // Basic deployment configuration
    
    // Use TSX to run the deployment-optimized server
    const { spawn } = await import('child_process');
    
    const tsxProcess = spawn('npx', ['tsx', 'server/minimal-server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: availablePort,
        DISABLE_BACKGROUND_SERVICES: 'true'
      },
      stdio: 'inherit'
    });

    tsxProcess.on('error', (error) => {
      console.error('❌ Failed to start deployment-ready server:', error);
      process.exit(1);
    });

    tsxProcess.on('close', (code) => {
      console.log(`🔄 Server process exited with code ${code}`);
      if (code !== 0) {
        console.log(`❌ Server crashed, not restarting to prevent loops`);
        process.exit(1);
      } else {
        console.log(`✅ Server exited gracefully`);
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
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start immediately
startApplication();