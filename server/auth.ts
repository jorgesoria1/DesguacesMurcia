import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "../shared/schema";
import { pool } from "./db";
import connectPgSimple from "connect-pg-simple";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email?: string;
      password?: string;
      isAdmin: boolean;
      role: string;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored || !supplied) return false;
    
    const split = stored.split(".");
    if (split.length !== 2) return false;
    
    const [hashed, salt] = split;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    return hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

// Middleware para verificar si el usuario es administrador
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user.isAdmin || req.user.role === 'admin')) {
    return next();
  }
  res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
}

// Middleware para verificar si el usuario es manager (acceso a pedidos y clientes)
export function isManager(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user.role === 'manager' || req.user.role === 'admin' || req.user.isAdmin)) {
    return next();
  }
  res.status(403).json({ error: "Acceso denegado. Se requieren permisos de manager o administrador." });
}

// Middleware para verificar si el usuario tiene permisos para gestionar pedidos
export function canManageOrders(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user.role === 'manager' || req.user.role === 'admin' || req.user.isAdmin)) {
    return next();
  }
  res.status(403).json({ error: "Acceso denegado. No tiene permisos para gestionar pedidos." });
}

// Middleware para verificar si el usuario tiene permisos para gestionar clientes
export function canManageClients(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user.role === 'manager' || req.user.role === 'admin' || req.user.isAdmin)) {
    return next();
  }
  res.status(403).json({ error: "Acceso denegado. No tiene permisos para gestionar clientes." });
}

// Middleware para verificar si el usuario está autenticado
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Debe iniciar sesión para acceder a este recurso." });
}

