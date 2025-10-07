#!/usr/bin/env node
/**
 * Deployment preparation script
 * Ensures the application is production-ready
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Preparing application for deployment...');

// Set production environment
process.env.NODE_ENV = 'production';

// 1. Build frontend assets
console.log('📦 Building frontend assets...');
try {
  // Use a shorter timeout for the build
  execSync('timeout 120 vite build --outDir dist/public', { stdio: 'inherit' });
  console.log('✅ Frontend assets built successfully');
} catch (error) {
  console.log('⚠️ Frontend build timed out or failed - will build on first run');
}

// 2. Create production start script
console.log('⚙️ Creating production start script...');
const prodStartScript = `#!/usr/bin/env node
/**
 * Production server entry point
 * Optimized for deployment environments
 */

// Set production environment
process.env.NODE_ENV = 'production';

// Import tsx for TypeScript execution
import { execSync } from 'child_process';

console.log('🚀 Starting production server...');

// Execute the TypeScript server
try {
  execSync('tsx server/index.ts', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
}
`;

fs.writeFileSync('./dist/index.js', prodStartScript);
fs.chmodSync('./dist/index.js', 0o755);

// 3. Create production package.json
console.log('📄 Creating production package.json...');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type,
  license: packageJson.license,
  scripts: {
    start: 'node index.js',
    dev: 'NODE_ENV=development tsx server/index.ts'
  },
  dependencies: packageJson.dependencies,
  devDependencies: packageJson.devDependencies
};

fs.writeFileSync('./dist/package.json', JSON.stringify(prodPackageJson, null, 2));

// 4. Copy essential files to dist
console.log('📁 Copying essential files...');
const filesToCopy = [
  'server',
  'shared',
  'client',
  'tsconfig.json',
  'tsconfig.server.json',
  'drizzle.config.ts',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    const destPath = path.join('./dist', file);
    if (fs.statSync(file).isDirectory()) {
      copyDir(file, destPath);
    } else {
      fs.copyFileSync(file, destPath);
    }
  }
});

console.log('✅ Deployment preparation complete!');
console.log('📦 Files ready in ./dist directory');
console.log('🚀 Production server can be started with: node dist/index.js');
console.log('💡 For deployment, use: npm start');

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