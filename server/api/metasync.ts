import axios from 'axios';
import { 
  ApiConfiguration, 
  MetasyncVehicle, 
  MetasyncPart, 
  MetasyncPaginationResponse, 
  MetasyncStockRequest,
  MetasyncVehicleResponse,
  MetasyncPartResponse
} from '@shared/types';

// URL base de la API Metasync (según la documentación proporcionada)
const METASYNC_BASE_URL = 'https://apis.metasync.com';
const METASYNC_ALMACEN_URL = `${METASYNC_BASE_URL}/Almacen`;
const METASYNC_PEDIDOS_URL = `${METASYNC_BASE_URL}/Pedidos`;

// Tipo para almacenar resultados de diagnóstico
export interface ApiDiagnosticResult {
  endpoint: string;
  method: string;
  url: string;
  success: boolean;
  status?: number;
  message: string;
  responseData?: any;
  headers?: any;
  timestamp: Date;
}

class MetasyncApi {
  config: ApiConfiguration | null = null;

  /**
   * Establece la configuración para las llamadas a la API
   */
  setConfig(config: ApiConfiguration) {
    this.config = config;
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): ApiConfiguration | null {
    return this.config;
  }

  /**
   * Comprueba si la configuración está establecida
   */
  private ensureConfig() {
    if (!this.config) {
      throw new Error('La configuración de la API no está establecida');
    }
  }

