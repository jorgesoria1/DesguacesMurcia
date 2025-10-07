import { Request, Response, NextFunction } from 'express';
import { UserRole, UserRoleType } from '../../shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        firstName: string;
        lastName: string;
        address: string;
        city: string;
        postalCode: string;
        phone: string;
        province: string;
        role: UserRoleType;
        isAdmin: boolean;
      };
    }
  }
}

// Middleware para verificar autenticación
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Debes iniciar sesión para acceder a este recurso'
    });
  }
  next();
};

// Middleware para verificar roles específicos
export const requireRole = (allowedRoles: UserRoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Debes iniciar sesión para acceder a este recurso'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'No tienes permisos para acceder a este recurso'
      });
    }

    next();
  };
};

// Middleware para verificar si es administrador
export const requireAdmin = requireRole([UserRole.ADMIN]);

// Middleware para verificar si es gestor o administrador
export const requireManager = requireRole([UserRole.MANAGER, UserRole.ADMIN]);

// Middleware para verificar si es cliente, gestor o administrador
export const requireCustomer = requireRole([UserRole.CUSTOMER, UserRole.MANAGER, UserRole.ADMIN]);

// Función helper para verificar permisos
export const hasPermission = (userRole: UserRoleType, requiredRole: UserRoleType): boolean => {
  const roleHierarchy = {
    [UserRole.CUSTOMER]: 1,
    [UserRole.MANAGER]: 2,
    [UserRole.ADMIN]: 3
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Función helper para verificar si el usuario puede realizar una acción
export const canPerformAction = (userRole: UserRoleType, action: string): boolean => {
  const permissions = {
    [UserRole.CUSTOMER]: [
      'view_products',
      'add_to_cart',
      'place_order',
      'view_own_orders',
      'update_own_profile'
    ],
    [UserRole.MANAGER]: [
      'view_products',
      'add_to_cart',
      'place_order',
      'view_own_orders',
      'update_own_profile',
      'view_all_orders',
      'update_order_status',
      'manage_inventory',
      'view_reports'
    ],
    [UserRole.ADMIN]: [
      'view_products',
      'add_to_cart',
      'place_order',
      'view_own_orders',
      'update_own_profile',
      'view_all_orders',
      'update_order_status',
      'manage_inventory',
      'view_reports',
      'manage_users',
      'manage_payments',
      'manage_system_settings',
      'manage_cms',
      'view_admin_panel'
    ]
  };

  return permissions[userRole]?.includes(action) || false;
};