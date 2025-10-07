#!/usr/bin/env node
/**
 * Production server optimized for Replit deployment
 * Fixed version that properly serves static frontend files
 */

const express = require('express');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure production environment
process.env.NODE_ENV = 'production';

console.log('🚀 Iniciando servidor de producción optimizado...');

// Build frontend first
console.log('📦 Construyendo frontend...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend construido exitosamente');
} catch (error) {
  console.error('❌ Error construyendo frontend:', error.message);
  process.exit(1);
}

// Serve static files from dist
const distPath = path.join(__dirname, 'dist');
console.log(`📁 Sirviendo archivos estáticos desde: ${distPath}`);

app.use(express.static(distPath));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Import and setup backend routes
async function setupRoutes() {
  try {
    // Import tsx to handle TypeScript
    const { default: { compile } } = await import('tsx/esm');
    
    // Import backend routes
    const { registerRoutes } = await import('./server/routes.js');
    
    // Register API routes
    registerRoutes(app);
    
    // Serve frontend for all other routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    console.log('✅ Rutas configuradas correctamente');
    
  } catch (error) {
    console.error('❌ Error configurando rutas:', error.message);
    
    // Fallback: serve only static files
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Start server
async function startServer() {
  await setupRoutes();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌟 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📱 Aplicación disponible en: http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('❌ Error iniciando servidor:', error);
  process.exit(1);
});