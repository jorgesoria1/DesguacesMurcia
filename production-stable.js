#!/usr/bin/env node
/**
 * Production stable launcher - NO AUTO-RESTART for scheduler stability
 * DEPLOYMENT OPTIMIZED: For systems requiring persistent background services
 */

process.env.NODE_ENV = 'production';
const port = process.env.PORT || 5000;

console.log('🚀 Stable Production Server Starting...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${port}`);
console.log('⚠️  NO AUTO-RESTART MODE - For scheduler stability');

// Start the stable TypeScript application
async function startApplication() {
  try {
    console.log('⚡ Starting stable server for continuous operation...');
    
    // Use TSX to run the server without auto-restart
    const { spawn } = await import('child_process');
    
    const tsxProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: port
      },
      stdio: 'inherit'
    });

    tsxProcess.on('error', (error) => {
      console.error('❌ Failed to start stable server:', error);
      process.exit(1);
    });

    tsxProcess.on('close', (code) => {
      console.log(`🔄 Server process exited with code ${code}`);
      if (code !== 0) {
        console.log(`❌ Server crashed - Manual restart required for stability`);
        console.log(`💡 Check logs and restart manually to avoid scheduler interruption`);
        process.exit(code);
      } else {
        console.log(`✅ Server exited gracefully`);
        process.exit(0);
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