import { apiRequest } from "./queryClient";

// Tipos de respuesta
type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

// Tipos para las entidades
export type Vehicle = {
  id: number;
  idLocal: number;
  idEmpresa: number;
  descripcion: string;
  marca: string;
  modelo: string;
  version: string; // Importante: añadida para mantener compatibilidad con datos existentes
  anyo: number;
  combustible: string;
  bastidor: string;
  matricula: string;
  color: string;
  kilometraje: number;
  potencia: number;
  puertas?: number; // Añadido para mantener consistencia con el esquema de la base de datos
  imagenes: string[];
  activo?: boolean;
  sincronizado?: boolean;
  ultimaSincronizacion?: string;
  fechaCreacion: string;
  fechaActualizacion: string;

  // Contadores de piezas
  activeParts?: number;
  totalParts?: number;
  active_parts_count?: number;
  total_parts_count?: number;
};

export type Part = {
  id: number;
  refLocal: number | string;
  idEmpresa: number;
  idVehiculo: number;
  codFamilia: string;
  descripcionFamilia?: string;
  codArticulo: string;
  refPrincipal: string;
  descripcionArticulo: string;
  precio: string | number; // Puede ser string o number según el origen
  peso: string | number; // Puede ser string o number según el origen
  imagenes: string[];
  activo?: boolean; // Campo nuevo
  fechaCreacion: string;
  fechaActualizacion: string;

  // Información del vehículo compatible
  vehicleMarca?: string;
  vehicleModelo?: string;
  vehicleVersion?: string;
  vehicleAnyo?: string | number;
  vehicleInternalId?: number; // ID interno del vehículo para enlaces

  // Información básica del vehículo principal (nueva implementación optimizada)
  vehicleInfo?: {
    id: number;
    idLocal: number;
    marca: string;
    modelo: string;
  };

  // Campos opcionales para compatibilidad
  codVersion?: string;
  anyoStock?: number;
  ubicacion?: number;
  observaciones?: string;
  reserva?: number;
  tipoMaterial?: number;
  precioVenta?: string | number;
  sincronizado?: boolean;
  ultimaSincronizacion?: string;
  relatedVehiclesCount?: number;

  // Vehículos asociados a esta pieza
  vehicles?: Vehicle[];
};

export type ApiConfig = {
  id: number;
  apiKey: string;
  companyId: number;
  channel: string;
  active: boolean;
};

export type ImportHistory = {
  id: number;
  type: string;
  status: string;
  isFullImport: boolean;
  progress?: number;
  totalItems?: number;
  processedItems?: number;
  newItems?: number;
  updatedItems?: number;
  errors?: string[];
  details?: Record<string, any>;
  startTime: string;
  endTime?: string;
  processingItem?: string;
};

export type ImportSchedule = {
  id: number;
  type: string;
  frequency: string;
  lastRun?: string;
  nextRun?: string;
  active: boolean;
  startTime?: string;
};

