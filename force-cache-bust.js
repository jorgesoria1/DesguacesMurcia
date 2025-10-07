#!/usr/bin/env node
/**
 * Fuerza la actualización de caché añadiendo timestamps únicos
 */

import fs from 'fs';
import path from 'path';

const distPath = path.resolve(process.cwd(), 'dist/public');
const indexPath = path.join(distPath, 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  // Agregar timestamp único a todos los assets
  const timestamp = Date.now();
  
  // Reemplazar referencias a archivos JS y CSS con timestamp
  html = html.replace(/src="\/assets\/(.*?)\.js"/g, `src="/assets/$1.js?v=${timestamp}"`);
  html = html.replace(/href="\/assets\/(.*?)\.css"/g, `href="/assets/$1.css?v=${timestamp}"`);
  
  fs.writeFileSync(indexPath, html);
  console.log('🔄 Cache-busting aplicado con timestamp:', timestamp);
} else {
  console.log('❌ Archivo index.html no encontrado en:', indexPath);
}