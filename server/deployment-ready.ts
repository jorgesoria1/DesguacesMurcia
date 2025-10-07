#!/usr/bin/env node
/**
 * Deployment-optimized server for instant health check response
 * Loads full application immediately for deployment
 */

import express from "express";

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// Basic middleware for JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// INSTANT health check - no JSON parsing, no complex objects
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

async function startFullApplication() {
  try {
    console.log("🔄 Loading full application...");
    
    // Import and register all routes
    const { registerRoutes } = await import('./routes');
    const server = await registerRoutes(app);
    
    // Set up Vite for frontend serving - this will handle the root route
    const { setupVite } = await import('./vite');
    await setupVite(app, server);
    
    // Start the server
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Full application server running on http://0.0.0.0:${port}`);
      console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
    });
    
    return server;
    
  } catch (error) {
    console.error("❌ Error loading full application:", error);
    
    // Fallback to minimal server for health checks only
    const fallbackServer = app.listen(port, "0.0.0.0", () => {
      console.log(`⚠️ Fallback server running on http://0.0.0.0:${port} (health check only)`);
    });
    
    return fallbackServer;
  }
}

// Start the full application immediately
let currentServer: any = null;
startFullApplication().then(server => {
  currentServer = server;
}).catch(error => {
  console.error("❌ Failed to start application:", error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  if (currentServer) {
    currentServer.close(() => {
      console.log('👋 Deployment server shut down');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  if (currentServer) {
    currentServer.close(() => {
      console.log('👋 Deployment server shut down');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});