  /**
   * Recupera los cambios de vehículos a partir de una fecha
   * Utiliza RecuperarCambiosCanal para obtener vehículos 
   */
  async getVehicleChanges(
    fromDate: Date, 
    lastId: number = 0, 
    offset: number = 1000
  ): Promise<MetasyncVehicleResponse | MetasyncPaginationResponse<MetasyncVehicle>> {
    this.ensureConfig();

    try {
      // Convertir fecha al formato requerido: dd/MM/yyyy HH:mm:ss
      const formattedDate = this.formatDate(fromDate);

      // Usamos RecuperarCambiosVehiculosCanal para obtener vehículos completos
      console.log(`getVehicleChanges: Obteniendo vehículos desde ${formattedDate}, lastId: ${lastId}, offset: ${offset}`);
      const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosVehiculosCanal`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': lastId.toString(),
          'offset': offset.toString()
        }
      });

      // Log detallado para debuggear respuesta
      console.log(`getVehicleChanges: Recibida respuesta de RecuperarCambiosVehiculosCanal`);
      
      // Si no hay datos o la respuesta está vacía, manejar de forma segura
      if (!response || !response.data) {
        console.log('getVehicleChanges: Respuesta vacía o inválida');
        return {
          vehiculos: [],
          result_set: {
            lastId: lastId,
            count: 0,
            total: 0,
            offset: 0
          }
        };
      }
      
      // Si la respuesta es OK=1 pero no hay vehículos (caso común en API)
      if (response.data.Ok === "1" && (!response.data.vehiculos || !Array.isArray(response.data.vehiculos))) {
        console.log('getVehicleChanges: Respuesta con Ok=1 pero sin vehículos (válido)');
        return {
          vehiculos: [],
          result_set: {
            lastId: lastId, 
            count: 0, 
            total: 0,
            offset: 0
          }
        };
      }
      
      console.log(`getVehicleChanges: data: ${JSON.stringify(response.data || {})}`);
      
      // Manejo seguro para evitar null reference
      const vehiculos = Array.isArray(response.data?.vehiculos) ? response.data.vehiculos : [];
      
      if (vehiculos.length > 0) {
        console.log(`getVehicleChanges: Contiene ${vehiculos.length} vehículos`);
      } else {
        console.log('getVehicleChanges: No se encontraron vehículos o la respuesta está vacía');
      }

      // Extraemos solo los vehículos de la respuesta con seguridad ante nulos
      return {
        vehiculos: vehiculos,
        result_set: response.data?.result_set || { 
          lastId: lastId, 
          count: 0, 
          total: 0,
          offset: 0
        }
      };
    } catch (error) {
      console.error('Error al recuperar cambios de vehículos:', error);
      throw new Error(`Error al recuperar cambios de vehículos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Formatea una fecha al formato requerido por la API: dd/MM/yyyy HH:mm:ss
   * Si la API necesita solo fecha sin hora, usa formatShortDate
   */
  formatDate(dateInput: Date | string): string {
    try {
      // Aseguramos que estamos trabajando con un objeto Date
      let date: Date;
      
      if (typeof dateInput === 'string') {
        // Intentar parsear la fecha de diferentes formatos
        if (dateInput.match(/^\d{4}-\d{2}-\d{2}T/)) {
          // ISO format (2023-01-30T15:30:45.000Z)
          date = new Date(dateInput);
        } else if (dateInput.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          // dd/MM/yyyy
          const parts = dateInput.split(' ')[0].split('/');
          const timeParts = dateInput.split(' ')[1]?.split(':') || ['00', '00', '00'];
          date = new Date(
            parseInt(parts[2]), // year
            parseInt(parts[1]) - 1, // month (0-based)
            parseInt(parts[0]), // day
            parseInt(timeParts[0]), // hours
            parseInt(timeParts[1]), // minutes
            parseInt(timeParts[2] || '0') // seconds
          );
        } else {
          // Intentar con constructor normal
          date = new Date(dateInput);
        }
      } else {
        date = dateInput;
      }
      
      // Verificar que date es un objeto Date válido
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error(`Fecha inválida: ${dateInput}, usando fecha actual`);
        date = new Date(); // Usar fecha actual como fallback
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');

      // Formato dd/MM/yyyy HH:mm:ss según la documentación de la API
      const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      console.log(`Formateando fecha ${date.toISOString()} a ${formattedDate}`);
      return formattedDate;
    } catch (error) {
      console.error(`Error al formatear fecha ${dateInput}:`, error);
      // Retornar formato con fecha actual como fallback
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      return `${day}/${month}/${year} 00:00:00`;
    }
  }
  
  /**
   * Formatea solo la parte de fecha (sin hora) al formato dd/MM/yyyy
   * Útil cuando la API no requiere el componente de hora
   */
  formatShortDate(dateInput: Date | string): string {
    const fullDate = this.formatDate(dateInput);
    return fullDate.split(' ')[0]; // Devuelve solo la parte de la fecha
  }

  /**
   * Recupera los cambios de vehículos para una empresa específica
   * Utiliza el endpoint RecuperarCambiosCanal para obtener vehículos
   */
  async getVehicleChangesForCompany(
    fromDate: Date, 
    companyId: number,
    lastId: number = 0, 
    offset: number = 1000
  ): Promise<MetasyncPaginationResponse<MetasyncVehicle>> {
    this.ensureConfig();

    try {
      const formattedDate = this.formatDate(fromDate);
      
      console.log(`getVehicleChangesForCompany: Usando RecuperarCambiosCanal`);

      const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanal`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': lastId.toString(),
          'offset': offset.toString()
        }
      });

      // Log para diagnóstico
      console.log(`getVehicleChangesForCompany: Respuesta recibida. Contiene vehículos: ${!!response.data?.vehiculos}`);
      if (response.data?.vehiculos) {
        console.log(`getVehicleChangesForCompany: Encontrados ${response.data.vehiculos.length} vehículos`);
      }
      
      // Extraemos solo los vehículos de la respuesta
      if (response.data && response.data.vehiculos) {
        return {
          elements: response.data.vehiculos || [],
          pagination: {
            lastId: response.data.result_set?.lastId || 0,
            hasMore: (response.data.result_set?.total || 0) > (response.data.result_set?.count || 0)
          }
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error al recuperar cambios de vehículos para empresa:', error);
      throw new Error(`Error al recuperar cambios de vehículos para empresa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Recupera las piezas a partir de una fecha
   * Utiliza RecuperarCambiosCanalEmpresa para obtener las piezas
   */
  async getPartChanges(
    fromDate: Date, 
    lastId: number = 0, 
    offset: number = 1000
  ): Promise<MetasyncPartResponse | MetasyncPaginationResponse<MetasyncPart>> {
    this.ensureConfig();

    try {
      const formattedDate = this.formatDate(fromDate);
      
      console.log(`getPartChanges: Obteniendo piezas con RecuperarCambiosCanalEmpresa para idEmpresa=${this.config!.companyId}`);

      const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanalEmpresa`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': lastId.toString(),
          'offset': offset.toString(),
          'idempresa': this.config!.companyId.toString()
        }
      });
      
      // Log para diagnóstico
      if (response.data?.piezas) {
        console.log(`getPartChanges: Encontradas ${response.data.piezas.length} piezas`);
      }

      return response.data;
    } catch (error) {
      console.error('Error al recuperar cambios de piezas:', error);
      throw new Error(`Error al recuperar cambios de piezas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Recupera las piezas para una empresa específica
   * Usa RecuperarCambiosCanalEmpresa según los requisitos actualizados
   */
  async getPartChangesForCompany(
    fromDate: Date, 
    companyId: number,
    lastId: number = 0, 
    offset: number = 1000
  ): Promise<MetasyncPartResponse | MetasyncPaginationResponse<MetasyncPart>> {
    this.ensureConfig();

    try {
      const formattedDate = this.formatDate(fromDate);
      
      console.log(`getPartChangesForCompany: Usando RecuperarCambiosCanalEmpresa para la empresa ${companyId}`);

      // Usamos RecuperarCambiosCanalEmpresa para empresas específicas
      const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanalEmpresa`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': lastId.toString(),
          'offset': offset.toString(),
          'idempresa': companyId.toString()
        }
      });
      
      // Log para diagnóstico
      if (response.data?.piezas) {
        console.log(`getPartChangesForCompany: Encontradas ${response.data.piezas.length} piezas`);
      }

      return response.data;
    } catch (error) {
      console.error('Error al recuperar cambios de piezas para empresa:', error);
      throw new Error(`Error al recuperar cambios de piezas para empresa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene el conteo de piezas 
   * Usa ConteoPiezasEmpresa según los requisitos específicos de la empresa
   */
  async getPartCount(fromDate?: Date): Promise<number> {
    this.ensureConfig();

    try {
      // Si no se pasa fecha, usamos una fecha antigua para obtener todos
      const dateToUse = fromDate || new Date('2000-01-01');
      const formattedDate = this.formatDate(dateToUse);
      
      console.log(`getPartCount: Obteniendo conteo de piezas con ConteoPiezasEmpresa para idEmpresa=${this.config!.companyId}`);

      const response = await axios.get(`${METASYNC_ALMACEN_URL}/ConteoPiezasEmpresa`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'idempresa': this.config!.companyId.toString()
        }
      });

      console.log(`getPartCount: Conteo recibido: ${JSON.stringify(response.data)}`);
      
      // Verificar diferentes formatos posibles de respuesta
      if (typeof response.data?.total === 'number') {
        return response.data.total;
      } else if (typeof response.data?.count === 'number') {
        return response.data.count;
      } else if (typeof response.data?.total === 'string' && !isNaN(parseInt(response.data.total))) {
        return parseInt(response.data.total);
      } else if (typeof response.data === 'number') {
        return response.data;
      } else {
        // Si no podemos encontrar el conteo en la respuesta, intentamos usar otro método
        console.log('No se pudo obtener el conteo directamente. Intentando obtener la primera página de resultados...');
        
        // Intentar obtener la primera página para ver el total
        const partsResponse = await this.getPartChangesForCompany(dateToUse, this.config!.companyId, 0, 1);
        if (partsResponse?.result_set?.total) {
          console.log(`Conteo obtenido a través de result_set: ${partsResponse.result_set.total}`);
          return typeof partsResponse.result_set.total === 'string' 
            ? parseInt(partsResponse.result_set.total) 
            : partsResponse.result_set.total;
        }
        
        return 0;
      }
    } catch (error) {
      console.error('Error al obtener conteo de piezas:', error);
      // En caso de error, intentamos obtener el conteo a través de otra vía
      try {
        console.log('Intentando obtener conteo a través del endpoint de cambios...');
        const partsResponse = await this.getPartChangesForCompany(fromDate || new Date('2000-01-01'), this.config!.companyId, 0, 1);
        if (partsResponse?.result_set?.total) {
          console.log(`Conteo alternativo obtenido: ${partsResponse.result_set.total}`);
          return typeof partsResponse.result_set.total === 'string' 
            ? parseInt(partsResponse.result_set.total) 
            : partsResponse.result_set.total;
        }
      } catch (altError) {
        console.error('También falló el método alternativo:', altError);
      }
      
      throw new Error(`Error al obtener conteo de piezas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene el conteo de vehículos
   * Usa ConteoVehiculosEmpresa según los requisitos específicos de la empresa
   */
  async getVehicleCount(fromDate?: Date): Promise<number> {
    this.ensureConfig();

    try {
      // Si no se pasa fecha, usamos una fecha antigua para obtener todos
      const dateToUse = fromDate || new Date('2000-01-01');
      const formattedDate = this.formatDate(dateToUse);
      
      console.log(`getVehicleCount: Obteniendo conteo de vehículos con ConteoVehiculosEmpresa para idEmpresa=${this.config!.companyId}`);

      const response = await axios.get(`${METASYNC_ALMACEN_URL}/ConteoVehiculosEmpresa`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'idempresa': this.config!.companyId.toString()
        }
      });

      console.log(`getVehicleCount: Conteo recibido: ${JSON.stringify(response.data)}`);
      
      // Verificar diferentes formatos posibles de respuesta
      if (typeof response.data?.total === 'number') {
        return response.data.total;
      } else if (typeof response.data?.count === 'number') {
        return response.data.count;
      } else if (typeof response.data?.total === 'string' && !isNaN(parseInt(response.data.total))) {
        return parseInt(response.data.total);
      } else if (typeof response.data === 'number') {
        return response.data;
      } else {
        // Si no podemos encontrar el conteo en la respuesta, intentamos usar otro método
        console.log('No se pudo obtener el conteo directamente. Intentando obtener la primera página de resultados...');
        
        // Intentar obtener la primera página para ver el total
        // Usamos getPartChanges para mantener consistencia con la importación
        const responseFromPartChanges = await this.getPartChanges(dateToUse, 0, 1);
        if (responseFromPartChanges?.vehiculos && Array.isArray(responseFromPartChanges.vehiculos) && 
            responseFromPartChanges.vehiculos.length > 0 && responseFromPartChanges?.result_set?.total) {
          console.log(`Conteo de vehículos obtenido a través de getPartChanges: ${responseFromPartChanges.result_set.total}`);
          return typeof responseFromPartChanges.result_set.total === 'string' 
            ? parseInt(responseFromPartChanges.result_set.total) 
            : responseFromPartChanges.result_set.total;
        }
        
        // Si falla, intentamos con el método tradicional
        const vehiclesResponse = await this.getVehicleChangesForCompany(dateToUse, this.config!.companyId, 0, 1);
        if (vehiclesResponse?.result_set?.total) {
          console.log(`Conteo obtenido a través de getVehicleChangesForCompany: ${vehiclesResponse.result_set.total}`);
          return typeof vehiclesResponse.result_set.total === 'string' 
            ? parseInt(vehiclesResponse.result_set.total) 
            : vehiclesResponse.result_set.total;
        }
        
        return 0;
      }
    } catch (error) {
      console.error('Error al obtener conteo de vehículos:', error);
      // En caso de error, intentamos obtener el conteo a través de otra vía
      try {
        console.log('Intentando obtener conteo a través de getPartChanges (para mantener consistencia)...');
        // Usamos getPartChanges para mantener consistencia con la importación
        const responseFromPartChanges = await this.getPartChanges(fromDate || new Date('2000-01-01'), 0, 1);
        if (responseFromPartChanges?.vehiculos && Array.isArray(responseFromPartChanges.vehiculos) && responseFromPartChanges.vehiculos.length > 0) {
          console.log(`Total de vehículos en la primera página: ${responseFromPartChanges.vehiculos.length}`);
          
          if (responseFromPartChanges?.result_set?.total) {
            console.log(`Conteo alternativo obtenido a través de getPartChanges: ${responseFromPartChanges.result_set.total}`);
            return typeof responseFromPartChanges.result_set.total === 'string' 
              ? parseInt(responseFromPartChanges.result_set.total) 
              : responseFromPartChanges.result_set.total;
          }
        }
        
        // Si falla, intentamos con el método tradicional
        console.log('Fallback: Intentando obtener conteo a través del endpoint de vehículos...');
        const vehiclesResponse = await this.getVehicleChangesForCompany(fromDate || new Date('2000-01-01'), this.config!.companyId, 0, 1);
        if (vehiclesResponse?.result_set?.total) {
          console.log(`Conteo alternativo obtenido a través de getVehicleChangesForCompany: ${vehiclesResponse.result_set.total}`);
          return typeof vehiclesResponse.result_set.total === 'string' 
            ? parseInt(vehiclesResponse.result_set.total) 
            : vehiclesResponse.result_set.total;
        }
      } catch (altError) {
        console.error('También fallaron los métodos alternativos:', altError);
      }
      
      throw new Error(`Error al obtener conteo de vehículos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Inserta o actualiza piezas y vehículos
   */
  async insertStock(data: MetasyncStockRequest): Promise<any> {
    this.ensureConfig();

    try {
      const response = await axios.post(`${METASYNC_BASE_URL}/InventarioUPSERT`, data, {
        headers: {
          'apikey': this.config!.apiKey,
          'idempresa': this.config!.companyId.toString(),
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error al insertar stock:', error);
      throw new Error(`Error al insertar stock: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Elimina piezas
   */
  async deleteParts(partIds: number[]): Promise<any> {
    this.ensureConfig();

    try {
      const response = await axios.post(`${METASYNC_BASE_URL}/DeleteParts`, partIds, {
        headers: {
          'apikey': this.config!.apiKey,
          'idempresa': this.config!.companyId.toString(),
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error al eliminar piezas:', error);
      throw new Error(`Error al eliminar piezas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene todos los vehículos disponibles
   * Utiliza RecuperarCambiosCanalEmpresa para obtener todos los vehículos a través del endpoint de piezas
   * porque el endpoint específico de vehículos (RecuperarCambiosVehiculosCanalEmpresa) no funciona correctamente
   * 
   * @param limit - Cantidad máxima de vehículos a recuperar (máximo 1000)
   * @param lastId - ID desde el que continuar paginando (opcional)
   * @returns Respuesta con vehículos
   */
  async getVehicles(limit: number = 1000, lastId: number = 0): Promise<MetasyncVehicleResponse | MetasyncPaginationResponse<MetasyncVehicle>> {
    this.ensureConfig();

    try {
      // Fecha 20 años atrás para obtener todos los vehículos
      const fromDate = new Date('2000-01-01');
      console.log(`getVehicles: Recuperando vehículos desde ${fromDate.toISOString()}`);

      const formattedDate = this.formatDate(fromDate);
      console.log(`getVehicles: Fecha formateada: ${formattedDate}`);

      // Obtener vehículos utilizando RecuperarCambiosVehiculosCanal
      console.log(`getVehicles: Obteniendo vehículos vía RecuperarCambiosVehiculosCanal`);
      try {
        const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosVehiculosCanal`, {
          headers: {
            'apikey': this.config!.apiKey,
            'fecha': formattedDate,
            'lastid': lastId.toString(),
            'offset': limit.toString()
          }
        });
        
        // Verificamos si la respuesta contiene vehículos
        if (response.data && response.data.vehiculos && response.data.vehiculos.length > 0) {
          console.log(`getVehicles: RecuperarCambiosCanal devolvió ${response.data.vehiculos.length} vehículos`);
          return response.data;
        } else {
          console.log(`getVehicles: RecuperarCambiosCanal no devolvió vehículos`);
          return { 
            vehiculos: [], 
            result_set: { lastId: 0, count: 0, total: 0, offset: 0 } 
          };
        }
      } catch (error) {
        console.error(`getVehicles: Error al obtener vehículos con RecuperarCambiosCanal: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        
        // Si falla, intentamos con el método alternativo (RecuperarCambiosCanalEmpresa)
        console.log(`getVehicles: Intentando método alternativo con RecuperarCambiosCanalEmpresa`);
        const basicResponse = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanalEmpresa`, {
          headers: {
            'apikey': this.config!.apiKey,
            'fecha': formattedDate,
            'lastid': lastId.toString(),
            'offset': limit.toString(),
            'idempresa': this.config!.companyId.toString()
          }
        });

        // Verificamos si la respuesta básica contiene vehículos
        if (!basicResponse.data || !basicResponse.data.vehiculos || basicResponse.data.vehiculos.length === 0) {
          console.log(`getVehicles: No se pudieron obtener vehículos de RecuperarCambiosCanalEmpresa`);
          return { 
            vehiculos: [], 
            result_set: { lastId: 0, count: 0, total: 0, offset: 0 } 
          };
        }

        const basicVehicles = basicResponse.data.vehiculos;
        const resultSet = basicResponse.data.result_set;
        console.log(`getVehicles: RecuperarCambiosCanalEmpresa devolvió ${basicVehicles.length} vehículos básicos`);
        
        return {
          vehiculos: basicVehicles,
          result_set: resultSet
        };
      }
    } catch (error) {
      console.error('Error al obtener vehículos:', error);
      throw new Error(`Error al obtener vehículos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Convierte una respuesta de vehículos al formato antiguo (para compatibilidad)
   */
  convertVehicleResponseToLegacy(response: MetasyncVehicleResponse): MetasyncPaginationResponse<MetasyncVehicle> {
    return {
      elements: response.vehiculos || [],
      pagination: {
        lastId: response.result_set?.lastId || 0,
        hasMore: (response.result_set?.total || 0) > (response.result_set?.count || 0)
      }
    };
  }

  /**
   * Obtiene todas las piezas disponibles
   * Utiliza RecuperarCambiosCanalEmpresa para obtener todas las piezas
   * 
   * @param limit - Cantidad máxima de piezas a recuperar (máximo 1000)
   * @param lastId - ID desde el que continuar paginando (opcional)
   */
  async getParts(limit: number = 1000, lastId: number = 0): Promise<MetasyncPartResponse | MetasyncPaginationResponse<MetasyncPart>> {
    this.ensureConfig();

    try {
      // Fecha 20 años atrás para obtener todas las piezas (asegurando recuperar todas)
      const fromDate = new Date('2000-01-01');
      console.log(`getParts: Recuperando piezas desde ${fromDate.toISOString()}`);

      // Llamamos directamente al endpoint sin pasar por getPartChanges para tener más control
      const formattedDate = this.formatDate(fromDate);
      console.log(`getParts: Fecha formateada: ${formattedDate}`);

      // PASO 1: Obtener piezas y vehículos básicos desde RecuperarCambiosCanalEmpresa
      console.log(`getParts: PASO 1 - Obteniendo piezas y vehículos básicos con RecuperarCambiosCanalEmpresa`);
      const basicResponse = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanalEmpresa`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': lastId.toString(),
          'offset': limit.toString(),
          'idempresa': this.config!.companyId.toString()
        }
      });

      // Log detallado para depuración de la respuesta
      console.log(`getParts: Respuesta básica recibida.`);
      
      // Si no hay datos o la respuesta está vacía, manejar de forma segura
      if (!basicResponse || !basicResponse.data) {
        console.log('getParts: Respuesta vacía o inválida');
        return {
          piezas: [],
          vehiculos: [],
          result_set: {
            lastId: lastId,
            count: 0,
            total: 0,
            offset: 0
          }
        };
      }
      
      // Si la respuesta es OK=1 pero no hay piezas (caso común en API)
      if (basicResponse.data.Ok === "1" && (!basicResponse.data.piezas || !Array.isArray(basicResponse.data.piezas))) {
        console.log('getParts: Respuesta con Ok=1 pero sin piezas (válido)');
        return {
          piezas: [],
          vehiculos: [],
          result_set: {
            lastId: lastId, 
            count: 0, 
            total: 0,
            offset: 0
          }
        };
      }
      
      // Normalizar arrays de piezas y vehículos para seguridad
      const piezas = Array.isArray(basicResponse.data.piezas) ? basicResponse.data.piezas : [];
      const vehiculos = Array.isArray(basicResponse.data.vehiculos) ? basicResponse.data.vehiculos : [];
      
      console.log(`getParts: Total piezas: ${piezas.length}, Total vehículos: ${vehiculos.length}`);
      console.log(`getParts: Información de paginación:`, 
        basicResponse.data?.result_set ? 
          `lastId: ${basicResponse.data.result_set.lastId}, total: ${basicResponse.data.result_set.total}` : 
          'No hay información de paginación');
          
      // PASO 2: Intentar enriquecer los vehículos con información adicional
      // Si hay vehículos, intentamos obtener detalles adicionales con RecuperarCambiosVehiculosCanal
      let enrichedVehicles = basicResponse.data?.vehiculos || [];
      if (basicResponse.data?.vehiculos && basicResponse.data.vehiculos.length > 0) {
        try {
          console.log(`getParts: PASO 2 - Intentando enriquecer vehículos con RecuperarCambiosVehiculosCanal`);
          const detailResponse = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosVehiculosCanal`, {
            headers: {
              'apikey': this.config!.apiKey,
              'fecha': formattedDate,
              'lastid': lastId.toString(),
              'offset': limit.toString()
            }
          });

          if (detailResponse.data && detailResponse.data.vehiculos && detailResponse.data.vehiculos.length > 0) {
            console.log(`getParts: RecuperarCambiosVehiculosCanal devolvió ${detailResponse.data.vehiculos.length} vehículos detallados`);
            
            // Creamos un mapa para buscar rápidamente los vehículos por su ID local
            const detailVehiclesMap = new Map<number, any>();
            (detailResponse.data.vehiculos as any[]).forEach((vehicle: any) => {
              // Comprobar si es formato antiguo (IdLocal) o nuevo (idLocal)
              const idLocal = vehicle.IdLocal !== undefined ? vehicle.IdLocal : vehicle.idLocal;
              if (idLocal !== undefined) {
                detailVehiclesMap.set(idLocal, vehicle);
              }
            });

            // Combinamos la información básica con la detallada
            enrichedVehicles = (basicResponse.data.vehiculos as any[]).map((basicVehicle: any) => {
              // Comprobar si es formato antiguo (IdLocal) o nuevo (idLocal)
              const idLocal = basicVehicle.IdLocal !== undefined ? basicVehicle.IdLocal : basicVehicle.idLocal;
              if (idLocal !== undefined) {
                const detailVehicle = detailVehiclesMap.get(idLocal);
                if (detailVehicle) {
                  // Si encontramos datos detallados, los mezclamos
                  return { ...basicVehicle, ...detailVehicle };
                }
              }
              return basicVehicle; // Si no encontramos datos detallados, usamos los básicos
            });
            
            console.log(`getParts: Datos de vehículos enriquecidos satisfactoriamente`);
          } else {
            console.log(`getParts: RecuperarCambiosVehiculosCanal no devolvió vehículos adicionales`);
          }
        } catch (enrichError) {
          console.warn(`getParts: Error al enriquecer vehículos: ${enrichError instanceof Error ? enrichError.message : 'Error desconocido'}`);
          console.log(`getParts: Continuando con datos básicos de RecuperarCambiosCanalEmpresa`);
        }
      }
      
      // Preparamos la respuesta final con los datos enriquecidos
      const finalResponse = {
        ...basicResponse.data,
        vehiculos: enrichedVehicles
      };

      // Asegurarnos de que la respuesta tiene la estructura correcta para paginación
      if (finalResponse && finalResponse.piezas && !finalResponse.result_set) {
        // Si tenemos piezas pero no tenemos información de paginación, añadirla
        const lastPiece = finalResponse.piezas.length > 0 ? 
                          finalResponse.piezas[finalResponse.piezas.length - 1] : null;
        
        finalResponse.result_set = {
          total: finalResponse.piezas.length, // Solo el total de esta página
          count: finalResponse.piezas.length,
          offset: 0,
          lastId: lastPiece ? lastPiece.refLocal : lastId
        };
        
        console.log(`getParts: Añadida estructura de paginación:`, finalResponse.result_set);
      }

      return finalResponse;
    } catch (error) {
      console.error('Error al obtener piezas:', error);
      throw new Error(`Error al obtener piezas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Convierte una respuesta de piezas al formato antiguo (para compatibilidad)
   */
  convertPartResponseToLegacy(response: MetasyncPartResponse): MetasyncPaginationResponse<MetasyncPart> {
    return {
      elements: response.piezas || [],
      pagination: {
        lastId: response.result_set?.lastId || 0,
        hasMore: (response.result_set?.total || 0) > (response.result_set?.count || 0)
      }
    };
  }

  /**
   * Realiza un diagnóstico completo de la API
   * Comprueba la conectividad con todos los endpoints
   */
  async runDiagnostic(): Promise<ApiDiagnosticResult[]> {
    this.ensureConfig();

    const results: ApiDiagnosticResult[] = [];
    // Usamos una fecha más antigua para asegurar que encontremos todas las piezas y vehículos
    const fromDate = new Date('2000-01-01');
    console.log("Diagnóstico: Usando fecha de referencia para tests:", fromDate.toISOString());
    console.log(`Diagnóstico: API configurada para empresa ${this.config!.companyId}`);
    console.log(`Diagnóstico: Estado completo de config:`, JSON.stringify(this.config));

    const formattedDate = this.formatDate(fromDate);

    // Lista de endpoints a probar según los requerimientos actualizados
    const endpoints = [
      // Endpoints para conteos
      {
        name: 'Conteo de Piezas',
        url: `${METASYNC_ALMACEN_URL}/ConteoPiezas`,
        method: 'GET',
        description: 'Obtiene el número total de piezas',
        endpoint: '/Almacen/ConteoPiezas',
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate
        }
      },
      {
        name: 'Conteo de Vehículos',
        url: `${METASYNC_ALMACEN_URL}/ConteoVehiculos`,
        method: 'GET',
        description: 'Obtiene el número total de vehículos',
        endpoint: '/Almacen/ConteoVehiculos',
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate
        }
      },
      // Endpoints para obtener piezas y vehículos
      {
        name: 'Recuperar Cambios Canal',
        url: `${METASYNC_ALMACEN_URL}/RecuperarCambiosCanal`,
        method: 'GET',
        description: 'Obtiene piezas y vehículos con RecuperarCambiosCanal',
        endpoint: '/Almacen/RecuperarCambiosCanal',
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': '0',
          'offset': '100'
        }
      },
      {
        name: 'Recuperar Cambios Vehículos Canal',
        url: `${METASYNC_ALMACEN_URL}/RecuperarCambiosVehiculosCanal`,
        method: 'GET',
        description: 'Obtiene vehículos con RecuperarCambiosVehiculosCanal',
        endpoint: '/Almacen/RecuperarCambiosVehiculosCanal',
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': '0',
          'offset': '100'
        }
      }
    ];

    // Ejecutar tests para cada endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`Probando endpoint: ${endpoint.name} (${endpoint.url})`);
        console.log(`Diagnóstico: Headers:`, endpoint.headers);

        console.log(`Diagnóstico: Realizando petición ${endpoint.method} a ${endpoint.url}`);
        
        const response = await axios({
          method: endpoint.method as any,
          url: endpoint.url,
          headers: endpoint.headers,
          data: (endpoint as any).data, // Enviamos los datos si es un POST
          timeout: 10000 // 10 segundos de timeout
        });
        
        console.log(`Diagnóstico: Respuesta recibida con estado ${response.status}`);
        if (response.data) {
          console.log(`Diagnóstico: Tipo de respuesta:`, typeof response.data);
          if (typeof response.data === 'object') {
            console.log(`Diagnóstico: Claves en la respuesta:`, Object.keys(response.data).join(', '));
            console.log(`Diagnóstico: Piezas encontradas:`, response.data.piezas?.length || 0);
            console.log(`Diagnóstico: Vehículos encontrados:`, response.data.vehiculos?.length || 0);
            if (response.data.result_set) {
              console.log(`Diagnóstico: Información de paginación:`, response.data.result_set);
            }
          }
        }

        // Formatear la respuesta según el tipo de endpoint
        let formattedData = null;
        if (response.data) {
          if (endpoint.name.includes('Conteo')) {
            // Para endpoints de conteo, mostrar el número directamente
            const count = typeof response.data === 'number' ? response.data : 0;
            formattedData = {
              count: count,
              type: typeof response.data,
              summary: `Total: ${count} ${endpoint.name.includes('Piezas') ? 'piezas' : 'vehículos'}`
            };
          } else if (typeof response.data === 'object') {
            // Para otros endpoints, mostrar conteos específicos
            const totalItems = response.data.result_set?.total || 0;
            const piezasCount = response.data.piezas?.length || 0;
            const vehiculosCount = response.data.vehiculos?.length || 0;
            const currentItems = piezasCount + vehiculosCount;
            
            let itemType = '';
            if (piezasCount > 0) itemType = 'piezas';
            else if (vehiculosCount > 0) itemType = 'vehículos';
            else itemType = endpoint.name.includes('Vehículos') ? 'vehículos' : 'piezas';
            
            formattedData = {
              type: typeof response.data,
              itemCount: {
                total: totalItems,
                current: currentItems,
                piezas: piezasCount,
                vehiculos: vehiculosCount,
                type: itemType
              },
              summary: `${currentItems} ${itemType} encontrados (total: ${totalItems})`,
              pagination: response.data.result_set ? {
                lastId: response.data.result_set.lastId,
                count: response.data.result_set.count,
                total: response.data.result_set.total,
                offset: response.data.result_set.offset
              } : undefined
            };
          } else {
            formattedData = { value: response.data, type: typeof response.data };
          }
        }

        results.push({
          endpoint: endpoint.name,
          method: endpoint.method,
          url: endpoint.url,
          success: true,
          status: response.status,
          message: 'Conexión exitosa',
          responseData: formattedData,
          headers: endpoint.headers,
          timestamp: new Date()
        });

      } catch (error: any) {
        console.error(`Error al probar endpoint ${endpoint.name}:`, error);

        let status: number | undefined;
        let message = 'Error desconocido';

        if (error.response) {
          // La solicitud fue realizada y el servidor respondió con un código de estado
          status = error.response.status;
          message = `Error ${status}: ${error.response.statusText || 'Sin mensaje'}`;
        } else if (error.request) {
          // La solicitud fue realizada pero no se recibió respuesta
          message = 'No se recibió respuesta del servidor';
        } else {
          // Algo sucedió al configurar la solicitud que desencadenó un error
          message = error.message || 'Error al configurar la solicitud';
        }

        results.push({
          endpoint: endpoint.name,
          method: endpoint.method,
          url: endpoint.url,
          success: false,
          status,
          message,
          headers: endpoint.headers,
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Obtiene datos crudos de vehículos para la vista de diagnóstico
   */
  async getRawVehicles(options: { limit?: number } = {}): Promise<any> {
    this.ensureConfig();
    
    const { limit = 20 } = options;
    
    try {
      // Usamos RecuperarCambiosCanal para obtener vehículos con piezas asociadas
      const referenceDate = new Date(2000, 0, 1); // Fecha de referencia para obtener todos los datos
      const formattedDate = this.formatDate(referenceDate);
      
      console.log(`getRawVehicles: Obteniendo ${limit} vehículos crudos desde ${formattedDate}`);
      
      const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanal`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': '0',
          'offset': limit.toString()
        },
        timeout: 30000
      });

      console.log(`getRawVehicles: Respuesta recibida con estado ${response.status}`);
      console.log(`getRawVehicles: Estructura de respuesta:`, Object.keys(response.data || {}));
      console.log(`getRawVehicles: Cantidad de vehículos en response.data.vehiculos:`, response.data?.vehiculos?.length || 0);
      
      if (response.data && response.data.vehiculos) {
        return {
          vehiculos: response.data.vehiculos,
          total: response.data.result_set?.total || response.data.vehiculos.length,
          limit: limit,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        vehiculos: [],
        total: 0,
        limit: limit,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error obteniendo vehículos crudos:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos crudos de piezas para la vista de diagnóstico
   */
  async getRawParts(options: { limit?: number } = {}): Promise<any> {
    this.ensureConfig();
    
    const { limit = 20 } = options;
    
    try {
      // Usamos RecuperarCambiosCanal para obtener piezas
      const referenceDate = new Date(2000, 0, 1); // Fecha de referencia para obtener todos los datos
      const formattedDate = this.formatDate(referenceDate);
      
      console.log(`getRawParts: Obteniendo ${limit} piezas crudas desde ${formattedDate}`);
      
      const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanal`, {
        headers: {
          'apikey': this.config!.apiKey,
          'fecha': formattedDate,
          'lastid': '0',
          'offset': limit.toString()
        },
        timeout: 30000
      });

      console.log(`getRawParts: Respuesta recibida con estado ${response.status}`);
      console.log(`getRawParts: Estructura de respuesta:`, Object.keys(response.data || {}));
      console.log(`getRawParts: Cantidad de piezas en response.data.piezas:`, response.data?.piezas?.length || 0);
      
      if (response.data && response.data.piezas) {
        return {
          piezas: response.data.piezas,
          total: response.data.result_set?.total || response.data.piezas.length,
          limit: limit,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        piezas: [],
        total: 0,
        limit: limit,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error obteniendo piezas crudas:', error);
      throw error;
    }
  }
}

// Exportar una instancia singleton
export const metasyncApi = new MetasyncApi();

// Establecer la configuración por defecto
metasyncApi.setConfig({
  apiKey: process.env.METASYNC_API_KEY || 'MS-eFSM7WXIDtM1nJf8q6hL5YOqRa1eLigps',
  companyId: Number(process.env.METASYNC_COMPANY_ID) || 1236,
  channel: process.env.METASYNC_CHANNEL || 'Doc_Apis'
});