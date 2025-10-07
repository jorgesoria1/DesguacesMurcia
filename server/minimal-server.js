import express from "express";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite.js";
import { registerRoutes } from "./routes.js";

const app = express();

// Health check endpoint - must be first
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  const server = createServer(app);
  
  // Register all API routes BEFORE frontend setup
  await registerRoutes(app);
  
  // Setup frontend serving based on environment
  if (process.env.NODE_ENV === 'production') {
    console.log('📦 Setting up static file serving for production...');
    serveStatic(app);
  } else {
    console.log('🔧 Setting up Vite development server...');
    await setupVite(app, server);
  }
  
  const port = parseInt(process.env.PORT || '5000', 10);

  server.listen(port, "0.0.0.0", () => {
    console.log(`✅ Minimal server running on http://0.0.0.0:${port}`);
    console.log(`🏥 Health check available at http://0.0.0.0:${port}/health`);
  });

  return server;
}

// Start the server
startServer().catch(console.error);

export { app };