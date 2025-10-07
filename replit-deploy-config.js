// Configuración específica para deploy de Replit
import express from "express";
import { createServer } from "http";
import { setupVite } from "./server/vite.js";
import { registerRoutes } from "./server/routes.js";

const app = express();

// Health check endpoint - CRÍTICO para deploy
app.get("/health", (_req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    deploy: "replit" 
  });
});

// Middleware básico
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// CORS específico para deploy de Replit
app.use((req, res, next) => {
  // Para deploy de Replit, ser más permisivo con CORS
  const origin = req.headers.origin;
  
  // Permitir todos los dominios de Replit
  if (origin && (origin.includes('.replit.app') || origin.includes('.repl.co') || origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Set-Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Headers adicionales para deploy
app.use((req, res, next) => {
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-Content-Type-Options', 'nosniff');
  next();
});

async function startReplitDeploy() {
  try {
    console.log('🚀 INICIANDO SERVIDOR PARA DEPLOY DE REPLIT');
    
    const server = createServer(app);
    
    // Registrar rutas API ANTES que Vite
    console.log('📡 Registrando rutas API...');
    await registerRoutes(app);
    console.log('✅ Rutas API registradas');
    
    // Setup Vite para frontend - DEBE IR AL FINAL
    console.log('🎨 Configurando Vite para frontend...');
    await setupVite(app, server);
    console.log('✅ Vite configurado');
    
    const port = parseInt(process.env.PORT || '5000', 10);
    
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ SERVIDOR DE DEPLOY REPLIT EJECUTÁNDOSE`);
      console.log(`🌐 URL: http://0.0.0.0:${port}`);
      console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
      console.log(`🔐 Admin: http://0.0.0.0:${port}/admin`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Error handling
    server.on('error', (error) => {
      console.error('❌ Error del servidor:', error);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('❌ Excepción no capturada:', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promesa rechazada no manejada:', reason);
    });
    
    return server;
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor de deploy:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startReplitDeploy().catch(console.error);

export { app };