export function setupAuth(app: Express) {
  const PostgresStore = connectPgSimple(session);
  
  // Environment detection for deployment compatibility
  const hasCloudDomain = process.env.CLOUD_DOMAINS && (
    process.env.CLOUD_DOMAINS?.includes('.app') || 
    process.env.CLOUD_DOMAINS?.includes('.dev')
  );
  const isCloudDeploy = process.env.CLOUD_DEPLOYMENT === '1' || process.env.CLOUD_DEPLOYMENT === 'true' || hasCloudDomain;
  const isCloudDev = process.env.REPL_SLUG && !isCloudDeploy;
  const isLocalDev = !process.env.REPL_SLUG;
  
  // Security configuration for cloud deployment compatibility
  const isHTTPS = false; // Disabled for cloud platform compatibility
  
  // Log para debug
  console.log('🔍 Detección de entorno:', {
    isCloudDev,
    isCloudDeploy, 
    isLocalDev,
    isHTTPS,
    hasCloudDomain,
    vars: {
      REPL_SLUG: !!process.env.REPL_SLUG,
      CLOUD_DEPLOYMENT: process.env.CLOUD_DEPLOYMENT,
      CLOUD_DOMAINS: process.env.CLOUD_DOMAINS,
      NODE_ENV: process.env.NODE_ENV
    }
  });
  
  // Log adicional para debug en deploy
  if (isCloudDeploy) {
    console.log('🚀 Cloud deployment configuration detected');
    console.log('🔒 Security configuration applied');
  } else {
    console.log('🏠 Configuración para desarrollo detectada'); 
    console.log('🔓 HTTP local, secure cookies desactivadas');
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "desguaces-murcia-session-secret-muy-largo-para-seguridad",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Disabled for cloud deployment compatibility
      sameSite: 'lax', // lax para mejor compatibilidad con deployment
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
      domain: undefined // Sin restricción de dominio para deployment
    },
    store: new PostgresStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    })
  };

  console.log('🔐 Configuración final de sesión:', {
    entorno: isCloudDeploy ? 'DEPLOY' : isCloudDev ? 'DEV' : 'LOCAL',
    secure: sessionSettings.cookie?.secure,
    sameSite: sessionSettings.cookie?.sameSite,
    httpOnly: sessionSettings.cookie?.httpOnly,
    maxAge: sessionSettings.cookie?.maxAge
  });

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'identifier',
      passwordField: 'password'
    }, async (identifier, password, done) => {
      try {
        // Check if identifier is an email
        const isEmail = identifier.includes('@');
        
        // Get user by email or username
        const user = isEmail 
          ? await storage.getUserByEmail(identifier)
          : await storage.getUserByUsername(identifier);

        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Rutas de autenticación
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { 
        username, 
        password, 
        email,
        firstName,
        lastName,
        phone,
        address,
        city,
        postalCode,
        province,
        isAdmin = false 
      } = req.body;
      
      // Validar campos obligatorios
      if (!username || !password || !email || !firstName || !lastName || !phone || !address || !city || !postalCode || !province) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
      }
      
      // Verificar si el usuario ya existe por username
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya está en uso" });
      }
      
      // Verificar si el email ya existe
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "El email ya está en uso" });
      }
      
      // Crear el nuevo usuario con contraseña hasheada
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        phone,
        address,
        city,
        postalCode,
        province,
        role: 'customer',
        isAdmin
      });
      
      // Eliminar el campo password antes de enviar la respuesta
      const userResponse = { ...user };
      delete userResponse.password;
      
      // Iniciar sesión automáticamente
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Error al iniciar sesión" });
        }
        return res.status(201).json(userResponse);
      });
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      res.status(500).json({ error: "Error al registrar el usuario" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    const { identifier, password } = req.body;
    
    console.log('🔐 Login attempt:', { 
      identifier: identifier, 
      hasPassword: !!password,
      userAgent: req.headers['user-agent']?.slice(0, 50),
      sessionID: req.sessionID,
      protocol: req.protocol,
      secure: req.secure,
      cookies: Object.keys(req.cookies || {}),
      headers: Object.keys(req.headers).filter(h => h.includes('cookie') || h.includes('session'))
    });
    
    if (!identifier || !password) {
      console.log('❌ Missing credentials');
      return res.status(401).json({ error: "Usuario y contraseña son requeridos" });
    }

    passport.authenticate("local", (err: Error, user: User, info: { message: string }) => {
      if (err) {
        console.error('❌ Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('❌ Authentication failed:', info);
        return res.status(401).json({ error: info.message || "Usuario o contraseña incorrectos" });
      }
      
      console.log('✅ User authenticated:', { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        sessionID: req.sessionID 
      });
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('❌ Session creation error:', loginErr);
          return next(loginErr);
        }
        
        console.log('🍪 Session created successfully:', {
          sessionID: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          user: req.user?.id,
          cookieSettings: req.session?.cookie
        });
        
        // Eliminar el campo password antes de enviar la respuesta
        const userResponse = { ...user };
        delete userResponse.password;
        
        return res.json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  // Rutas alternativas sin /api/ para compatibilidad
  app.post("/auth/login", (req: Request, res: Response, next: NextFunction) => {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(401).json({ error: "Usuario y contraseña son requeridos" });
    }

    passport.authenticate("local", (err: Error, user: User, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Usuario o contraseña incorrectos" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Eliminar el campo password antes de enviar la respuesta
        const userResponse = { ...user };
        delete userResponse.password;
        
        return res.json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          error: "No autenticado",
          isAuthenticated: false
        });
      }
      
      // Eliminar el campo password antes de enviar la respuesta
      const userResponse = { ...req.user };
      delete userResponse.password;
      
      res.json({
        ...userResponse,
        isAuthenticated: true
      });
    } catch (error) {
      console.error('Error in /api/auth/me:', error);
      res.status(500).json({ 
        error: "Error del servidor",
        isAuthenticated: false
      });
    }
  });

  // Endpoint para crear usuario administrador inicial (solo se debería usar una vez)
  app.post("/api/auth/setup-admin", async (req: Request, res: Response) => {
    try {
      // Verificar si ya existe un administrador
      const users = await storage.getAllUsers();
      const adminExists = users.some(user => user.isAdmin);
      
      if (adminExists) {
        return res.status(400).json({ error: "Ya existe un usuario administrador" });
      }
      
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Nombre de usuario y contraseña son requeridos" });
      }
      
      // Crear el administrador
      const hashedPassword = await hashPassword(password);
      const admin = await storage.createUser({
        username,
        password: hashedPassword,
        isAdmin: true
      });
      
      // Eliminar el campo password antes de enviar la respuesta
      const adminResponse = { ...admin };
      delete adminResponse.password;
      
      res.status(201).json(adminResponse);
    } catch (error) {
      console.error("Error al crear usuario administrador:", error);
      res.status(500).json({ error: "Error al crear usuario administrador" });
    }
  });

  // Endpoint de debug para deployment
  app.get("/api/auth/debug", (req: Request, res: Response) => {
    res.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        REPL_SLUG: !!process.env.REPL_SLUG,
        CLOUD_DEPLOYMENT: process.env.CLOUD_DEPLOYMENT,
        CLOUD_DOMAINS: process.env.CLOUD_DOMAINS
      },
      session: {
        id: req.sessionID,
        cookie: req.session?.cookie,
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user
      },
      headers: {
        userAgent: req.headers['user-agent'],
        host: req.headers.host,
        protocol: req.protocol,
        secure: req.secure
      }
    });
  });


}