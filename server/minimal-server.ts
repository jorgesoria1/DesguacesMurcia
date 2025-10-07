import express from "express";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import { registerRoutes } from "./routes";
import { pool } from "./db"; // Para validaciones del scheduler
// SEO middleware removido - solo usar hooks cliente

const app = express();

// Health check endpoint - must be first
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// SEO middleware will be registered AFTER static serving to override catch-all

// CORS configuration with credentials for deployment
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow trusted domains and localhost
  const trustedDomains = ['localhost', '.app', '.com'];
  if (origin && trustedDomains.some(domain => origin.includes(domain))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

async function startServer() {
  try {
    const server = createServer(app);
    
    // SEO middleware removido - solo usar hooks cliente

    // Register all API routes AFTER SEO routes  
    console.log('Registering API routes...');
    await registerRoutes(app);
    console.log('✅ API routes registered successfully');

    // Setup frontend serving based on environment
    if (process.env.NODE_ENV === 'production') {
      console.log('Setting up static file serving...');
      serveStatic(app);
      console.log('✅ Static files configured');
    } else {
      console.log('Setting up Vite development server...');
      await setupVite(app, server);
      console.log('✅ Vite development server configured');
    }
    
    const port = parseInt(process.env.PORT || '5000', 10);

    return new Promise((resolve, reject) => {
      let portRetries = 0;
      const maxPortRetries = 3;

      const attemptListen = () => {
        server.listen(port, "0.0.0.0", () => {
          console.log(`✅ Server running on port ${port}`);
          console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
          resolve(server);
        });
      };

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          portRetries++;
          if (portRetries <= maxPortRetries) {
            console.error(`❌ Port ${port} is already in use (attempt ${portRetries}/${maxPortRetries})`);
            console.log('💡 Retrying in 2 seconds...');
            setTimeout(() => {
              server.close();
              attemptListen();
            }, 2000);
          } else {
            console.error(`❌ Port ${port} remained occupied after ${maxPortRetries} attempts`);
            reject(new Error(`EADDRINUSE: Port ${port} is not available`));
          }
        } else {
          console.error('❌ Server error:', err);
          reject(err);
        }
      });

      attemptListen();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    throw error;
  }
}

// Función de inicialización del scheduler con reintentos
async function initializeSchedulerWithRetry(retryCount = 0): Promise<void> {
  const maxRetries = 3;
  
  if (retryCount >= maxRetries) {
    console.error("❌ Máximo de reintentos alcanzado para inicializar scheduler. Sistema continuará sin programaciones automáticas.");
    return;
  }
  
  try {
    console.log(`🔄 Intento ${retryCount + 1}/${maxRetries} de inicialización del scheduler...`);
    
    // Validar recursos críticos
    await pool.query('SELECT 1');
    
    const { simpleScheduler } = await import("./services/simple-scheduler");
    
    // Verificar que el scheduler no esté ya inicializado
    if (simpleScheduler.initialized) {
      console.log("ℹ️ Scheduler ya estaba inicializado, omitiendo...");
      return;
    }
    
    await simpleScheduler.initialize();
    console.log("✅ Scheduler inicializado exitosamente en reintento");
    (global as any).importScheduler = simpleScheduler;
    
    // Recuperar programaciones pendientes
    await simpleScheduler.updateObsoleteSchedules();
    console.log("🎯 Scheduler completamente operativo tras reintento");
    
  } catch (error) {
    console.error(`❌ Error en intento ${retryCount + 1} de inicialización:`, error);
    
    if (retryCount < maxRetries - 1) {
      const delay = Math.pow(2, retryCount) * 5000; // Backoff exponencial: 5s, 10s, 20s
      console.log(`⏳ Esperando ${delay/1000}s antes del próximo intento...`);
      setTimeout(() => initializeSchedulerWithRetry(retryCount + 1), delay);
    }
  }
}

// Inicializar servicios en segundo plano después del servidor
async function initializeBackgroundServices() {
  console.log("🔄 Iniciando servicios en segundo plano...");
  
  // Initialize scheduler early with improved robustness - CRÍTICO PARA PROGRAMACIONES
  if (!process.env.DISABLE_BACKGROUND_SERVICES) {
    setTimeout(async () => {
      try {
        console.log("🔄 Iniciando inicialización temprana del scheduler...");
        
        // Pre-validación de configuración crítica
        try {
          await pool.query('SELECT 1');
          console.log("✅ Base de datos verificada para scheduler");
        } catch (dbError) {
          console.warn("⚠️ Base de datos no disponible aún, reintentando scheduler en 10s...");
          setTimeout(() => initializeSchedulerWithRetry(), 10000);
          return;
        }
        
        const { simpleScheduler } = await import("./services/simple-scheduler");
        await simpleScheduler.initialize();
        console.log("✅ Scheduler de importaciones inicializado exitosamente");
        (global as any).importScheduler = simpleScheduler;
        
        // Verificar y recuperar programaciones perdidas
        console.log("🔍 Verificando programaciones vencidas al inicio...");
        await simpleScheduler.updateObsoleteSchedules();
        
        console.log("🎯 Sistema de programaciones completamente operativo");
        
      } catch (err) {
        console.error("❌ Error crítico en inicialización del scheduler:", err);
        
        // Reintentar una sola vez tras 15 segundos
        console.log("🔄 Reintentando inicialización del scheduler en 15 segundos...");
        setTimeout(() => initializeSchedulerWithRetry(), 15000);
      }
    }, 2000); // Inicializar después de 2 segundos
  } else {
    console.log("🚫 Background services (scheduler) disabled for stability");
  }
}

// Start the server
startServer().then(() => {
  // Inicializar servicios después de que el servidor esté listo
  initializeBackgroundServices();
}).catch(console.error);

export { app };