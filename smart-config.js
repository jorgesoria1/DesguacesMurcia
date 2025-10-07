#!/usr/bin/env node
/**
 * Smart configuration for Replit
 * Automatically detects development vs deployment environment
 * Uses development mode in workspace, production mode in deployment
 */

// Smart detection: Force development in workspace, production in deployment
const isDeveloperWorkspace = !process.env.REPLIT_DEPLOYMENT && !process.env.REPL_DEPLOYMENT;
const isDeployment = process.env.REPLIT_DEPLOYMENT === '1' || process.env.REPL_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';

// Override: In Replit workspace, always use development unless explicitly production
const isWorkspace = isDeveloperWorkspace;

console.log('🤖 Smart Config Starting...');
console.log(`📍 Environment Detection:`);
console.log(`   - REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT || 'undefined'}`);
console.log(`   - REPL_DEPLOYMENT: ${process.env.REPL_DEPLOYMENT || 'undefined'}`);
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   - isDeveloperWorkspace: ${isDeveloperWorkspace}`);
console.log(`   - isDeployment: ${isDeployment}`);
console.log(`   - isWorkspace: ${isWorkspace}`);
console.log(`   - Detected Mode: ${isWorkspace ? 'WORKSPACE (Development)' : 'DEPLOYMENT (Production)'}`);

if (!isWorkspace) {
  console.log('🚀 Starting in PRODUCTION mode for deployment...');
  // Set production environment
  process.env.NODE_ENV = 'production';
  
  // Import and run production config
  import('./production-config.js').then(() => {
    console.log('✅ Production configuration loaded');
  }).catch(error => {
    console.error('❌ Failed to load production config:', error);
    process.exit(1);
  });
} else {
  console.log('🔧 Starting in DEVELOPMENT mode for workspace...');
  // Set development environment
  process.env.NODE_ENV = 'development';
  
  // Import and run development config
  import('./development-config.js').then(() => {
    console.log('✅ Development configuration loaded');
  }).catch(error => {
    console.error('❌ Failed to load development config:', error);
    process.exit(1);
  });
}