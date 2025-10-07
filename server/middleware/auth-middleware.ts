import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para verificar si el usuario está autenticado
 * IMPORTANTE: No usar en rutas públicas como /api/search-parts o /api/optimized/vehicles
 * Solo usar en rutas administrativas
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'No autenticado' });
};

/**
 * Middleware para verificar si el usuario es administrador
 * Usar SOLO en rutas administrativas, nunca en APIs públicas de búsqueda
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated() && (req.user as any)?.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Acceso prohibido' });
};