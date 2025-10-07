import { useState, useEffect, useCallback } from 'react';

// Tipos para el estado de búsqueda de sesión
export interface SessionSearchState {
  brand?: string;
  model?: string;
  year?: string;
  fuel?: string;
  family?: string; // Solo para piezas
  power?: string;  // Solo para vehículos
  searchTerm?: string;
  lastUpdated?: number;
  version?: string;
}

// Clave de almacenamiento con namespace
const STORAGE_KEY = 'desguace_search_session';
const CURRENT_VERSION = '1.0';

// Hook para manejar el estado persistente de búsqueda
export const useSessionSearchState = () => {
  const [sessionState, setSessionState] = useState<SessionSearchState>({});

  // Función para leer del sessionStorage
  const readFromSession = useCallback((): SessionSearchState => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return {};

      const parsed = JSON.parse(stored);
      
      // Verificar versión del esquema
      if (parsed.version !== CURRENT_VERSION) {
        console.log('🔄 Limpiando estado de sesión por cambio de versión');
        window.sessionStorage.removeItem(STORAGE_KEY);
        return {};
      }

      return parsed;
    } catch (error) {
      console.error('Error al leer estado de sesión:', error);
      return {};
    }
  }, []);

  // Función para escribir al sessionStorage
  const writeToSession = useCallback((state: SessionSearchState) => {
    try {
      const stateToSave = {
        ...state,
        lastUpdated: Date.now(),
        version: CURRENT_VERSION
      };
      
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      console.log('💾 Estado de búsqueda guardado en sesión:', stateToSave);
    } catch (error) {
      console.error('Error al guardar estado de sesión:', error);
    }
  }, []);

  // Inicializar estado desde sessionStorage al montar
  useEffect(() => {
    const stored = readFromSession();
    if (Object.keys(stored).length > 0) {
      setSessionState(stored);
      console.log('🔄 Estado de sesión cargado:', stored);
    }
  }, [readFromSession]);

  // Función para actualizar y persistir estado
  const updateSessionState = useCallback((updates: Partial<SessionSearchState>) => {
    setSessionState(prevState => {
      const newState = { ...prevState, ...updates };
      writeToSession(newState);
      return newState;
    });
  }, [writeToSession]);

  // Función para combinar estado de sesión con parámetros de URL
  // URL tiene prioridad sobre sesión
  const mergeWithUrlState = useCallback((urlState: Partial<SessionSearchState>): SessionSearchState => {
    const stored = readFromSession();
    const merged = { ...stored };
    
    // Solo usar valores de sesión si no están en URL
    Object.keys(urlState).forEach(key => {
      const typedKey = key as keyof SessionSearchState;
      const urlValue = urlState[typedKey];
      if (urlValue && urlValue !== '') {
        (merged as any)[typedKey] = urlValue;
      }
    });

    return merged;
  }, [readFromSession]);

  // Función para limpiar estado de sesión
  const clearSessionState = useCallback(() => {
    setSessionState({});
    window.sessionStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Estado de sesión limpiado');
  }, []);

  // Función para obtener valores por defecto con fallback a sesión
  const getInitialValues = useCallback((urlFilters: Partial<SessionSearchState> = {}): SessionSearchState => {
    const stored = readFromSession();
    
    // Combinar: URL tiene prioridad, luego sesión, luego defaults
    return {
      brand: urlFilters.brand || stored.brand || '',
      model: urlFilters.model || stored.model || '',
      year: urlFilters.year || stored.year || '',
      fuel: urlFilters.fuel || stored.fuel || '',
      family: urlFilters.family || stored.family || '',
      power: urlFilters.power || stored.power || '',
      searchTerm: urlFilters.searchTerm || stored.searchTerm || ''
    };
  }, [readFromSession]);

  return {
    sessionState,
    updateSessionState,
    mergeWithUrlState,
    clearSessionState,
    getInitialValues,
    readFromSession
  };
};