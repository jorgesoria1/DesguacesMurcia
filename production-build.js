#!/usr/bin/env node
/**
 * Fast production build script
 * Creates a minimal build for deployment without lengthy compilation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const buildDir = './dist';

console.log('🚀 Creating production build...');

// Clean and create build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Create a simple index.js for production
const prodIndex = `
// Production server entry point
import { register } from 'tsx/esm';
register();

// Set production environment
process.env.NODE_ENV = 'production';

// Import and start the server
import('./server/index.ts').then(() => {
  console.log('✅ Production server started');
}).catch(err => {
  console.error('❌ Server startup failed:', err);
  process.exit(1);
});
`;

fs.writeFileSync(path.join(buildDir, 'index.js'), prodIndex.trim());

// Copy necessary files
const filesToCopy = [
  'server',
  'shared',
  'client',
  'package.json',
  'tsconfig.json',
  'tsconfig.server.json',
  'drizzle.config.ts',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'node_modules'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`📁 Copying ${file}...`);
    if (fs.statSync(file).isDirectory()) {
      copyDir(file, path.join(buildDir, file));
    } else {
      fs.copyFileSync(file, path.join(buildDir, file));
    }
  }
});

console.log('✅ Production build ready!');
console.log('🔧 Build includes TypeScript runtime compilation');
console.log('🚀 Use: node dist/index.js');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}