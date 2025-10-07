import { Request, Response, NextFunction } from 'express';
import { getMaintenanceConfig } from '../services/maintenance';

/**
 * Middleware para controlar el acceso al sitio durante el modo mantenimiento
 * - Si el sitio está en mantenimiento, solo permite acceso a administradores
 * - Las rutas de la API siempre están accesibles para permitir la autenticación
 */
export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Las rutas de API siempre están permitidas para permitir login/autenticación
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // También permitir acceso a assets y recursos estáticos
  if (req.path.startsWith('/assets/') || req.path.includes('.')) {
    return next();
  }

  try {
    // Obtener configuración de mantenimiento
    const config = await getMaintenanceConfig();
    
    // Si no está en modo mantenimiento, permitir acceso
    if (!config.maintenanceMode) {
      return next();
    }
    
    // Verificar si el usuario tiene una sesión activa y es administrador
    const isAdmin = req.isAuthenticated && req.isAuthenticated() && (req.user as any)?.isAdmin;
    
    // Si es administrador, permitir acceso a cualquier ruta
    if (isAdmin) {
      return next();
    }
    
    // Comprobar si hay una cookie de redirección después de login de admin
    const hasRedirectCookie = req.headers.cookie && req.headers.cookie.includes('admin_auth_success=1');
    if (hasRedirectCookie) {
      // Si existe la cookie de redirección exitosa, permitir acceso temporal (para la primera carga)
      return next();
    }

    // Permitir acceso a rutas relacionadas con login o assets
    if (req.path.startsWith('/admin') || req.path === '/login' || req.path.includes('.js') || req.path.includes('.css')) {
      return next();
    }
    
    // En modo mantenimiento y no es admin, mostrar página de mantenimiento
    return res.status(503).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sitio en Mantenimiento</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
            color: #111827;
          }
          .maintenance-container {
            max-width: 600px;
            text-align: center;
            padding: 40px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: #1f2937;
          }
          p {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 24px;
            color: #4b5563;
          }
          .icon {
            width: 64px;
            height: 64px;
            margin-bottom: 24px;
          }
          .info {
            background-color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
          }
          .estimated-time {
            font-weight: bold;
            color: #4f46e5;
          }
          .admin-section {
            margin-top: 32px;
            border-top: 1px solid #e5e7eb;
            padding-top: 24px;
            text-align: left;
          }
          .admin-title {
            font-size: 16px;
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 16px;
          }
          .form-group {
            margin-bottom: 16px;
          }
          .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #6b7280;
            margin-bottom: 6px;
          }
          .form-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            background-color: #fff;
            color: #111827;
          }
          .form-input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
          }
          .form-button {
            display: inline-block;
            padding: 10px 16px;
            background-color: #4f46e5;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .form-button:hover {
            background-color: #4338ca;
          }
          .form-error {
            color: #ef4444;
            font-size: 14px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="maintenance-container">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <h1>Sitio en Mantenimiento</h1>
          <p>${config.maintenanceMessage || 'Estamos realizando mejoras en nuestro sitio web. Disculpe las molestias.'}</p>
          ${config.estimatedTime ? `<div class="info">Tiempo estimado: <span class="estimated-time">${config.estimatedTime}</span></div>` : ''}
          
          <div class="admin-section">
            <h2 class="admin-title">Acceso para administradores</h2>
            <div id="loginForm">
              <form id="login-form">
                <div class="form-group">
                  <label class="form-label" for="identifier">Email o nombre de usuario</label>
                  <input class="form-input" type="text" id="identifier" name="identifier" autocomplete="username" required placeholder="email@ejemplo.com o usuario">
                </div>
                <div class="form-group">
                  <label class="form-label" for="password">Contraseña</label>
                  <input class="form-input" type="password" id="password" name="password" autocomplete="current-password" required placeholder="••••••••">
                </div>
                <div id="errorMessage" class="form-error" style="display: none; color: #ef4444; margin-bottom: 12px;"></div>
                <button type="submit" id="loginButton" class="form-button">Iniciar sesión</button>
              </form>
            </div>
            
            <script>
              document.getElementById('login-form').addEventListener('submit', async function(event) {
                event.preventDefault();
                
                const loginButton = document.getElementById('loginButton');
                const originalButtonText = loginButton.innerText;
                const errorElement = document.getElementById('errorMessage');
                
                // Ocultar mensajes de error previos
                errorElement.style.display = 'none';
                
                // Obtener los datos del formulario
                const identifier = document.getElementById('identifier').value;
                const password = document.getElementById('password').value;
                
                // Validar campos
                if (!identifier || !password) {
                  errorElement.textContent = 'Usuario y contraseña son requeridos';
                  errorElement.style.display = 'block';
                  return;
                }
                
                try {
                  // Mostrar estado de carga
                  loginButton.disabled = true;
                  loginButton.innerText = 'Iniciando sesión...';
                  
                  // Enviar solicitud exactamente como lo hace la aplicación principal
                  const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                      identifier: identifier, 
                      password: password 
                    }),
                    credentials: 'include'
                  });
                  
                  if (response.ok) {
                    // Login exitoso - obtener primero los datos del usuario para confirmar que es admin
                    try {
                      const userInfoResponse = await fetch('/api/auth/me', {
                        method: 'GET',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                      });
                      
                      if (userInfoResponse.ok) {
                        const userData = await userInfoResponse.json();
                        
                        // Si el usuario es admin, redirigir a la página principal
                        if (userData && userData.isAdmin) {
                          // Establecer una cookie especial para la redirección de admin
                          document.cookie = "admin_auth_success=1; path=/; max-age=30";
                          
                          // Forzar una recarga completa para asegurar que la sesión se aplique correctamente
                          setTimeout(() => {
                            window.location.replace('/?t=' + new Date().getTime());
                          }, 100);
                        } else {
                          // Si no es admin mostrar mensaje
                          errorElement.textContent = 'Solo los administradores pueden acceder en modo mantenimiento';
                          errorElement.style.display = 'block';
                          loginButton.disabled = false;
                          loginButton.innerText = originalButtonText;
                        }
                      } else {
                        throw new Error('No se pudo verificar el rol de usuario');
                      }
                    } catch (error) {
                      // Error al verificar el rol
                      errorElement.textContent = 'Error al verificar los permisos. Intente nuevamente.';
                      errorElement.style.display = 'block';
                      loginButton.disabled = false;
                      loginButton.innerText = originalButtonText;
                    }
                  } else {
                    // Manejar errores
                    const data = await response.json();
                    errorElement.textContent = data.error || 'Usuario o contraseña incorrectos';
                    errorElement.style.display = 'block';
                    
                    // Restaurar el botón
                    loginButton.disabled = false;
                    loginButton.innerText = originalButtonText;
                  }
                } catch (error) {
                  // Error de red o conexión
                  errorElement.textContent = 'Error de conexión. Intente nuevamente.';
                  errorElement.style.display = 'block';
                  
                  // Restaurar el botón
                  loginButton.disabled = false;
                  loginButton.innerText = originalButtonText;
                }
              });
            </script>
          </div>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error en middleware de mantenimiento:', error);
    // En caso de error, permitir acceso para no bloquear el sitio
    return next();
  }
};