// API para vehículos
export const vehiclesApi = {
  getVehicles: async (params?: { 
    limit?: number; 
    offset?: number; 
    marca?: string; 
    modelo?: string; 
    anyo?: number;
    search?: string;
    withPartCounts?: boolean;
    activePartCounts?: boolean;
    idLocal?: number; 
  }) => {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    if (params?.marca) searchParams.append("marca", params.marca);
    if (params?.modelo) searchParams.append("modelo", params.modelo);
    if (params?.anyo) searchParams.append("anyo", params.anyo.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.withPartCounts) searchParams.append("withPartCounts", "true");
    if (params?.activePartCounts) searchParams.append("activePartCounts", "true");
    if (params?.idLocal) searchParams.append("idLocal", params.idLocal.toString());

    const url = `/api/vehicles?${searchParams.toString()}`;
    const res = await apiRequest("GET", url);
    return (await res.json()) as PaginatedResponse<Vehicle> & { 
      partCounts?: Record<number, number>; 
      activePartCounts?: Record<number, number>;
      inactivePartCounts?: Record<number, number>;
    };
  },

  getVehicleById: async (id: number, params?: { soloActivas?: boolean }) => {
    const soloActivas = params?.soloActivas !== false; // Por defecto true
    const url = `/api/vehicles/${id}?soloActivas=${soloActivas}`;

    const res = await apiRequest("GET", url);
    return (await res.json()) as { vehicle: Vehicle; parts: Part[] };
  },

  searchVehicles: async (query: string) => {
    const res = await apiRequest("GET", `/api/vehicles/search?q=${encodeURIComponent(query)}`);
    return (await res.json()) as Vehicle[];
  },

  // Alias para compatibilidad con las páginas de administración
  getAll: async (params?: { 
    limit?: number; 
    offset?: number; 
    marca?: string; 
    modelo?: string; 
    anyo?: number; 
    withPartCounts?: boolean;
    activePartCounts?: boolean;
  }) => {
    return vehiclesApi.getVehicles(params);
  },

  // Método de actualización para la administración
  updateVehicle: async (id: number, data: Partial<Vehicle>) => {
    const res = await apiRequest("PUT", `/api/vehicles/${id}`, data);
    return (await res.json()) as Vehicle;
  },

  // Método de eliminación para la administración
  deleteVehicle: async (id: number) => {
    const res = await apiRequest("DELETE", `/api/vehicles/${id}`);
    return (await res.json()) as { message: string };
  },

  deleteAllVehicles: async () => {
    const res = await apiRequest("DELETE", "/api/vehicles/all/delete");
    return (await res.json()) as { message: string; count: number };
  }
};

// API para piezas
export const partsApi = {
  getParts: async (params?: { 
    limit?: number; 
    offset?: number; 
    vehicleId?: number; 
    familia?: string;
    activo?: boolean; 
  }) => {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    if (params?.vehicleId) searchParams.append("vehicleId", params.vehicleId.toString());
    if (params?.familia) searchParams.append("familia", params.familia);
    if (params?.activo !== undefined) searchParams.append("activo", params.activo.toString());

    const url = `/api/parts?${searchParams.toString()}`;
    const res = await apiRequest("GET", url);
    return (await res.json()) as PaginatedResponse<Part>;
  },

  getPartById: async (id: number, options?: { isAdmin?: boolean, filterBrand?: string }) => {
    let url = `/api/parts/${id}`;
    const params = new URLSearchParams();

    if (options?.isAdmin) params.append("isAdmin", "true");
    if (options?.filterBrand) params.append("filterBrand", options.filterBrand);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await apiRequest("GET", url);
    return await res.json();
  },

  searchParts: async (query: string) => {
    const res = await apiRequest("GET", `/api/parts/search?q=${encodeURIComponent(query)}`);
    return (await res.json()) as Part[];
  },

  // Alias para compatibilidad con las páginas de administración
  getAll: async (params?: { 
    limit?: number; 
    offset?: number; 
    vehicleId?: number; 
    familia?: string;
    activo?: boolean;
    search?: string;
  }) => {
    return partsApi.getParts(params);
  },

  // Método específico para búsqueda avanzada de piezas (admin)
  searchPartsAdvanced: async (searchTerm: string, params?: { 
    limit?: number;
    offset?: number;
    activo?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.append("q", searchTerm);

    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    if (params?.activo !== undefined) searchParams.append("activo", params.activo.toString());

    const url = `/api/native-search?${searchParams.toString()}`;
    const res = await apiRequest("GET", url);
    return (await res.json()) as PaginatedResponse<Part>;
  },

  // Método de actualización para la administración
  updatePart: async (id: number, data: Partial<Part>) => {
    const res = await apiRequest("PUT", `/api/parts/${id}`, data);
    return (await res.json()) as Part;
  },

  // Método de eliminación para la administración
  deletePart: async (id: number) => {
    const res = await apiRequest("DELETE", `/api/parts/${id}`);
    return (await res.json()) as { message: string };
  },

  deleteAllParts: async () => {
    const res = await apiRequest("DELETE", "/api/parts/all/delete");
    return (await res.json()) as { message: string; count: number };
  },

  getBrandsAndModels: async (params: { marca?: string; modelo?: string } = {}) => {
    try {
      const query = new URLSearchParams();
      if (params.marca && params.marca !== 'all-brands') query.append('marca', params.marca);
      if (params.modelo && params.modelo !== 'all-models') query.append('modelo', params.modelo);

      const url = `/api/parts/brands-models?${query}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch brands and models: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
};

export const configApi = {
  // Obtener configuración actual
  async getConfig(): Promise<ApiConfig> {
    const response = await fetch('/api/config');

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  // Actualizar configuración
  async updateConfig(config: { apiKey: string; apiId: number; channel: string; active?: boolean }) {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || `Error HTTP ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'La operación no fue exitosa');
      }

      return data;
    } catch (error: any) {

      // Re-throw con mensaje más descriptivo
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Error de conexión con el servidor');
      }

      throw error;
    }
  },

  // Obtener configuración del chatbot
  async getChatbotConfig(): Promise<{ chatbotCode: string }> {
    const response = await fetch('/api/config/chatbot');
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Actualizar configuración del chatbot
  async updateChatbotCode(chatbotCode: string) {
    try {
      const response = await fetch('/api/config/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatbotCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || `Error HTTP ${response.status}`);
      }

      return data;
    } catch (error: any) {

      // Re-throw con mensaje más descriptivo
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Error de conexión con el servidor');
      }

      throw error;
    }
  },
};

