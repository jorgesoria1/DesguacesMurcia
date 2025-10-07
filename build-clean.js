#!/usr/bin/env node
/**
 * Clean build script - removes any platform-specific references from production build
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧹 Building clean production version...');

// Run the build
execSync('npm run build', { stdio: 'inherit' });

// Clean any potential references in the built files
const distDir = 'dist/public';
const jsFiles = fs.readdirSync(path.join(distDir, 'assets'))
  .filter(file => file.endsWith('.js'));

for (const file of jsFiles) {
  const filePath = path.join(distDir, 'assets', file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace any potential platform references with generic ones
  content = content.replace(/replit\.app/g, 'app-domain.com');
  content = content.replace(/REPL_ID/g, 'APP_ID');
  content = content.replace(/replit/gi, 'platform');
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Cleaned ${file}`);
}

console.log('🎉 Clean build completed - no platform references in frontend');