import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeGuestCart } from "./guest-cart";
import { pool } from "./db"; // Import pool for database connectivity test
// import { registerOptimizedPartsRoutes } from "./api/optimized-parts"; // DESACTIVADO - Usando versión corregida
import { registerBrandSpecificRoutes } from "./api/brand-routes";
import { registerPartsBrandsModelsRoutes } from "./api/parts-brands-models";
import { registerRelationsDiagnosticRoutes } from "./api/relations-diagnostic";
import { registerUploadRoutes } from "./api/upload-routes";
import { registerImageUploadRoutes } from "./api/image-upload-routes";
import uploadRouter from "./routes/upload";
import MemoryStore from "memorystore";

/**
 * Servidor principal con todas las funcionalidades integradas
 */

// Basic error handling for production

// Inicializar el servicio de email
async function initializeEmailService() {
  try {
    const { emailService } = await import('./services/email');
    await emailService.initialize();
    console.log('Servicio de correos inicializado correctamente');
  } catch (error) {
    console.error('Error inicializando el servicio de correos:', error);
  }
}

// FUNCIÓN DESHABILITADA (30/07/2025): La limpieza automática se ha eliminado completamente del sistema
// para preservar la integridad del catálogo de piezas procesadas según instrucciones del usuario
async function executeInitialCleanup() {
  try {
    console.log("🔧 Ejecutando limpieza inicial de piezas con precio inválido...");
    // DESHABILITADO: No ejecutar limpieza automática de piezas
    // const { disableZeroPriceParts } = await import('./utils/disable-zero-price-parts');
    // const result = await disableZeroPriceParts();
    console.log(`✅ Limpieza inicial completada: 0 piezas desactivadas`);
    console.log("ℹ️ La limpieza automática ha sido deshabilitada para preservar piezas procesadas");
  } catch (error) {
    console.error("❌ Error en la limpieza inicial:", error);
    console.log("⚠️ Continuando con la inicialización del servidor...");
  }
}

const app = express();

// CRITICAL: Health check endpoint must be first - IMMEDIATE response required for deployment
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// COMPRESSION & CACHING - APPLIED BEFORE EVERYTHING ELSE
const { aggressiveCompression, aggressiveCaching } = await import('./middleware/compression');
app.use(aggressiveCompression);
app.use(aggressiveCaching);
console.log('✅ Aggressive compression and caching applied');

// UNIVERSAL META TAGS - DISABLED FOR SCHEDULER FIX
// This ensures ALL users get dynamic meta tags in HTML source
// const { universalMetaMiddleware } = await import('./middleware/universal-meta');
// app.use(universalMetaMiddleware);
console.log('✅ Universal meta middleware temporarily disabled for scheduler initialization');

// Root endpoint removed - will be handled by Vite for frontend serving

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// APLICAR MIDDLEWARE DE MANTENIMIENTO MUY TEMPRANO
console.log("🔧 Loading maintenance middleware at startup...");
import('./middleware/maintenance-middleware-fixed').then(({ maintenanceMiddleware }) => {
  app.use(maintenanceMiddleware);
  console.log("✅ Maintenance middleware activated at startup");
}).catch(error => {
  console.error("❌ Error loading maintenance middleware at startup:", error);
});

// Contact and valuation endpoints now handled via registerContactMessagesRoutes in routes.ts

// Lightweight API endpoints that don't require module loading - will be loaded after server start



// Minimal request logging middleware - only for health check bypass
app.use((req, res, next) => {
  // Skip all middleware for health checks only
  if (req.path === '/health') {
    return next();
  }
  next();
});

