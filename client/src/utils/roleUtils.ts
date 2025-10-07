// Utility functions for role management

export const isAdmin = (user: any): boolean => {
  return user?.isAdmin || user?.role === 'admin';
};

export const isManager = (user: any): boolean => {
  return user?.role === 'manager' || isAdmin(user);
};

export const canManageOrders = (user: any): boolean => {
  return isManager(user);
};

export const canManageClients = (user: any): boolean => {
  return isManager(user);
};

export const getUserRoleDisplay = (user: any): string => {
  if (user?.isAdmin || user?.role === 'admin') return 'Administrador';
  if (user?.role === 'manager') return 'Manager';
  if (user?.role === 'customer') return 'Cliente';
  return 'Usuario';
};