/**
 * Browser Compatibility Utilities
 * Provides safe fallbacks for browser-specific features
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  warnings: string[];
}

export function detectBrowser(): BrowserInfo {
  // Validar y sanitizar entrada para prevenir XSS
  const userAgent = typeof navigator?.userAgent === 'string' ? navigator.userAgent : '';
  const warnings: string[] = [];
  
  let name = 'Unknown';
  let version = 'Unknown';
  let isSupported = true;

  // Detectar Chrome
  if (userAgent.indexOf('Chrome') > -1) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
    
    // Verificar versión mínima de Chrome
    const majorVersion = parseInt(version.split('.')[0]);
    if (majorVersion < 70) {
      warnings.push('Chrome version is outdated. Some features may not work correctly.');
    }
  }
  // Detectar Firefox
  else if (userAgent.indexOf('Firefox') > -1) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  }
  // Detectar Safari
  else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  }
  // Detectar Edge
  else if (userAgent.indexOf('Edg') > -1) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+)/);
    version = match ? match[1] : 'Unknown';
  }

  return {
    name,
    version,
    isSupported,
    warnings
  };
}

export function safeScrollBy(element: HTMLElement, options: { left: number; behavior?: 'smooth' | 'auto' }): void {
  try {
    // Validar entrada
    if (!element || typeof options.left !== 'number' || isNaN(options.left)) {
      console.warn('Invalid parameters for safeScrollBy');
      return;
    }

    // Intentar usar scrollBy moderno
    if (element.scrollBy && typeof element.scrollBy === 'function') {
      element.scrollBy(options);
    } else {
      // Fallback para navegadores más antiguos
      element.scrollLeft += options.left;
    }
  } catch (error) {
    console.warn('Error scrolling element:', error);
    // Fallback absoluto con validación
    if (element && typeof options.left === 'number' && !isNaN(options.left)) {
      element.scrollLeft += options.left;
    }
  }
}

export function safeQuerySelector(selector: string): HTMLElement | null {
  try {
    // Validar entrada para prevenir CSS injection
    if (!selector || typeof selector !== 'string' || selector.trim().length === 0) {
      console.warn('Invalid selector provided');
      return null;
    }

    // Sanitizar selector básico para prevenir inyecciones
    const sanitizedSelector = selector.replace(/[<>'"]/g, '');
    
    const element = document.querySelector(sanitizedSelector);
    return element instanceof HTMLElement ? element : null;
  } catch (error) {
    console.warn('Error selecting element:', selector, error);
    return null;
  }
}

export function safeExecuteCommand(command: string, value?: string): boolean {
  try {
    // Validar entrada para prevenir command injection
    if (!command || typeof command !== 'string') {
      console.warn('Invalid command provided');
      return false;
    }

    // Whitelist de comandos seguros para execCommand
    const safeCommands = [
      'bold', 'italic', 'underline', 'strikeThrough',
      'justifyLeft', 'justifyCenter', 'justifyRight',
      'insertOrderedList', 'insertUnorderedList',
      'createLink', 'unlink', 'undo', 'redo'
    ];

    if (!safeCommands.includes(command)) {
      console.warn(`Unsafe command blocked: ${command}`);
      return false;
    }

    // Verificar si execCommand está disponible
    if (!document.execCommand) {
      console.warn('document.execCommand is not available');
      return false;
    }

    // Verificar si el comando es soportado
    if (document.queryCommandSupported && !document.queryCommandSupported(command)) {
      console.warn(`Command ${command} is not supported`);
      return false;
    }

    return document.execCommand(command, false, value);
  } catch (error) {
    console.warn('Error executing command:', command, error);
    return false;
  }
}

export function safeAddEventListener(
  element: EventTarget, 
  event: string, 
  handler: EventListener, 
  options?: AddEventListenerOptions
): void {
  try {
    element.addEventListener(event, handler, options);
  } catch (error) {
    console.warn('Error adding event listener:', error);
    // Fallback para navegadores antiguos
    if ('on' + event in element) {
      (element as any)['on' + event] = handler;
    }
  }
}

export function safeRemoveEventListener(
  element: EventTarget, 
  event: string, 
  handler: EventListener, 
  options?: EventListenerOptions
): void {
  try {
    element.removeEventListener(event, handler, options);
  } catch (error) {
    console.warn('Error removing event listener:', error);
    // Fallback para navegadores antiguos
    if ('on' + event in element) {
      (element as any)['on' + event] = null;
    }
  }
}

export function safeHistoryPushState(state: any, title: string, url: string): void {
  try {
    if (window.history && window.history.pushState) {
      window.history.pushState(state, title, url);
    } else {
      // Fallback para navegadores sin pushState
      window.location.href = url;
    }
  } catch (error) {
    console.warn('Error with history.pushState:', error);
    window.location.href = url;
  }
}

export function safeDispatchEvent(event: Event): void {
  try {
    window.dispatchEvent(event);
  } catch (error) {
    console.warn('Error dispatching event:', error);
  }
}

export function isBrowserSupported(): boolean {
  const browser = detectBrowser();
  
  // Verificar características básicas requeridas
  const requiredFeatures = [
    'querySelector' in document,
    'addEventListener' in window,
    'JSON' in window,
    'localStorage' in window,
    'fetch' in window
  ];

  return requiredFeatures.every(feature => feature) && browser.isSupported;
}

export function showBrowserWarning(): void {
  const browser = detectBrowser();
  
  if (!isBrowserSupported() || browser.warnings.length > 0) {
    console.warn('Browser compatibility issues detected:', {
      browser: browser.name,
      version: browser.version,
      warnings: browser.warnings
    });
    
    // Mostrar advertencia solo si hay problemas serios
    if (!isBrowserSupported()) {
      const message = `Tu navegador ${browser.name} ${browser.version} puede no ser completamente compatible con esta aplicación. Para la mejor experiencia, te recomendamos actualizar a una versión más reciente.`;
      
      // Mostrar advertencia de forma no intrusiva usando métodos DOM seguros
      setTimeout(() => {
        const notification = document.createElement('div');
        
        const content = document.createElement('div');
        content.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #fff3cd;
          color: #856404;
          padding: 12px 16px;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          font-size: 14px;
          max-width: 400px;
          z-index: 10000;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        
        const title = document.createElement('strong');
        title.textContent = 'Aviso de Compatibilidad:';
        
        const messageText = document.createElement('span');
        messageText.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
          float: right;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #856404;
          margin-left: 10px;
        `;
        closeButton.onclick = () => {
          if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
          }
        };
        
        content.appendChild(closeButton);
        content.appendChild(title);
        content.appendChild(document.createElement('br'));
        content.appendChild(messageText);
        notification.appendChild(content);
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
          if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
          }
        }, 10000);
      }, 1000);
    }
  }
}