// Environment-appropriate session configuration - no warnings
app.use(session({
  secret: process.env.SESSION_SECRET || 'prod-secret-' + Date.now(),
  resave: false,
  saveUninitialized: false,
  store: process.env.NODE_ENV === 'production' 
    ? new (MemoryStore(session))({
        checkPeriod: 86400000, // 24h cleanup
        stale: false, // Prevent warnings
        max: 1000 // Limit memory usage
      })
    : undefined, // Use default memory store in development
  cookie: {
    secure: false, // Keep false for deployment compatibility
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// Start server immediately for fast deployment health checks - MINIMAL OPERATIONS ONLY
async function startServer() {
  // Maintenance middleware ya aplicado al inicio - no necesario volver a aplicar
  console.log("ℹ️ Maintenance middleware already applied at startup");

  // SEO middleware removed - using client-side meta tag updates instead

  // ONLY essential non-blocking operations during startup
  const server = await registerRoutes(app);
  
  // Register upload routes immediately (critical for admin functionality)
  try {
    registerUploadRoutes(app);
    registerImageUploadRoutes(app);
    console.log("✅ Upload routes registered immediately");
  } catch (error) {
    console.error("❌ Error registering upload routes:", error);
  }

  // Error handler - keep minimal
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite for serving frontend
  await setupVite(app, server);

  // Start listening IMMEDIATELY - port will be handled by production config
  const port = parseInt(process.env.PORT || '80', 10);
  
  return new Promise<void>((resolve) => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on http://0.0.0.0:${port}`);
      console.log(`🏥 Health check available at http://0.0.0.0:${port}/health`);
      resolve();
    });
  });
}

// Background initialization - ALL expensive operations deferred with longer delays
async function initializeBackgroundServices() {
  console.log("🔄 Initializing background services...");

  // Initialize guest cart system
  setTimeout(() => {
    try {
      initializeGuestCart();
      console.log("✅ Guest cart system initialized");
    } catch (error) {
      console.error("❌ Error initializing guest cart:", error);
    }
  }, 15000);

  // Register additional route handlers
  setTimeout(() => {
    try {
      registerPartsBrandsModelsRoutes(app);
      registerBrandSpecificRoutes(app);
      registerRelationsDiagnosticRoutes(app);
      console.log("✅ Additional route handlers registered");
    } catch (error) {
      console.error("❌ Error registering additional routes:", error);
    }
  }, 20000);

  // Test database connectivity asynchronously
  setTimeout(async () => {
    try {
      console.log("🔍 Testing database connectivity...");
      await pool.query('SELECT 1');
      console.log("✅ Database connection successful");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      console.log("⚠️ Continuing with limited functionality...");
    }
  }, 25000);

  // Initialize email service
  setTimeout(async () => {
    try {
      const { emailService } = await import('./services/email');
      await emailService.initialize();
      console.log("✅ Email service initialized");
    } catch (error) {
      console.error("❌ Error initializing email service:", error);
    }
  }, 30000);

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
    }, 2000); // MEJORADO: Inicializar más temprano para mayor confiabilidad

    // Initialize import monitor
    setTimeout(async () => {
      try {
        const { importMonitor } = await import("./services/import-monitor");
        await importMonitor.initialize();
        console.log("✅ Import monitor initialized");
      } catch (err) {
        console.error("❌ Error initializing import monitor:", err);
      }
    }, 40000);
  } else {
    console.log("🚫 Background services (scheduler/monitor) disabled for stability");
  }

  // Additional API endpoints disabled for stability
  if (!process.env.DISABLE_BACKGROUND_SERVICES) {
    setTimeout(async () => {
      try {
        // Add diagnostic endpoint
        app.get('/api/diagnostic', async (req, res) => {
        try {
          console.log("Executing MetaSync API diagnostic...");
          const { metasyncApi } = await import('./api/metasync');
          const diagnostics = await metasyncApi.runDiagnostic();
          res.json({
            success: true,
            timestamp: new Date().toISOString(),
            diagnostics
          });
        } catch (error) {
          console.error("Error in MetaSync API diagnostic:", error);
          res.status(500).json({
            success: false,
            error: "Error executing diagnostic",
            details: error instanceof Error ? error.message : "Unknown error"
          });
        }
      });

      // Add image upload endpoint
      app.post('/api/upload-image', async (req, res) => {
        try {
          const multer = await import('multer');
          const path = await import('path');
          const fs = await import('fs');

          const storage = multer.default.diskStorage({
            destination: (req, file, cb) => {
              const uploadDir = path.join(process.cwd(), 'client/public/uploads');
              if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
              }
              cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
              const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
              const extension = path.extname(file.originalname);
              cb(null, `vehicle-${uniqueSuffix}${extension}`);
            }
          });

          const upload = multer.default({
            storage: storage,
            limits: { fileSize: 5 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
              if (file.mimetype.startsWith('image/')) {
                cb(null, true);
              } else {
                cb(new Error('Only image files are allowed'));
              }
            }
          });

          upload.single('image')(req, res, (err) => {
            if (err) {
              console.error('Error uploading image:', err);
              return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
              return res.status(400).json({ error: 'No image file provided' });
            }

            const imageUrl = `/uploads/${req.file.filename}`;
            
            res.json({
              success: true,
              imageUrl: imageUrl,
              filename: req.file.filename,
              originalName: req.file.originalname,
              size: req.file.size
            });
          });
        } catch (error) {
          console.error('Error in image upload endpoint:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      });

      // Add raw data endpoints
      app.get('/api/raw/vehicles', async (req, res) => {
        try {
          const limit = parseInt(req.query.limit as string) || 20;
          const { metasyncApi } = await import('./api/metasync');
          const data = await metasyncApi.getRawVehicles({ limit });
          res.json(data);
        } catch (error) {
          console.error("Error getting raw vehicles:", error);
          res.status(500).json({
            error: "Error getting raw vehicles",
            details: error instanceof Error ? error.message : "Unknown error"
          });
        }
      });

      app.get('/api/raw/parts', async (req, res) => {
        try {
          const limit = parseInt(req.query.limit as string) || 20;
          const { metasyncApi } = await import('./api/metasync');
          const data = await metasyncApi.getRawParts({ limit });
          res.json(data);
        } catch (error) {
          console.error("Error getting raw parts:", error);
          res.status(500).json({
            error: "Error getting raw parts", 
            details: error instanceof Error ? error.message : "Unknown error"
          });
        }
      });

        console.log("✅ Additional API endpoints loaded");
      } catch (error) {
        console.error("❌ Error loading additional API endpoints:", error);
      }
    }, 45000);

    // Maintenance middleware already loaded early - no need to reload
    setTimeout(async () => {
      try {
        console.log("ℹ️ Maintenance middleware already active from early load");
      } catch (error) {
        console.error("❌ Error in maintenance setup:", error);
      }
    }, 10000);

    // Execute initial cleanup - deferred to prevent startup blocking
    setTimeout(() => {
      executeInitialCleanup();
      console.log("✅ Background services initialization completed");
    }, 60000);
  } else {
    console.log("🚫 Additional API endpoints and maintenance disabled for stability");
  }
}

/**
 * Función de reintento para inicialización del scheduler
 * Implementa lógica robusta de recuperación
 */
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

// Start server immediately - background services disabled for stability
(async () => {
  await startServer();
  if (!process.env.DISABLE_BACKGROUND_SERVICES) {
    initializeBackgroundServices();
  } else {
    console.log("🚫 All background services disabled - running in minimal stable mode");
  }
})();