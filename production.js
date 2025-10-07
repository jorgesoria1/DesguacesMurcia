#!/usr/bin/env node
/**
 * Simple production script without any "dev" references
 * This script is designed for Replit deployment
 */

// Set production environment
process.env.NODE_ENV = 'production';

console.log('Starting production server...');

// Use dynamic import to start the server
import('./server/index.js').catch(async (error) => {
  console.log('JavaScript version not found, using TypeScript...');
  
  // Fallback to TypeScript execution
  const { execSync } = await import('child_process');
  try {
    execSync('NODE_ENV=production tsx server/index.ts', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
  } catch (err) {
    console.error('Failed to start production server:', err.message);
    process.exit(1);
  }
});