// API para autenticación
export const authApi = {
  login: async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    return (await res.json()) as { user: { id: number; username: string; isAdmin: boolean } };
  }
};

// Tipos para diagnóstico de API
export type ApiDiagnosticResult = {
  endpoint: string;
  method: string;
  url: string;
  success: boolean;
  status?: number;
  message: string;
  responseData?: any;
  headers?: any;
  timestamp: string | Date;
};

export type ApiDiagnosticResponse = {
  success: boolean;
  timestamp: string | Date;
  diagnostics: ApiDiagnosticResult[];
  error?: string;
  details?: string;
};

// API para importaciones
export const importApi = {
  getHistory: async (limit?: number) => {
    const url = limit ? `/api/import/history?limit=${limit}` : "/api/import/history";
    const res = await apiRequest("GET", url);
    return (await res.json()) as ImportHistory[];
  },

  deleteHistoryItem: async (id: number) => {
    const res = await apiRequest("DELETE", `/api/import/history/${id}`);
    return (await res.json()) as { message: string };
  },

  getSchedules: async () => {
    const res = await apiRequest("GET", "/api/import/schedules");
    return (await res.json()) as ImportSchedule[];
  },

  updateSchedule: async (id: number, data: { frequency?: string; active?: boolean; startTime?: string }) => {
    const res = await apiRequest("PUT", `/api/import/schedule/${id}`, data);
    return (await res.json()) as ImportSchedule;
  },

  createSchedule: async (data: { type: string; frequency: string; startTime: string; active: boolean }) => {
    const res = await apiRequest("POST", "/api/import/schedule", data);
    return (await res.json()) as ImportSchedule;
  },

  deleteSchedule: async (id: number) => {
    const res = await apiRequest("DELETE", `/api/import/schedule/${id}`);
    return (await res.json()) as { message: string };
  },

  startManualImport: async (type: "vehicles" | "parts" | "all", options?: { fromDate?: string; fullImport?: boolean }) => {
    const res = await apiRequest("POST", "/api/import/manual", { 
      type,
      fromDate: options?.fromDate,
      fullImport: options?.fullImport
    });
    return (await res.json()) as { message: string; importId?: number };
  },

  resumeImport: async (id: number) => {
    const res = await apiRequest("POST", `/api/import/history/${id}/resume`);
    return (await res.json()) as { message: string; import: ImportHistory };
  },

  pauseImport: async (id: number) => {
    const res = await apiRequest("POST", `/api/import/history/${id}/pause`);
    return (await res.json()) as { message: string; import: ImportHistory };
  },

  cancelImport: async (id: number) => {
    const res = await apiRequest("POST", `/api/import/history/${id}/cancel`);
    return (await res.json()) as { message: string; import: ImportHistory };
  },

  // APIs para importación optimizada (sistema nuevo)
  startOptimizedImport: async (type: "vehicles" | "parts" | "all", options?: { fromDate?: string; fullImport?: boolean }) => {
    const url = `/api/metasync-optimized/import/${type}`;
    const data = {
      ...(options?.fromDate ? { fromDate: options.fromDate } : {}),
      ...(options?.fullImport ? { fullImport: options.fullImport } : {})
    };

    const res = await apiRequest("POST", url, data);
    return (await res.json()) as { success: boolean; message: string; importId?: number };
  },

  getOptimizedImportStatus: async (id: number) => {
    const res = await apiRequest("GET", `/api/metasync-optimized/import/${id}`);
    return (await res.json()) as { success: boolean; import: ImportHistory };
  },

  cancelOptimizedImport: async (id: number) => {
    const res = await apiRequest("POST", `/api/metasync-optimized/import/${id}/cancel`);
    return (await res.json()) as { success: boolean; message: string };
  },

  pauseOptimizedImport: async (id: number) => {
    const res = await apiRequest("POST", `/api/metasync-optimized/import/${id}/pause`);
    return (await res.json()) as { success: boolean; message: string };
  },

  resumeOptimizedImport: async (id: number) => {
    const res = await apiRequest("POST", `/api/metasync-optimized/import/${id}/resume`);
    return (await res.json()) as { success: boolean; message: string };
  },

  processPendingRelations: async () => {
    const res = await apiRequest("POST", "/api/metasync-optimized/process-pending-relations");
    return (await res.json()) as { success: boolean; resolved: number };
  },

  async getSyncStatus(): Promise<any> {
    try {
      const response = await fetch("/api/metasync-optimized/sync-status");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Función para obtener el estado de una importación
  async getImportStatus(importId: number): Promise<ImportHistory> {
    const response = await fetch(`/api/import/${importId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Error al obtener estado de importación');
    }

    return response.json();
  },

  // Funciones para importación optimizada
  async startOptimizedImport2(type: 'vehicles' | 'parts' | 'all', options: any): Promise<{ importId: number }> {
    const response = await fetch(`/api/metasync-optimized/import/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error('Error al iniciar importación optimizada');
    }

    return response.json();
  },

  // Optimized parts import with enhanced monitoring
  async startOptimizedPartsImport(): Promise<{ success: boolean; importId: number }> {
    const response = await fetch('/api/optimized-parts/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Error al iniciar importación optimizada de piezas');
    }

    return response.json();
  },

  async getImportStats(): Promise<any> {
    const response = await fetch('/api/import/stats', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas de importación');
    }

    return response.json();
  },

  async controlImport(importId: number, action: 'pause' | 'resume' | 'cancel'): Promise<void> {
    const response = await fetch(`/api/import/${importId}/${action}`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error al ${action} la importación`);
    }
  },



  // Funciones de control de importaciones (unificadas)
  async updateScheduleConfig(scheduleId: number, updates: any): Promise<any> {
      const response = await fetch(`/api/import/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Error al actualizar programación');
      }

      return response.json();
    },

    async pauseImportOperation(importId: number): Promise<any> {
      const response = await fetch(`/api/metasync-optimized/import/${importId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al pausar importación');
      }

      return response.json();
    },

    async resumeImportOperation(importId: number): Promise<any> {
      const response = await fetch(`/api/metasync-optimized/import/${importId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al reanudar importación');
      }

      return response.json();
    },

    async cancelImportOperation(importId: number): Promise<any> {
      const response = await fetch(`/api/metasync-optimized/import/${importId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cancelar importación');
      }

      return response.json();
    },

    async deleteImportFromHistory(importId: number): Promise<any> {
      const response = await fetch(`/api/import/${importId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al eliminar importación del historial');
      }

      // Verificar que la respuesta tiene contenido antes de parsear
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return { success: true, message: 'Importación eliminada correctamente' };
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError, 'Response text:', responseText);
        return { success: true, message: 'Importación eliminada correctamente' };
      }
    },

    async deleteAllImportHistory(): Promise<any> {
      const response = await fetch('/api/import/clear-all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al eliminar todo el historial de importaciones');
      }

      // Verificar que la respuesta tiene contenido antes de parsear
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return { success: true, message: 'Historial eliminado correctamente' };
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError, 'Response text:', responseText);
        return { success: true, message: 'Historial eliminado correctamente' };
      }
    },

    async clearImportStatistics(): Promise<any> {
      const response = await fetch('/api/import/history/stats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al limpiar estadísticas de importación');
      }

      // Verificar que la respuesta tiene contenido antes de parsear
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return { success: true, message: 'Estadísticas limpiadas correctamente' };
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError, 'Response text:', responseText);
        return { success: true, message: 'Estadísticas limpiadas correctamente' };
      }
    },


};

