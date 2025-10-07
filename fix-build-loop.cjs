/**
 * Fix the infinite build loop issue
 * The problem is in package.json build command calling itself recursively
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing infinite build loop...');

// Fix package.json build command
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Original build command that's causing the loop
console.log('Current build command:', packageJson.scripts.build);

// Fix the build command - remove recursive call
packageJson.scripts.build = 'vite build && tsc --noEmit --skipLibCheck';

// Also ensure we have a proper start command for deployment
packageJson.scripts.start = 'node production-config.js';

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ Fixed build command:', packageJson.scripts.build);
console.log('✅ Fixed start command:', packageJson.scripts.start);
console.log('🎉 Build loop fixed - ready for deployment!');