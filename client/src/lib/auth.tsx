import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from './queryClient';

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  role?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; shouldRedirect?: boolean }>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (userData: Partial<User>) => Promise<{ success: boolean; message?: string }>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  register: async () => ({ success: false }),
  updateProfile: async () => ({ success: false }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos del usuario al iniciar
  // Función para obtener datos del usuario actual
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // 401 es comportamiento normal cuando no hay usuario autenticado
        setUser(null);
      } else {
        setUser(null);
      }
    } catch (error) {
      // Manejar silenciosamente errores de red para /api/auth/me
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos del usuario al iniciar
  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Usamos identifier en lugar de email para ser compatible con el backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier: email, password }),
      });
      
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Verificar inmediatamente si la sesión está establecida
        const verifyResponse = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          // Actualizar el estado con los datos verificados
          setUser(verifyData);
        } else {
          // Intentar recargar el usuario después de un pequeño delay
          setTimeout(() => {
            fetchUser();
          }, 100);
        }
        
        return { success: true, shouldRedirect: userData.isAdmin || userData.role === 'admin' || userData.role === 'manager' };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          message: errorData.error || 'Error de inicio de sesión' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Error de conexión al intentar iniciar sesión' 
      };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setUser(null);
    } catch (error) {
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      
      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          message: errorData.error || 'Error al registrar usuario' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Error de conexión al intentar registrar usuario' 
      };
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      const response = await apiRequest('PATCH', '/api/auth/profile', userData);
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
        return { success: true };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          message: errorData.error || 'Error al actualizar perfil' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Error de conexión al intentar actualizar perfil' 
      };
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user,
        login, 
        logout, 
        register,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);