// Tipo para estadísticas del dashboard
export type DashboardStats = {
  api: {
    vehiclesCount: number;
    partsCount: number;
  };
  database: {
    vehiclesCount: number;
    partsCount: number;
    vehiclesImportPercentage: number;
    partsImportPercentage: number;
  };
  timestamp: string | Date;
};

// API para diagnóstico
export const diagnosticApi = {
  runDiagnostic: async () => {
    const res = await apiRequest("GET", "/api/diagnostic");
    return (await res.json()) as ApiDiagnosticResponse;
  },

  // Prueba cualquier endpoint de la API Metasync
  // Para obtener vehículos, use RecuperarCambiosCanalEmpresa ya que contiene
  // información de vehículos en el campo 'vehiculos', mientras que 
  // RecuperarCambiosVehiculosCanalEmpresa no funciona correctamente
  testApiEndpoint: async (params: {
    method: string;
    fecha?: string;
    lastid?: string;
    offset?: string;
    idempresa?: number;
  }) => {
    const res = await apiRequest("POST", "/api/raw/test-metasync", params);
    return (await res.json()) as { 
      success: boolean; 
      method: string; 
      data?: any; 
      error?: string;
      statusCode?: number;
      headers?: Record<string, string>;
    };
  },

  // Método específico para verificar conteos y obtener muestras de vehículos y piezas
  // Nota: Los vehículos se obtienen a través de RecuperarCambiosCanalEmpresa
  // ya que RecuperarCambiosVehiculosCanalEmpresa no funciona correctamente
  checkCounts: async () => {
    // Verificar conteos de vehículos
    const vehicleCountResult = await diagnosticApi.testApiEndpoint({
      method: "ConteoVehiculosEmpresa",
      fecha: "01/01/2000 00:00:00",
      idempresa: 1476
    });

    // Verificar conteos de piezas
    const partCountResult = await diagnosticApi.testApiEndpoint({
      method: "ConteoPiezasEmpresa",
      fecha: "01/01/2000 00:00:00",
      idempresa: 1476
    });

    // Recuperar piezas y vehículos en una sola llamada usando RecuperarCambiosCanalEmpresa
    const combinedResult = await diagnosticApi.testApiEndpoint({
      method: "RecuperarCambiosCanalEmpresa",
      fecha: "01/01/2000 00:00:00",
      lastid: "0",
      offset: "1000", 
      idempresa: 1476
    });

    return {
      // Conteos totales de la API
      vehicleCount: vehicleCountResult.success ? (vehicleCountResult.data?.total || 0) : 0,
      partCount: partCountResult.success ? (partCountResult.data?.total || 0) : 0,

      // Elementos recuperados del endpoint RecuperarCambiosCanalEmpresa
      vehiclesRetrieved: combinedResult.success ? (combinedResult.data?.vehiculos?.length || 0) : 0,
      partsRetrieved: combinedResult.success ? (combinedResult.data?.piezas?.length || 0) : 0,
      timestamp: new Date().toISOString()
    };
  }
};

// API para estadísticas del dashboard
export const dashboardApi = {
  getStats: async () => {
    const res = await apiRequest("GET", "/api/dashboard/stats");
    return (await res.json()) as DashboardStats;
  }
};