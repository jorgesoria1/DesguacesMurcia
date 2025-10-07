#!/usr/bin/env node
/**
 * Build and Copy Script for Deployment
 * Ensures static assets are in the correct location for production
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { copyFile, readdir, stat } from 'fs/promises';
import path from 'path';

console.log('🔨 Starting build and copy process...');

// Function to copy directory recursively
async function copyDirectory(src, dest) {
  try {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    const entries = await readdir(src);
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      const stats = await stat(srcPath);
      
      if (stats.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error('Error copying directory:', error);
  }
}

// Run build process
console.log('📦 Running build...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit'
});

buildProcess.on('close', async (code) => {
  if (code !== 0) {
    console.error('❌ Build failed with code:', code);
    process.exit(1);
  }
  
  console.log('✅ Build completed successfully');
  
  // Copy assets to server/public for production serving
  console.log('📂 Copying assets to server/public...');
  
  try {
    const srcDir = path.resolve('dist/public');
    const destDir = path.resolve('server/public');
    
    if (existsSync(srcDir)) {
      await copyDirectory(srcDir, destDir);
      console.log('✅ Assets copied successfully');
    } else {
      console.error('❌ Source directory not found:', srcDir);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error copying assets:', error);
    process.exit(1);
  }
  
  console.log('🎉 Build and copy process completed!');
});