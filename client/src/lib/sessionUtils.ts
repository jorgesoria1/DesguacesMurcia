/**
 * Utilidades para gestión de sessionId para usuarios invitados
 */

const GUEST_SESSION_KEY = 'guestSessionId';

/**
 * Genera un sessionId único para usuarios invitados
 */
export function generateGuestSessionId(): string {
  // Generar un ID único usando timestamp + random
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `guest_${timestamp}_${randomPart}`;
}

/**
 * Obtiene o genera un sessionId para usuario invitado
 */
export function getGuestSessionId(): string {
  let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  
  if (!sessionId) {
    sessionId = generateGuestSessionId();
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Limpia el sessionId del usuario invitado
 */
export function clearGuestSessionId(): void {
  localStorage.removeItem(GUEST_SESSION_KEY);
}

/**
 * Verifica si existe un sessionId válido
 */
export function hasValidGuestSessionId(): boolean {
  const sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  return sessionId !== null && sessionId.length > 0;
}