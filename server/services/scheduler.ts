import { storage } from '../storage';
import { metasyncApi } from '../api/metasync';
import { ImportSchedule, InsertImportHistory, vehicles, vehicleParts, parts, Vehicle } from '@shared/schema';
import { eq, like, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { ApiConfiguration, MetasyncVehicle, MetasyncVehicleNew, MetasyncPart } from '@shared/types';
import * as batchProcessor from '../batch-processor-fixed2';
import { normalizeVehicleData, normalizePartData } from '../utils/array-normalizer';
import { MetasyncOptimizedImportService } from '../api/metasync-optimized-import-service';

/**
 * Encuentra un vehículo que coincida con los criterios de una pieza
 * @param codMarca Código o nombre de la marca
 * @param codModelo Código o nombre del modelo
 * @param codVersion Código o nombre de la versión (prefijo para LIKE)
 * @param anyoVehiculo Año específico del vehículo
 * @param puertas Número de puertas
 * @param anyoInicio Año de inicio para rango
 * @param anyoFin Año de fin para rango
 * @param rvCode Código único de vehículo para referencia
 * @param tipoVersion Tipo de versión para filtrar
 * @returns Vehículo encontrado o null si no hay coincidencia
 */
async function findMatchingVehicle(
  codMarca?: string,
  codModelo?: string,
  codVersion?: string,
  anyoVehiculo?: number,
  puertas?: number,
  anyoInicio?: number,
  anyoFin?: number,
  rvCode?: string,
  tipoVersion?: string
): Promise<Vehicle | null> {
  try {
    console.log(`Buscando vehículo que coincida con los criterios especificados: 
    codMarca=${codMarca}, 
    codModelo=${codModelo}, 
    codVersion=${codVersion}, 
    anyoVehiculo=${anyoVehiculo}, 
    puertas=${puertas}, 
    anyoInicio=${anyoInicio}, 
    anyoFin=${anyoFin}, 
    rvCode=${rvCode}, 
    tipoVersion=${tipoVersion}`);

    // Construir la consulta base
    let query = db.select().from(vehicles);
    let hasConditions = false;

    // Filtrar por marca (usamos la versión sin espacios para codMarca si está disponible)
    if (codMarca) {
      // Intentar coincidencia exacta primero
      const matchByExactMarca = await db.select().from(vehicles)
        .where(eq(vehicles.marca, codMarca));

      if (matchByExactMarca.length > 0) {
        // Si encontramos coincidencia exacta, devolvemos el primero
        return matchByExactMarca[0];
      }

      // Si no hay coincidencia exacta, usar LIKE
      query = query.where(like(vehicles.marca, `%${codMarca}%`));
      hasConditions = true;
    }

    // Filtrar por modelo
    if (codModelo) {
      // Intentar coincidencia exacta primero
      const matchByExactModelo = await db.select().from(vehicles)
        .where(eq(vehicles.modelo, codModelo));

      if (matchByExactModelo.length > 0) {
        // Si encontramos coincidencia exacta, devolvemos el primero
        return matchByExactModelo[0];
      }

      // Si no hay coincidencia exacta, usar LIKE
      query = query.where(like(vehicles.modelo, `%${codModelo}%`));
      hasConditions = true;
    }

    // Filtrar por versión
    if (codVersion) {
      // Intentar coincidencia exacta primero
      const matchByExactVersion = await db.select().from(vehicles)
        .where(eq(vehicles.version, codVersion));

      if (matchByExactVersion.length > 0) {
        // Si encontramos coincidencia exacta, devolvemos el primero
        return matchByExactVersion[0];
      }

      // Si no hay coincidencia exacta, usar LIKE
      query = query.where(like(vehicles.version, `${codVersion}%`));
      hasConditions = true;
    }

    // Filtrar por año específico
    if (anyoVehiculo) {
      query = query.where(eq(vehicles.anyo, anyoVehiculo));
      hasConditions = true;
    }
    // O filtrar por rango de años
    else if (anyoInicio && anyoFin) {
      // En una BD real usaríamos BETWEEN
      query = query.where(and(
        gte(vehicles.anyo, anyoInicio),
        lte(vehicles.anyo, anyoFin)
      ));
      hasConditions = true;
    }

    // Filtrar por número de puertas
    if (puertas) {
      query = query.where(eq(vehicles.puertas, puertas));
      hasConditions = true;
    }

    // Si no hay condiciones aplicables, no ejecutar la consulta
    if (!hasConditions) {
      console.log('No se encontraron criterios suficientes para realizar la búsqueda');
      return null;
    }

    // Ejecutar la consulta
    const result = await query;

    if (result.length > 0) {
      // Devolver el primer resultado
      console.log(`Se encontraron ${result.length} vehículos que coinciden con los criterios. Usando el primero: ${result[0].marca} ${result[0].modelo} ${result[0].version}`);
      return result[0];
    } else {
      console.log('No se encontraron coincidencias por criterios');
      return null;
    }
  } catch (error) {
    console.error('Error al buscar vehículo por criterios:', error);
    return null;
  }
}

// Tipos para el resultado de importación
export interface ImportResult {
  status: 'in_progress' | 'completed' | 'partial' | 'failed' | 'paused' | 'cancelled' | 'skipped';
  totalItems: number;
  newItems: number;
  updatedItems: number;
  itemsDeactivated: number;
  errors: string;
  details?: any;
}

// Opciones para la importación
export interface ImportOptions {
  fromDate?: Date;
  fullImport?: boolean;
  importHistoryId?: number;
  continueImport?: boolean;
}

/**
 * Clase para gestionar las importaciones programadas desde MetaSync
 */
export class ImportScheduler {
  private isInitialized: boolean = false;
  private schedules: Map<number, NodeJS.Timeout> = new Map();
  private activeImports: Map<number, boolean> = new Map();
  private optimizedImportService: MetasyncOptimizedImportService;

  constructor() {
    this.optimizedImportService = new MetasyncOptimizedImportService();
  }

  /**
   * Inicializa el programador de importaciones
   * Carga las tareas programadas de la base de datos y las programa
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Programador de importaciones ya inicializado');
      return;
    }

    this.isInitialized = true;
    console.log('Programador de importaciones inicializado');

    // Cargar programaciones desde la base de datos
    const schedules = await storage.getImportSchedules();

    if (schedules.length === 0) {
      console.log('No hay programaciones de importación configuradas.');
      this.createDefaultSchedules();
    } else {
      console.log(`Ya existen programaciones de importación. Total: ${schedules.length}`);

      // Programar cada tarea
      for (const schedule of schedules) {
        if (schedule.active) {
          this.scheduleImport(schedule);
        }
      }
    }
  }

  /**
   * Crear programaciones por defecto si no existen
   */
  private async createDefaultSchedules(): Promise<void> {
    console.log('Creando programaciones por defecto');

    // Crear programación para vehículos cada 12 horas
    const vehicleScheduleData = {
      type: 'vehicles',
      frequency: '12h',
      active: false // Por defecto desactivada para evitar importaciones automáticas
    };

    // Crear programación para piezas cada 12 horas
    const partScheduleData = {
      type: 'parts',
      frequency: '12h',
      active: false // Por defecto desactivada para evitar importaciones automáticas
    };

    // Crear programación para órdenes cada 1 hora
    const orderScheduleData = {
      type: 'orders',
      frequency: '1h',
      active: false // Por defecto desactivada
    };

    try {
      const vehicleSchedule = await storage.createImportSchedule(vehicleScheduleData);
      console.log(`Tarea programada: ${vehicleSchedule.type} cada ${vehicleSchedule.frequency}`);

      const partSchedule = await storage.createImportSchedule(partScheduleData);
      console.log(`Tarea programada: ${partSchedule.type} cada ${partSchedule.frequency}`);

      const orderSchedule = await storage.createImportSchedule(orderScheduleData);
      console.log(`Tarea programada: ${orderSchedule.type} cada ${orderSchedule.frequency} (inactiva)`);

      // Programar las tareas activas
      this.scheduleImport(vehicleSchedule);
      this.scheduleImport(partSchedule);
    } catch (error) {
      console.error('Error al crear programaciones por defecto:', error);
    }
  }

  /**
   * Método público para programar una nueva tarea (usado cuando se crea desde la API)
   */
  public addSchedule(schedule: ImportSchedule): void {
    console.log(`📅 Agregando nueva programación ID=${schedule.id} (${schedule.type}) al scheduler...`);
    this.scheduleImport(schedule);
  }

  /**
   * Programa una tarea de importación para que se ejecute según su frecuencia
   */
  private scheduleImport(schedule: ImportSchedule): void {
    if (!schedule.active) {
      console.log(`La programación ${schedule.id} (${schedule.type}) está inactiva, no se programará.`);
      return;
    }

    // PROTECCIÓN TEMPORAL: Cancelar scheduler para evitar loop infinito
    console.log(`🛑 SCHEDULER TEMPORALMENTE DESABILITADO para ${schedule.type} - Solucionando loop infinito`);
    console.log(`🔧 Las importaciones manuales siguen funcionando normalmente desde el panel de admin`);
    
    // Cancelar todos los timeouts existentes
    for (const [scheduleId, timerId] of this.schedules.entries()) {
      clearTimeout(timerId);
      console.log(`⏹️  Timeout cancelado para schedule ${scheduleId}`);
    }
    this.schedules.clear();
    
    return;

    const now = new Date();
    let nextRun = schedule.nextRun || this.calculateNextRun(
      schedule.lastRun || new Date(),
      schedule.frequency,
      schedule.startTime || '02:00'
    );

    // Si la próxima ejecución ya pasó, calcular la siguiente
    if (nextRun.getTime() <= now.getTime()) {
      console.log(`⚠️  Tiempo de ejecución para ${schedule.type} ya pasó, reprogramando...`);
      nextRun = this.calculateNextRun(
        now, // Desde ahora
        schedule.frequency,
        schedule.startTime || '02:00'
      );
      
      // PROTECCIÓN: Asegurar mínimo 30 segundos de espera para evitar loops
      const minWaitTime = 30 * 1000; // 30 segundos
      if (nextRun.getTime() - now.getTime() < minWaitTime) {
        nextRun = new Date(now.getTime() + minWaitTime);
        console.log(`🔒 Aplicando tiempo mínimo de espera de 30s para evitar loop infinito`);
      }
      
      console.log(`📅 Programando tarea: ${schedule.type} cada ${schedule.frequency}`);
      
      // Actualizar la base de datos con la nueva fecha
      storage.updateImportSchedule(schedule.id, { nextRun });
    }

    // Calcular el tiempo hasta la próxima ejecución
    const timeUntilNextRun = nextRun.getTime() - now.getTime();

    console.log(`📅 Programando ${schedule.type} (ID: ${schedule.id}) para ejecutarse en ${Math.round(timeUntilNextRun / 1000 / 60)} minutos (${nextRun.toISOString()})`);

    // Establecer el temporizador
    const timerId = setTimeout(async () => {
      console.log(`🚀 Ejecutando programación ${schedule.id} (${schedule.type})...`);
      const result = await this.runScheduledImport(schedule);

      // Calcular la próxima ejecución según la frecuencia configurada
      const nextRun = this.calculateNextRun(
        new Date(), // Desde ahora
        schedule.frequency,
        schedule.startTime || '02:00'
      );
      
      console.log(`🔄 Reprogramando ${schedule.type} para ejecutarse a las: ${nextRun.toLocaleString()}`);
      
      await storage.updateImportSchedule(schedule.id, { 
        nextRun,
        lastRun: new Date()
      });
      
      // Obtener todos los schedules y encontrar el actualizado
      console.log(`🔄 Obteniendo schedule actualizado de la BD para reprogramar...`);
      const allSchedules = await storage.getImportSchedules();
      const updatedSchedule = allSchedules.find(s => s.id === schedule.id);
      
      if (updatedSchedule && updatedSchedule.active) {
        // Añadir delay mínimo para evitar loop inmediato
        setTimeout(() => {
          console.log(`🔄 Reprogramando con delay de seguridad: ${schedule.type}`);
          this.scheduleImport(updatedSchedule);
        }, 2000); // 2 segundos de delay
      } else {
        console.log(`⚠️ Schedule ${schedule.id} no encontrado o inactivo, no se reprograma`);
      }
    }, timeUntilNextRun);

    // Guardar el ID del temporizador
    this.schedules.set(schedule.id, timerId);

    // Actualizar nextRun en la base de datos si cambió
    if (schedule.nextRun !== nextRun) {
      storage.updateImportSchedule(schedule.id, { nextRun });
    }
  }

  /**
   * Espera a que termine una importación específica
   */
  private async waitForImportCompletion(importId: number): Promise<void> {
    console.log(`Esperando a que termine la importación ${importId}...`);
    
    const maxWaitTime = 30 * 60 * 1000; // 30 minutos máximo
    const checkInterval = 10 * 1000; // Verificar cada 10 segundos
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const importRecord = await storage.getImportHistoryById(importId);
      
      if (importRecord) {
        
        if (importRecord.status === 'completed') {
          console.log(`Importación ${importId} completada exitosamente`);
          return;
        }
        
        if (importRecord.status === 'failed' || importRecord.status === 'cancelled') {
          console.log(`Importación ${importId} terminó con estado: ${importRecord.status}`);
          return;
        }
        
        // Si aún está en progreso, esperar
        if (importRecord.status === 'in_progress') {
          console.log(`Importación ${importId} aún en progreso... esperando`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          continue;
        }
      }
      
      // Si no se encuentra el registro, esperar un poco más
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    console.warn(`Tiempo de espera agotado para importación ${importId}`);
  }

  /**
   * Ejecuta una importación programada
   */
  public async runScheduledImport(schedule: ImportSchedule): Promise<ImportResult | null> {
    console.log(`Ejecutando importación programada: ${schedule.type}`);

    try {
      // Verificar si hay importaciones en curso antes de iniciar una nueva
      const runningImports = await storage.getImportHistory(100, { status: 'in_progress' });
      if (runningImports.length > 0) {
        console.log(`Saltando importación programada ${schedule.type} - hay ${runningImports.length} importaciones en curso`);
        return {
          status: 'skipped',
          totalItems: 0,
          newItems: 0,
          updatedItems: 0,
          itemsDeactivated: 0,
          errors: `Importación saltada - hay importaciones en curso`
        };
      }

      // Usar exactamente el mismo patrón que la importación manual
      // NO crear nuestro propio registro, dejar que el servicio lo maneje
      const optimizedImportService = new MetasyncOptimizedImportService();
      
      let importId: number;
      
      switch (schedule.type) {
        case 'vehicles':
          importId = await optimizedImportService.startImport('vehicles', undefined, schedule.isFullImport || false);
          console.log(`Importación de vehículos iniciada con ID: ${importId}`);
          break;
        case 'parts':
          importId = await optimizedImportService.startImport('parts', undefined, schedule.isFullImport || false);
          console.log(`Importación de piezas iniciada con ID: ${importId}`);
          break;
        case 'all':
        case 'full':
          // Importación usando orden secuencial: vehículos → piezas → relaciones
          const importType = schedule.isFullImport || false;
          console.log(`🔄 Iniciando importación ${importType ? 'COMPLETA' : 'INCREMENTAL'} con orden SECUENCIAL desde scheduler...`);
          
          // Iniciar vehículos primero
          console.log(`🚗 FASE 1: Iniciando importación ${importType ? 'COMPLETA' : 'INCREMENTAL'} de vehículos...`);
          const vehicleImportId = await optimizedImportService.startImport('vehicles', undefined, importType);
          console.log(`🚗 Importación ${importType ? 'COMPLETA' : 'INCREMENTAL'} de vehículos iniciada con ID: ${vehicleImportId}`);
          
          // ESPERAR a que termine la importación de vehículos
          await this.waitForImportCompletion(vehicleImportId);
          console.log(`✅ Vehículos importados completamente, procediendo con piezas...`);
          
          console.log(`🔧 FASE 2: Iniciando importación ${importType ? 'COMPLETA' : 'INCREMENTAL'} de piezas...`);
          importId = await optimizedImportService.startImport('parts', undefined, importType);
          console.log(`🔧 Importación ${importType ? 'COMPLETA' : 'INCREMENTAL'} de piezas iniciada con ID: ${importId}`);
          
          // ESPERAR a que termine la importación de piezas
          await this.waitForImportCompletion(importId);
          console.log(`✅ Piezas importadas completamente, procediendo con relaciones...`);
          
          console.log('🔗 FASE 3: Procesando relaciones pendientes...');
          await optimizedImportService.processPendingRelations();
          console.log(`✅ Relaciones procesadas completamente`);
          
          console.log(`📋 Orden SECUENCIAL completado: 1) Vehículos → 2) Piezas → 3) Relaciones`);
          break;
        default:
          console.warn(`Tipo de importación no reconocido: ${schedule.type}, saltando...`);
          return {
            status: 'skipped',
            totalItems: 0,
            newItems: 0,
            updatedItems: 0,
            itemsDeactivated: 0,
            errors: `Tipo de importación no válido: ${schedule.type}`
          };
      }

      // Actualizar fecha de última ejecución
      await storage.updateImportSchedule(schedule.id, {
        lastRun: new Date()
      });

      console.log(`Importación programada de ${schedule.type} iniciada correctamente`);
      return {
        status: 'completed',
        totalItems: 0,
        newItems: 0,
        updatedItems: 0,
        itemsDeactivated: 0,
        errors: ''
      };
    } catch (error) {
      console.error(`Error en la importación programada de ${schedule.type}:`, error);

      return {
        status: 'failed',
        totalItems: 0,
        newItems: 0,
        updatedItems: 0,
        itemsDeactivated: 0,
        errors: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Inicia o reanuda una importación manual
   */
  async startImport(type: string, options?: ImportOptions): Promise<number> {
    console.log(`Iniciando importación manual de tipo: ${type}`);

    // Crear registro en el historial
    const importHistory = await storage.createImportHistory({
      type,
      status: 'in_progress',
      progress: 0,
      processingItem: `Iniciando importación de ${type}`,
      isFullImport: options?.fullImport || false,
      options: options || {}
    });

    // Ejecutar la importación en segundo plano
    this.runImport(importHistory.id, type, options || {});

    return importHistory.id;
  }

  /**
   * Reanuda una importación pausada
   */
  async resumeImport(importHistoryId: number): Promise<boolean> {
    const importHistory = await storage.getImportHistoryById(importHistoryId);

    if (!importHistory) {
      throw new Error(`No se encontró la importación con ID ${importHistoryId}`);
    }

    if (importHistory.status !== 'paused') {
      throw new Error(`La importación con ID ${importHistoryId} no está pausada (estado actual: ${importHistory.status})`);
    }

    console.log(`Reanudando importación ${importHistoryId} de tipo ${importHistory.type}`);

    // Actualizar estado
    await storage.updateImportHistory(importHistoryId, {
      status: 'in_progress',
      processingItem: `Reanudando importación de ${importHistory.type}`,
      lastUpdated: new Date()
    });

    // Recuperar opciones de la importación
    const originalOptions = importHistory.options as ImportOptions || {};

    // Añadir opción para continuar desde donde se quedó
    const options: ImportOptions = {
      ...originalOptions,
      importHistoryId,
      continueImport: true
    };

    // Ejecutar la importación en segundo plano
    this.runImport(importHistoryId, importHistory.type, options);

    return true;
  }

  /**
   * Ejecuta una importación en segundo plano
   */
  private async runImport(importHistoryId: number, type: string, options: ImportOptions): Promise<void> {
    // Marcar como activa
    this.activeImports.set(importHistoryId, true);

    try {
      // Ejecutar la importación según el tipo
      let result: ImportResult;

      switch (type) {
        case 'vehicles':
          result = await this.importVehicles({
            ...options,
            importHistoryId
          });
          break;
        case 'parts':
          result = await this.importParts({
            ...options,
            importHistoryId
          });
          break;
        case 'orders':
          // Implementar cuando se necesite
          result = {
            status: 'completed',
            totalItems: 0,
            newItems: 0,
            updatedItems: 0,
            itemsDeactivated: 0,
            errors: ''
          };
          break;
        default:
          throw new Error(`Tipo de importación desconocido: ${type}`);
      }

      // Actualizar el historial con el resultado
      await storage.updateImportHistory(importHistoryId, {
        status: result.status,
        progress: 100,
        processingItem: `Importación de ${type} completada`,
        totalItems: result.totalItems,
        processedItems: result.totalItems,
        newItems: result.newItems,
        updatedItems: result.updatedItems,
        itemsDeactivated: result.itemsDeactivated,
        errors: result.errors,
        endTime: new Date(),
        lastUpdated: new Date()
      });

      console.log(`Importación manual de ${type} completada con estado: ${result.status}`);
    } catch (error) {
      console.error(`Error en la importación manual de ${type}:`, error);

      // Comprobar si la importación fue pausada o cancelada
      const currentImport = await storage.getImportHistoryById(importHistoryId);
      if (currentImport && (currentImport.status === 'paused' || currentImport.status === 'cancelled')) {
        console.log(`La importación ${importHistoryId} fue ${currentImport.status === 'paused' ? 'pausada' : 'cancelada'} por el usuario`);
        return;
      }

      // Actualizar el historial con el error
      await storage.updateImportHistory(importHistoryId, {
        status: 'failed',
        progress: 0,
        processingItem: `Error en la importación de ${type}`,
        errors: error instanceof Error ? error.message : 'Error desconocido',
        endTime: new Date(),
        lastUpdated: new Date()
      });
    } finally {
      // Marcar como inactiva
      this.activeImports.delete(importHistoryId);
    }
  }

  /**
   * Pausa una importación en curso
   */
  async pauseImport(importHistoryId: number): Promise<boolean> {
    const importHistory = await storage.getImportHistoryById(importHistoryId);

    if (!importHistory) {
      throw new Error(`No se encontró la importación con ID ${importHistoryId}`);
    }

    if (importHistory.status !== 'in_progress') {
      throw new Error(`La importación con ID ${importHistoryId} no está en progreso (estado actual: ${importHistory.status})`);
    }

    console.log(`Pausando importación ${importHistoryId} de tipo ${importHistory.type}`);

    // Marcar como pausada
    await storage.updateImportHistory(importHistoryId, {
      status: 'paused',
      processingItem: `Importación de ${importHistory.type} pausada por el usuario`,
      lastUpdated: new Date()
    });

    // Marcar como inactiva
    this.activeImports.delete(importHistoryId);

    return true;
  }

  /**
   * Cancela una importación en curso
   */
  async cancelImport(importHistoryId: number): Promise<boolean> {
    const importHistory = await storage.getImportHistoryById(importHistoryId);

    if (!importHistory) {
      throw new Error(`No se encontró la importación con ID ${importHistoryId}`);
    }

    if (importHistory.status !== 'in_progress' && importHistory.status !== 'paused') {
      throw new Error(`La importación con ID ${importHistoryId} no se puede cancelar (estado actual: ${importHistory.status})`);
    }

    console.log(`Cancelando importación ${importHistoryId} de tipo ${importHistory.type}`);

    // Marcar como cancelada
    await storage.updateImportHistory(importHistoryId, {
      status: 'cancelled',
      processingItem: `Importación de ${importHistory.type} cancelada por el usuario`,
      canResume: false,
      endTime: new Date(),
      lastUpdated: new Date()
    });

    // Marcar como inactiva
    this.activeImports.delete(importHistoryId);

    return true;
  }

  /**
   * Comprueba si una importación está activa
   */
  isImportActive(importHistoryId: number): boolean {
    return this.activeImports.has(importHistoryId);
  }

  /**
   * Importa vehículos desde MetaSync
   */
  async importVehicles(options?: ImportOptions): Promise<ImportResult> {
    try {
      // Fecha desde la que importar (30 días atrás por defecto)
      const fromDate = options?.fromDate || (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date;
      })();

      // Flag para indicar si es importación completa
      const fullImport = options?.fullImport || false;

      // ID del historial para actualizar el progreso
      const importHistoryId = options?.importHistoryId;

      console.log('Iniciando importación de vehículos. Modo:', fullImport ? 'completa' : `desde ${fromDate.toISOString()}`);

      let lastId = 0;
      let hasMore = true;
      let newVehicles = 0;
      let updatedVehicles = 0;
      let deactivatedVehicles = 0;
      let totalProcessed = 0;
      let totalVehicles = 0;
      let errors: string[] = [];

      // Si estamos continuando una importación previa, recuperar el lastId guardado
      if (options?.continueImport && importHistoryId) {
        const previousImport = await storage.getImportHistoryById(importHistoryId);
        if (previousImport && previousImport.details && typeof previousImport.details === 'object') {
          lastId = (previousImport.details as any).lastId || 0;
          console.log(`Continuando importación previa desde lastId=${lastId}`);
        }
      }

      // Intentar obtener el conteo total de vehículos
      let totalVehiclesCount = 0;
      try {
        console.log('Obteniendo conteo de vehículos de la API Metasync...');
        // Formatear fecha para la API
        const dateFormatted = formatDateForApi(fromDate);
        totalVehiclesCount = await metasyncApi.getVehicleCount(dateFormatted);
        console.log(`Total de vehículos a importar: ${totalVehiclesCount}`);

        // Actualizar progreso inicial
        if (importHistoryId) {
          await storage.updateImportHistory(importHistoryId, {
            totalItems: totalVehiclesCount,
            details: {
              ...(await storage.getImportHistoryById(importHistoryId))?.details as any || {},
              totalVehiclesCount
            }
          });
        }
      } catch (error) {
        console.warn('No se pudo obtener el conteo total de vehículos:', error);
      }

      // Array para almacenar IDs procesados (para desactivación)
      const processedIds: number[] = [];

      // Paginar los resultados y procesar cada página
      let currentPage = 0;
      while (hasMore) {
        // Verificar si debemos pausar o cancelar
        if (importHistoryId) {
          const importStatus = await storage.getImportHistoryById(importHistoryId);
          if (importStatus && (importStatus.status === 'paused' || importStatus.status === 'cancelled')) {
            console.log(`Importación ${importHistoryId} ${importStatus.status === 'paused' ? 'pausada' : 'cancelada'} por el usuario`);
            return {
              status: importStatus.status,
              totalItems: totalVehicles,
              newItems: newVehicles,
              updatedItems: updatedVehicles,
              itemsDeactivated: deactivatedVehicles,
              errors: errors.join('; '),
              details: {
                lastId,
                processedVehicles: totalProcessed
              }
            };
          }
        }

        try {
          currentPage++;
          let response;

          // Utilizar getVehicleChanges (RecuperarCambiosVehiculosCanal)
          if (fullImport) {
            // Para importación completa, usar fecha muy antigua
            const oldDate = new Date('2000-01-01');
            console.log(`Usando getVehicleChanges (RecuperarCambiosVehiculosCanal) para importación completa desde ${oldDate.toISOString()}`);
            response = await metasyncApi.getVehicleChanges(oldDate, lastId, 1000);
          } else {
            console.log(`Usando getVehicleChanges (RecuperarCambiosVehiculosCanal) para importación incremental desde ${fromDate.toISOString()}`);
            response = await metasyncApi.getVehicleChanges(fromDate, lastId, 1000);
          }

          if (!response || !response.vehiculos) {
            console.warn('Respuesta de API inválida en importVehicles:', response);
            hasMore = false;
            break;
          }

          const vehicles = response.vehiculos || [];

          if (vehicles.length === 0) {
            console.log('No se encontraron más vehículos');
            hasMore = false;
            break;
          }

          // Actualizar total
          totalVehicles += vehicles.length;

          console.log(`Procesando lote de ${vehicles.length} vehículos...`);

          // Usar el procesador de lotes para procesar vehículos eficientemente
          try {
            // Detectar si es el formato nuevo o antiguo
            const isNewFormat = vehicles[0] && 'nombreMarca' in vehicles[0];
            console.log(`Detectado formato ${isNewFormat ? 'nuevo' : 'antiguo'} para vehículos`);

            // Procesar lote completo de vehículos con la nueva implementación
            const result = await batchProcessor.processVehiclesBatch(vehicles);
            console.log(`Procesamiento por lotes completado: ${result.inserted} vehículos insertados, ${result.updated} actualizados, ${result.errors.length} errores`);

            if (result.errors.length > 0) {
              console.warn('Errores en procesamiento por lotes de vehículos:', result.errors.slice(0, 5));
            }

            // Actualizar estadísticas
            newVehicles += result.inserted;
            totalProcessed += vehicles.length;

            // Recopilar IDs procesados para eventual desactivación
            const vehicleIds = vehicles.map(v => isNewFormat 
              ? (v as MetasyncVehicleNew).idLocal 
              : (v as MetasyncVehicle).IdLocal);

            for (const idLocal of vehicleIds) {
              if (typeof idLocal === 'number' && !processedIds.includes(idLocal)) {
                processedIds.push(idLocal);
              }
            }
          } catch (batchError) {
            console.error('Error en procesamiento por lotes de vehículos. Fallback a procesamiento individual:', batchError);
            errors.push(`Error en procesamiento por lotes de vehículos: ${batchError instanceof Error ? batchError.message : 'Error desconocido'}`);

            // Código de fallback - procesamiento individual (solo se ejecuta si falla el por lotes)
            for (const vehicle of vehicles) {
              try {
                // Comprobar si ya existe el vehículo
                const idLocalValue = 'IdLocal' in vehicle ? vehicle.IdLocal : vehicle.idLocal;
                const existingVehicles = await storage.getVehicles({
                  idLocal: idLocalValue,
                  idEmpresa: metasyncApi.getConfig()?.companyId || 0
                });

                // Añadir a la lista de IDs procesados para luego desactivar los que faltan
                if (!processedIds.includes(idLocalValue)) {
                  processedIds.push(idLocalValue);
                }

                // Adaptar el formato de datos
                const vehicleData = {
                  idLocal: idLocalValue,
                  idEmpresa: metasyncApi.getConfig()?.companyId || 0,
                  descripcion: `${vehicle.Marca || 'Desconocida'} ${vehicle.Modelo || 'Desconocido'} ${vehicle.Version || 'Desconocida'}`,
                  marca: vehicle.Marca || 'Desconocida',
                  modelo: vehicle.Modelo || 'Desconocido',
                  version: vehicle.Version || 'Desconocida',
                  anyo: vehicle.AnyoVehiculo || 0,
                  combustible: vehicle.Combustible || '',
                  bastidor: vehicle.Bastidor || '',
                  matricula: vehicle.Matricula || '',
                  color: vehicle.Color || '',
                  kilometraje: vehicle.Kilometraje || 0,
                  potencia: vehicle.Potencia || 0,
                  puertas: null, // No disponible en formato antiguo
                  imagenes: vehicle.UrlsImgs || [],
                  activo: true,
                  sincronizado: true,
                  ultimaSincronizacion: new Date()
                };

                if (existingVehicles.length > 0) {
                  // Actualizar vehículo
                  await storage.updateVehicle(existingVehicles[0].id, vehicleData);
                  updatedVehicles++;
                } else {
                  // Crear nuevo vehículo
                  await storage.createVehicle(vehicleData);
                  newVehicles++;
                }

                totalProcessed++;
              } catch (vehicleError) {
                console.error('Error al importar vehículo:', vehicleError);
                errors.push(`Error al importar vehículo: ${vehicleError instanceof Error ? vehicleError.message : 'Error desconocido'}`);
              }
            }
          }

          // Actualizar progreso cada 10 vehículos
          if (importHistoryId && totalProcessed % 10 === 0) {
            const progress = Math.round((totalProcessed / (totalVehiclesCount || totalProcessed * 2)) * 100);
            await storage.updateImportHistory(importHistoryId, {
              progress: Math.min(progress, 99),
              processingItem: `Procesando vehículos (página ${currentPage})`,
              processedItems: totalProcessed,
              newItems: newVehicles,
              updatedItems: updatedVehicles,
              lastUpdated: new Date(),
              details: {
                lastId,
                processedVehicles: totalProcessed
              }
            });
          }

          // Actualizar lastId para continuar desde aquí en caso de error
          if (vehicles.length > 0 && vehicles[vehicles.length - 1].idLocal) {
            lastId = vehicles[vehicles.length - 1].idLocal;
          }

          // Si llegamos a aquí y no hay más páginas para procesar
          if (vehicles.length < 1000) {
            console.log('No hay más vehículos para procesar, finalizando paginación');
            hasMore = false;
          }
        } catch (error) {
          console.error('Error al obtener vehículos:', error);
          errors.push(`Error al obtener vehículos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          hasMore = false;
        }
      }

      // Si es importación completa, desactivar los vehículos que ya no existen
      if (fullImport && processedIds.length > 0) {
        console.log(`Desactivando vehículos que ya no existen en la API (total procesados: ${processedIds.length})`);

        // Buscar todos los vehículos que no estén en la lista de procesados
        const allVehicles = await storage.getVehicles({});

        for (const vehicle of allVehicles) {
          if (!processedIds.includes(vehicle.idLocal) && vehicle.idLocal !== -999999) {
            // El vehículo no está en la API, desactivarlo
            try {
              await storage.updateVehicle(vehicle.id, {
                activo: false,
                sincronizado: true,
                ultimaSincronizacion: new Date()
              });
              deactivatedVehicles++;
            } catch (err) {
              console.error(`Error al desactivar vehículo:`, err);
              errors.push(`Error al desactivar vehículo: ${err instanceof Error ? err.message : 'Error desconocido'}`);
            }
          }
        }
      }

      // Ahora buscamos piezas pendientes para actualizar sus relaciones
      try {
        // No se necesita importar import-service-fixed, usamos directamente el storage
        // El vehículo dummy ya no se usa, buscamos relaciones donde el vehicleId es NULL
        const pendingRelations = await storage.getVehicleParts({
          vehicleId: null // Relaciones pendientes tienen vehicleId NULL
        });

        console.log(`Encontradas ${pendingRelations.length} relaciones pendientes para procesar después de importar vehículos`);

        for (const relation of pendingRelations) {
          try {
            // Buscar si ahora existe el vehículo que antes era pendiente
            const vehicleId = relation.idVehiculoOriginal;
            const matchingVehicles = await storage.getVehicles({
              idLocal: vehicleId
            });

            if (matchingVehicles.length > 0) {
              console.log(`Actualizando relación pendiente: pieza ${relation.partId} - vehículo ${vehicleId} (ahora existe con ID interno ${matchingVehicles[0].id})`);

              // Actualizar la relación
              await storage.updateVehiclePart(relation.id, {
                vehicleId: matchingVehicles[0].id
              });
            }
          } catch (err) {
            console.error(`Error al procesar relación pendiente:`, err);
          }
        }
      } catch (updateError) {
        console.error('Error al procesar relaciones pendientes:', updateError);
      }

      return {
        status: 'completed',
        totalItems: totalVehicles,
        newItems: newVehicles,
        updatedItems: updatedVehicles,
        itemsDeactivated: deactivatedVehicles,
        errors: errors.join('; ')
      };
    } catch (error) {
      console.error('Error en importVehicles:', error);
      throw error;
    }
  }

  /**
   * Importa piezas desde MetaSync
   */
  async importParts(options?: ImportOptions): Promise<ImportResult> {
    try {
      // Fecha desde la que importar (30 días atrás por defecto)
      const fromDate = options?.fromDate || (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date;
      })();

      // Flag para indicar si es importación completa
      const fullImport = options?.fullImport || false;

      // ID del historial para actualizar el progreso
      const importHistoryId = options?.importHistoryId;

      console.log(`Iniciando importación de piezas. Modo: ${fullImport ? 'completa' : `desde ${fromDate.toISOString()}`}`);

      let lastId = 0;
      let hasMore = true;
      let newParts = 0;
      let updatedParts = 0;
      let deactivatedParts = 0;
      let totalProcessed = 0;
      let totalParts = 0;
      let errors: string[] = [];

      // Si estamos continuando una importación previa, recuperar el lastId guardado
      if (options?.continueImport && importHistoryId) {
        const previousImport = await storage.getImportHistoryById(importHistoryId);
        if (previousImport && previousImport.details && typeof previousImport.details === 'object') {
          lastId = (previousImport.details as any).lastId || 0;
          console.log(`Continuando importación previa desde lastId=${lastId}`);
        }
      }

      // Intentar obtener el conteo total de piezas
      let totalPartsCount = 0;
      try {
        console.log('Obteniendo conteo de piezas de la API Metasync...');
        // Formatear fecha para la API
        const dateFormatted = formatDateForApi(fromDate);
        totalPartsCount = await metasyncApi.getPartCount(dateFormatted);
        console.log(`Total de piezas a importar: ${totalPartsCount}`);

        // Actualizar progreso inicial
        if (importHistoryId) {
          await storage.updateImportHistory(importHistoryId, {
            totalItems: totalPartsCount,
            details: {
              ...(await storage.getImportHistoryById(importHistoryId))?.details as any || {},
              totalPartsCount
            }
          });
        }
      } catch (error) {
        console.warn('No se pudo obtener el conteo total de piezas:', error);
      }

      // Array para almacenar IDs procesados (para desactivación)
      const processedIds: number[] = [];

      // Array para almacenar todas las piezas
      let allParts: any[] = [];

      // Paginar los resultados y procesar cada página
      let currentPage = 0;
      let isNewFormat = false; // Detectar si es el formato nuevo o antiguo de la API
      while (hasMore) {
        // Verificar si debemos pausar o cancelar
        if (importHistoryId) {
          const importStatus = await storage.getImportHistoryById(importHistoryId);
          if (importStatus && (importStatus.status === 'paused' || importStatus.status === 'cancelled')) {
            console.log(`Importación ${importHistoryId} ${importStatus.status === 'paused' ? 'pausada' : 'cancelada'} por el usuario`);
            return {
              status: importStatus.status,
              totalItems: totalParts,
              newItems: newParts,
              updatedItems: updatedParts,
              itemsDeactivated: deactivatedParts,
              errors: errors.join('; '),
              details: {
                lastId,
                processedItems: allParts.length
              }
            };
          }
        }

        let parts: any[] = [];
        try {
          currentPage++;
          let response;

          // Utilizar getPartChanges (RecuperarCambiosCanalEmpresa)
          if (fullImport) {
            // Para importación completa, usar fecha muy antigua
            const oldDate = new Date('2000-01-01');
            console.log(`Usando getPartChanges (RecuperarCambiosCanalEmpresa) para importación completa desde ${oldDate.toISOString()}`);
            response = await metasyncApi.getPartChanges(oldDate, lastId, 1000);
          } else {
            console.log(`Usando getPartChanges (RecuperarCambiosCanalEmpresa) para importación incremental desde ${fromDate.toISOString()}`);
            response = await metasyncApi.getPartChanges(fromDate, lastId, 1000);
          }

          if (!response || (!response.piezas && !response.elements)) {
            console.warn('Respuesta de API inválida en importParts:', response);
            hasMore = false;
            break;
          }

          // Determinar el formato de respuesta (nuevo o antiguo)
          isNewFormat = !!response.piezas;

          // Extraer piezas según el formato
          const responseParts = isNewFormat ? response.piezas : response.elements;
          parts = responseParts || [];

          if (!parts || parts.length === 0) {
            console.log('No se encontraron más piezas');
            hasMore = false;
            break;
          }

          // Añadir al total y al array de todas las piezas
          allParts = allParts.concat(parts);
          totalParts += parts.length;

          // Actualizar progreso
          if (importHistoryId) {
            // Asumimos máximo 50% para la fase de obtención
            const progress = Math.min(Math.round((allParts.length / (totalPartsCount || allParts.length * 2)) * 50), 49);
            await storage.updateImportHistory(importHistoryId, {
              progress: progress,
              processingItem: `Obteniendo piezas (página ${currentPage})`,
              lastUpdated: new Date(),
              details: {
                // Mantener detalles existentes
                ...(await storage.getImportHistoryById(importHistoryId))?.details as any || {},
                // Actualizar con información actual
                lastId: lastId,
                processedItems: allParts.length
              }
            });
          }

          console.log(`Procesando lote de ${parts.length} piezas. Formato de respuesta: ${isNewFormat ? 'nuevo' : 'antiguo'}`);

          // Importar las piezas usando el procesador de lotes mejorado
          try {
            // Pasamos el lote completo al procesador para un procesamiento eficiente
            const result = await batchProcessor.processPartsBatch(parts, isNewFormat, fromDate);
            console.log(`Procesamiento por lotes completado: ${result.inserted} insertadas, ${result.updated} actualizadas, ${result.errors.length} errores`);

            if (result.errors.length > 0) {
              console.warn('Errores en procesamiento por lotes:', result.errors.slice(0, 5));
            }

            // Añadir a las estadísticas generales
            newParts += result.inserted;
            updatedParts += result.updated;

            // Recopilar IDs procesados para eventual desactivación
            const partRefLocals = parts.map(p => isNewFormat ? (p as MetasyncPart).refLocal : (p as any).RefLocal);
            for (const refLocal of partRefLocals) {
              if (typeof refLocal === 'number' && !processedIds.includes(refLocal)) {
                processedIds.push(refLocal);
              }
            }

            // Continuar con el siguiente lote
            continue;
          } catch (batchError) {
            console.error('Error en procesamiento por lotes. Fallback a procesamiento individual:', batchError);
            errors.push(`Error en procesamiento por lotes: ${batchError instanceof Error ? batchError.message : 'Error desconocido'}`);
          }

          // Código de fallback - procesamiento individual (solo se ejecuta si falla el por lotes)
          for (const part of parts) {
            try {
              const refLocalValue = isNewFormat 
                ? (part as MetasyncPart).refLocal 
                : (part as any).RefLocal;

              if (refLocalValue === undefined) {
                console.warn('Pieza sin refLocal válido. Saltando.');
                continue;
              }

              // Añadir a la lista de IDs procesados para luego desactivar las que faltan
              if (typeof refLocalValue === 'number') {
                // Usamos el array a nivel global para tracking
                if (!processedIds.includes(refLocalValue)) {
                  processedIds.push(refLocalValue);
                }
              }

              // Comprobar si ya existe la pieza
              const existingParts = await storage.getParts({
                refLocal: refLocalValue,
                idEmpresa: metasyncApi.getConfig()?.companyId || 0
              });

              // Mantener el ID original del vehículo (incluso si es negativo)
              const vehicleId = isNewFormat ? (part as MetasyncPart).idVehiculo : (part as any).IdVehiculo;

              // Primero intentar obtener información completa del vehículo
              let vehicle = [];
              try {
                // Primero intentar con RecuperarCambiosVehiculosCanal
                const vehicleResponse = await metasyncApi.getVehicleChanges(new Date('2000-01-01'), 0, 1000);
                if (vehicleResponse?.vehiculos) {
                  // El formato nuevo usa idLocal con i minúscula, el antiguo usa IdLocal con I mayúscula
                  vehicle = vehicleResponse.vehiculos.filter(
                    v => {
                      // Comprobamos cada formato de forma segura usando 'as any'
                      const newFormatId = (v as any).idLocal;
                      const oldFormatId = (v as any).IdLocal;
                      return (newFormatId !== undefined && newFormatId === vehicleId) || 
                             (oldFormatId !== undefined && oldFormatId === vehicleId);
                    }
                  );
                }
              } catch (error) {
                console.warn(`Error al obtener vehículo desde RecuperarCambiosVehiculosCanal: ${error}`);
              }

              // Si no se encontró, buscar en la base de datos local
              if (vehicle.length === 0) {
                vehicle = await storage.getVehicles({
                  idLocal: vehicleId,
                  idEmpresa: metasyncApi.getConfig()?.companyId || 0
                });
              }

              if (vehicle.length === 0) {
                console.warn(`No se encontró el vehículo con ID ${vehicleId} para la pieza ${refLocalValue}`);
              } else {
                console.log(`Vehículo encontrado con ID ${vehicleId} para la pieza ${refLocalValue}`);
              }

              // Adaptar el formato de datos según el tipo de respuesta
              let partData;

              if (isNewFormat) {
                // Formato nuevo
                const newFormatPart = part as MetasyncPart;
                console.log(`Procesando pieza: refLocal=${newFormatPart.refLocal}, precio=${newFormatPart.precio}, precio original=${newFormatPart.precio}`);

                // Corregir ID de vehículo negativo (usar valor absoluto)
                // No convertimos los IDs negativos a positivos, los mantenemos tal cual vienen
                console.log(`ID Vehículo: ${newFormatPart.idVehiculo} (manteniendo ID original)`);

                // Asegurar que el precio es un string
                const originalPrice = newFormatPart.precio;
                const precio = typeof originalPrice === 'string' 
                    ? originalPrice 
                    : String(originalPrice || 0);

                // Extraer datos para matching (con fallbacks seguros)
                const anyoInicio = (newFormatPart as any).anyoInicio;
                const anyoFin = (newFormatPart as any).anyoFin;
                const puertas = (newFormatPart as any).puertas;
                const rvCode = (newFormatPart as any).rvCode;
                const codVersion = (newFormatPart as any).codVersion;
                const anyoVehiculo = (newFormatPart as any).anyoVehiculo;

                // Imprimir datos para debugging
                console.log(`Datos para matching: codMarca=${newFormatPart.codMarca}, codModelo=${newFormatPart.codModelo}, codVersion=${codVersion}, 
                anyoVehiculo=${anyoVehiculo}, puertas=${puertas}, anyoInicio=${anyoInicio}, anyoFin=${anyoFin}, rvCode=${rvCode}`);

                partData = normalizePartData({
                  refLocal: newFormatPart.refLocal,
                  idEmpresa: metasyncApi.getConfig()?.companyId || 0,
                  codFamilia: newFormatPart.codFamilia || '',
                  descripcionFamilia: newFormatPart.descripcionFamilia || '',
                  codArticulo: newFormatPart.codArticulo || '',
                  descripcionArticulo: newFormatPart.descripcionArticulo || '',
                  codVersion: codVersion || '',
                  refPrincipal: newFormatPart.refPrincipal || '',
                  anyoInicio: anyoInicio,
                  anyoFin: anyoFin,
                  puertas: puertas,
                  rvCode: rvCode || '',
                  precio: precio,
                  anyoStock: newFormatPart.anyoStock || 0,
                  peso: String(newFormatPart.peso || 0),
                  ubicacion: newFormatPart.ubicacion || 0,
                  observaciones: newFormatPart.observaciones || '',
                  reserva: newFormatPart.reserva || 0,
                  tipoMaterial: newFormatPart.tipoMaterial || 0,
                  imagenes: newFormatPart.urlsImgs || [],
                  activo: false, // Inicialmente inactiva, se activará solo si tiene relaciones válidas
                  sincronizado: true,
                  ultimaSincronizacion: new Date()
                });
              } else {
                // Formato antiguo
                const oldFormatPart = part as any;
                console.log(`Procesando pieza (formato antiguo): RefLocal=${oldFormatPart.RefLocal}, precio=${oldFormatPart.Precio}, precio original=${oldFormatPart.Precio}`);

                // Verificar precio y desactivar si es cero
                const precio = typeof oldFormatPart.Precio === 'string' ? oldFormatPart.Precio : String(oldFormatPart.Precio || 0);
                const isZeroPrice = precio === '0' || precio === '0.0' || precio === '0.00' || precio === '0,00' || 
                                   precio === '' || !precio || parseFloat(precio.replace(',', '.')) <= 0;

                if (isZeroPrice) {
                  oldFormatPart.activo = false;
                  console.log(`Pieza con precio cero desactivada: RefLocal=${oldFormatPart.RefLocal}, precio=${precio}`);
                }

                // Corregir ID de vehículo negativo (usar valor absoluto)
                console.log(`ID Vehículo: ${oldFormatPart.IdVehiculo} (manteniendo ID original)`);

                // Procesar precio
                const originalPrice = oldFormatPart.Precio;

                partData = normalizePartData({
                  refLocal: oldFormatPart.RefLocal,
                  idEmpresa: metasyncApi.getConfig()?.companyId || 0,
                  // Eliminamos idVehiculo que ya no existe en el schema
                  codFamilia: oldFormatPart.CodFamilia,
                  descripcionFamilia: oldFormatPart.DescripcionFamilia,
                  codArticulo: oldFormatPart.codArticulo,
                  descripcionArticulo: oldFormatPart.DescripcionArticulo,
                  codVersion: oldFormatPart.codVersion,
                  refPrincipal: oldFormatPart.RefOEM || oldFormatPart.RefIAM,
                  precio: String(originalPrice),
                  anyoStock: oldFormatPart.AnyoStock,
                  peso: String(oldFormatPart.Peso || 0),
                  ubicacion: 1,
                  observaciones: oldFormatPart.Observaciones,
                  reserva: oldFormatPart.Cantidad,
                  tipoMaterial: oldFormatPart.EstadoPieza,
                  imagenes: oldFormatPart.UrlsImgs || [],
                  activo: false, // Inicialmente inactiva, se activará solo si tiene relaciones válidas
                  sincronizado: true,
                  ultimaSincronizacion: new Date()
                });
              }

              // Guardar/actualizar pieza
              let partId: number;
              if (existingParts.length > 0) {
                await storage.updatePart(existingParts[0].id, partData);
                partId = existingParts[0].id;
                updatedParts++;
              } else {
                const newPart = await storage.createPart(partData);
                partId = newPart.id;
                newParts++;
              }

              // Crear o actualizar la relación en vehicle_parts
              try {
                // Obtener el ID original del vehículo del formato correcto
                let idVehiculoOriginal;
                if (isNewFormat) {
                  idVehiculoOriginal = (part as MetasyncPart).idVehiculo;
                } else {
                  idVehiculoOriginal = (part as any).IdVehiculo;
                }

                // Obtener datos de la pieza para buscar coincidencias
                let codMarca = '';
                let codModelo = '';
                let codVersion = '';
                let anyoVehiculo = 0;
                let tipoVersion = '';
                let puertas = undefined;
                let anyoInicio = undefined;
                let anyoFin = undefined;
                let rvCode = undefined;

                if (isNewFormat) {
                  // Formato nuevo
                  codMarca = (part as MetasyncPart).codMarca || '';
                  codModelo = (part as MetasyncPart).codModelo || '';
                  codVersion = (part as MetasyncPart).codVersion || '';
                  anyoVehiculo = (part as MetasyncPart).anyoVehiculo || 0;
                  puertas = (part as MetasyncPart).puertas;
                  anyoInicio = (part as MetasyncPart).anyoInicio;
                  anyoFin = (part as MetasyncPart).anyoFin;
                  rvCode = (part as MetasyncPart).rvCode;
                } else {
                  // Formato antiguo, adaptar campos si están disponibles
                  codMarca = (part as any).CodMarca || '';
                  codModelo = (part as any).CodModelo || '';
                  codVersion = (part as any).codVersion || '';
                  anyoVehiculo = (part as any).Anyo || 0;
                  tipoVersion = (part as any).TipoVersion || '';
                }

                if (vehicle.length > 0) {
                  // Vehículo encontrado, crear relación directa
                  const vehicleRecord = vehicle[0];

                  // Verificar que vehicleRecord.id existe y es un número válido
                  if (vehicleRecord && vehicleRecord.id) {
                    console.log(`Creando relación directa entre pieza ${partId} y vehículo ${vehicleRecord.id} (idLocal=${vehicleRecord.idLocal})`);

                    try {
                      // Verificar si ya existe la relación para evitar duplicados
                      const existingRelations = await storage.getVehicleParts({
                        vehicleId: vehicleRecord.id,
                        partId
                      });

                      if (existingRelations.length === 0) {
                        // Crear nueva relación
                        await storage.createVehiclePart({
                          vehicleId: vehicleRecord.id,
                          partId,
                          idVehiculoOriginal
                        });
                      }
                    } catch (relationError) {
                      console.error(`Error al crear relación para la pieza ${partId}: ${relationError}`);
                      errors.push(`Error al crear relación para la pieza ${partId}: ${relationError}`);
                    }
                  } else {
                    console.error(`Error: vehicleRecord.id inválido o undefined para la pieza ${partId}`);
                    errors.push(`Error: vehicleRecord.id inválido para la pieza ${partId}`);
                  }
                } else {
                  // Si el ID del vehículo es negativo, buscar posibles coincidencias por otros criterios
                  if (idVehiculoOriginal < 0) {
                    console.log(`Pieza con idVehiculo negativo: ${idVehiculoOriginal}. Buscando coincidencias con todos los criterios disponibles.`);

                    try {
                      const matchedVehicle = await findMatchingVehicle(
                        codMarca,
                        codModelo,
                        codVersion,
                        anyoVehiculo,
                        puertas,
                        anyoInicio,
                        anyoFin,
                        rvCode,
                        tipoVersion
                      );

                      if (matchedVehicle) {
                        console.log(`Coincidencia encontrada para ID negativo ${idVehiculoOriginal}: ${matchedVehicle.marca} ${matchedVehicle.modelo} ${matchedVehicle.version} (ID=${matchedVehicle.id})`);

                        // Verificar si ya existe la relación
                        const existingRelations = await storage.getVehicleParts({
                          vehicleId: matchedVehicle.id,
                          partId
                        });

                        if (existingRelations.length === 0) {
                          // Crear nueva relación con el vehículo encontrado
                          await storage.createVehiclePart({
                            vehicleId: matchedVehicle.id,
                            partId,
                            idVehiculoOriginal
                          });
                        }

                        // Ya procesamos esta pieza, continuamos con la siguiente
                        continue; 
                      } else {
                        console.log(`No se encontraron coincidencias por criterios para la pieza con ID negativo ${idVehiculoOriginal}`);
                      }
                    } catch (error) {
                      console.error(`Error al buscar coincidencias para pieza con ID negativo: ${error}`);
                    }

                    // Si llegamos aquí, no encontramos coincidencia o hubo un error, así que guardamos como relación pendiente
                    console.log(`Guardando relación pendiente: idVehiculoOriginal=${idVehiculoOriginal} - pieza id=${partId} (refLocal=${partData.refLocal})`);

                    // Buscar si ya existe alguna relación pendiente para esta pieza y este vehículo original
                    const pendingRelations = await storage.getVehicleParts({
                      partId,
                      idVehiculoOriginal
                    });

                    if (pendingRelations.length === 0) {
                      // No existe relación pendiente, crear una nueva
                      try {
                        // Usar el vehículo dummy (ID: 50956) en lugar de 0
                        await storage.createVehiclePart({
                          vehicleId: 50956, // Valor temporal, se actualizará cuando exista el vehículo
                          partId,
                          idVehiculoOriginal
                        });
                      } catch (err) {
                        console.error(`Error al crear relación pendiente: ${err}`);
                      }
                    }
                  } else {
                    // ID de vehículo positivo pero no encontrado, guardar como relación pendiente
                    console.log(`Guardando relación pendiente: idVehiculoOriginal=${idVehiculoOriginal} (positivo) - pieza id=${partId} (refLocal=${partData.refLocal})`);

                    // Buscar si ya existe alguna relación pendiente para esta pieza y este vehículo original
                    const pendingRelations = await storage.getVehicleParts({
                      partId,
                      idVehiculoOriginal
                    });

                    if (pendingRelations.length === 0) {
                      // No existe relación pendiente, crear una nueva
                      try {
                        // Usar el vehículo dummy (ID: 50956) en lugar de 0
                        await storage.createVehiclePart({
                          vehicleId: 50956, // Valor temporal, se actualizará cuando exista el vehículo
                          partId,
                          idVehiculoOriginal
                        });
                      } catch (err) {
                        console.error(`Error al crear relación pendiente: ${err}`);
                      }
                    }
                  }
                }
              } catch (relationError) {
                console.error(`Error al crear relación para la pieza ${partId}:`, relationError);
                errors.push(`Error al crear relación: ${relationError instanceof Error ? relationError.message : 'Error desconocido'}`);
              }

              totalProcessed++;

              // Actualizar progreso cada 10 piezas
              if (importHistoryId && totalProcessed % 10 === 0) {
                // El 50% inicial es para la obtención, luego avanzamos del 50% al 100%
                const baseProgress = 50;
                const progressPart = Math.round((totalProcessed / allParts.length) * 50);
                const progress = Math.min(baseProgress + progressPart, 99);

                await storage.updateImportHistory(importHistoryId, {
                  progress,
                  processingItem: `Procesando piezas (${totalProcessed}/${allParts.length})`,
                  processedItems: totalProcessed,
                  newItems: newParts,
                  updatedItems: updatedParts,
                  lastUpdated: new Date(),
                  details: {
                    ...(await storage.getImportHistoryById(importHistoryId))?.details as any || {},
                    processedItems: totalProcessed
                  }
                });
              }

              // Actualizar lastId para continuar desde aquí en caso de error
              if (isNewFormat) {
                lastId = (part as MetasyncPart).refLocal;
              } else {
                lastId = (part as any).RefLocal;
              }
            } catch (err) {
              console.error(`Error al importar pieza:`, err);
            }
          }

          // Si llegamos a aquí y no hay más páginas para procesar
          if (parts.length < 1000) {
            console.log('No hay más piezas para procesar, finalizando paginación');
            hasMore = false;
          }
        } catch (error) {
          console.error('Error al obtener piezas:', error);
          errors.push(`Error al obtener piezas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          hasMore = false;
        }
      }

      // Si es importación completa, desactivar las piezas que ya no existen
      if (fullImport && processedIds.length > 0) {
        console.log(`Desactivando piezas que ya no existen en la API (total procesados: ${processedIds.length})`);

        // Buscar todas las piezas que no estén en la lista de procesados
        const allDbParts = await storage.getParts({});

        for (const dbPart of allDbParts) {
          if (!processedIds.includes(dbPart.refLocal)) {
            // La pieza no está en la API, desactivarla
            try {
              console.log(`Desactivando pieza que ya no existe en la API: id=${dbPart.id}, refLocal=${dbPart.refLocal}`);

              const existingParts = await storage.getParts({
                refLocal: dbPart.refLocal,
                idEmpresa: metasyncApi.getConfig()?.companyId || 0
              });

              if (existingParts.length > 0) {
                await storage.updatePart(existingParts[0].id, {
                  activo: false,
                  sincronizado: true,
                  ultimaSincronizacion: new Date()
                });
                deactivatedParts++;
              }
            } catch (err) {
              console.error(`Error al desactivar pieza:`, err);
              errors.push(`Error al desactivar pieza: ${err instanceof Error ? err.message : 'Error desconocido'}`);
            }
          }
        }
      }

      // Devolver resultado de la importación
      return {
        status: 'completed',
        totalItems: totalParts,
        newItems: newParts,
        updatedItems: updatedParts,
        itemsDeactivated: deactivatedParts,
        errors: errors.join('; ')
      };
    } catch (error) {
      console.error('Error en importParts:', error);
      throw error;
    }
  }

  /**
   * Obtiene el intervalo en milisegundos para la frecuencia especificada
   */
  private getIntervalMilliseconds(frequency: string): number {
    switch (frequency) {
      case '5m':
        return 5 * 60 * 1000; // 5 minutos (solo para pruebas)
      case '15m':
        return 15 * 60 * 1000; // 15 minutos
      case '30m':
        return 30 * 60 * 1000; // 30 minutos
      case '1h':
        return 60 * 60 * 1000; // 1 hora
      case '2h':
        return 2 * 60 * 60 * 1000; // 2 horas
      case '4h':
        return 4 * 60 * 60 * 1000; // 4 horas
      case '6h':
        return 6 * 60 * 60 * 1000; // 6 horas
      case '8h':
        return 8 * 60 * 60 * 1000; // 8 horas
      case '12h':
        return 12 * 60 * 60 * 1000; // 12 horas
      case '24h':
        return 24 * 60 * 60 * 1000; // 24 horas
      case '7d':
        return 7 * 24 * 60 * 60 * 1000; // 7 días
      default:
        return 24 * 60 * 60 * 1000; // Por defecto, 24 horas
    }
  }

  /**
   * Calcula la próxima ejecución a partir de una fecha y hora de inicio
   */
  private calculateNextRun(from: Date, frequency: string, startTime: string = '02:00'): Date {
    const intervalMs = this.getIntervalMilliseconds(frequency);
    const now = new Date();

    // Parsear la hora de inicio
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Crear la fecha base con la hora de inicio para HOY
    const todayStartTime = new Date(now);
    todayStartTime.setHours(hours, minutes, 0, 0);

    // Si la hora de inicio es hoy y aún no ha pasado, usar esa hora
    if (todayStartTime.getTime() > now.getTime()) {
      console.log(`⏰ Usando hora de inicio de hoy: ${todayStartTime.toLocaleTimeString()}`);
      return todayStartTime;
    }

    // Si la hora de inicio ya pasó hoy, calcular según frecuencia
    if (frequency === '1h') {
      // Para frecuencia horaria, próxima ejecución en 1 hora
      return new Date(now.getTime() + intervalMs);
    } else if (frequency === '6h') {
      // Para frecuencia de 6 horas, próxima ejecución en 6 horas
      return new Date(now.getTime() + intervalMs);
    } else if (frequency === '12h') {
      // Cada 12 horas a partir de la hora de inicio
      const next12h = new Date(todayStartTime);
      if (now.getHours() >= hours) {
        // Si ya pasó la hora de inicio hoy, calcular próxima ocurrencia
        if (now.getHours() - hours >= 12) {
          next12h.setDate(next12h.getDate() + 1);
        } else {
          next12h.setHours(hours + 12, minutes, 0, 0);
        }
      }
      return next12h;
    } else if (frequency === '24h') {
      // Cada 24 horas a la hora de inicio (mañana)
      const tomorrowStartTime = new Date(todayStartTime);
      tomorrowStartTime.setDate(tomorrowStartTime.getDate() + 1);
      return tomorrowStartTime;
    } else {
      // Para otras frecuencias, usar el cálculo original
      const elapsed = now.getTime() - from.getTime();
      const intervals = Math.floor(elapsed / intervalMs);
      return new Date(from.getTime() + (intervals + 1) * intervalMs);
    }
  }

  /**
   * Procesa un lote de piezas (procesamiento por lotes para evitar sobrecarga)
   */
  private async processBatch(parts: any[], batchSize: number = 1000) {
    const batches = [];
    for (let i = 0; i < parts.length; i += batchSize) {
      batches.push(parts.slice(i, i + batchSize));
    }

    let processed = 0;
    for (const batch of batches) {
      // Implementamos una función básica de importación
      const importFunc = ((part: any) => {
        console.log(`Procesando pieza: ${part.codArticulo || part.refPrincipal || JSON.stringify(part).slice(0, 50)}`);
        return Promise.resolve();
      });

      await Promise.all(batch.map(part => importFunc(part)));
      processed += batch.length;
      console.log(`Procesado lote de ${batch.length} piezas. Total: ${processed}/${parts.length}`);
    }
  }

  /**
   * Exporta datos a archivo JSON para procesamiento offline
   */
  async exportToFile(data: any, filename: string) {
    try {
      const fs = require('fs');
      await fs.promises.writeFile(
        filename,
        JSON.stringify(data, null, 2)
      );
      console.log(`Datos exportados a ${filename}`);
    } catch (error) {
      console.error('Error al exportar:', error);
    }
  }

  /**
   * Importa vehículos usando el servicio optimizado
   */
  async importVehiclesOptimized(options?: ImportOptions): Promise<ImportResult> {
    try {
      console.log('🚗 Iniciando importación optimizada de vehículos...');
      
      // Configurar el servicio
      await this.optimizedImportService.configure();
      
      // Determinar fecha de inicio
      const fromDate = options?.fullImport ? new Date('1900-01-01') : (options?.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      
      // Iniciar importación usando el servicio optimizado
      const importId = await this.optimizedImportService.startImport('vehicles', fromDate, options?.fullImport);
      
      // Monitorear progreso usando el storage
      let importStatus = await storage.getImportHistoryById(importId);
      
      while (importStatus && importStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
        importStatus = await storage.getImportHistoryById(importId);
      }
      
      return {
        status: importStatus?.status === 'completed' ? 'completed' : 'failed',
        totalItems: importStatus?.totalItems || 0,
        newItems: importStatus?.newItems || 0,
        updatedItems: importStatus?.updatedItems || 0,
        itemsDeactivated: importStatus?.itemsDeactivated || 0,
        errors: importStatus?.errors || ''
      };
      
    } catch (error) {
      console.error('Error en importación optimizada de vehículos:', error);
      return {
        status: 'failed',
        totalItems: 0,
        newItems: 0,
        updatedItems: 0,
        itemsDeactivated: 0,
        errors: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Importa piezas usando el servicio optimizado
   */
  async importPartsOptimized(options?: ImportOptions): Promise<ImportResult> {
    try {
      console.log('🔧 Iniciando importación optimizada de piezas...');
      
      // Configurar el servicio
      await this.optimizedImportService.configure();
      
      // Determinar fecha de inicio
      const fromDate = options?.fullImport ? new Date('1900-01-01') : (options?.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      
      // Iniciar importación usando el servicio optimizado
      const importId = await this.optimizedImportService.startImport('parts', fromDate, options?.fullImport);
      
      // Monitorear progreso usando el storage
      let importStatus = await storage.getImportHistoryById(importId);
      
      while (importStatus && importStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
        importStatus = await storage.getImportHistoryById(importId);
      }
      
      return {
        status: importStatus?.status === 'completed' ? 'completed' : 'failed',
        totalItems: importStatus?.totalItems || 0,
        newItems: importStatus?.newItems || 0,
        updatedItems: importStatus?.updatedItems || 0,
        itemsDeactivated: importStatus?.itemsDeactivated || 0,
        errors: importStatus?.errors || ''
      };
      
    } catch (error) {
      console.error('Error en importación optimizada de piezas:', error);
      return {
        status: 'failed',
        totalItems: 0,
        newItems: 0,
        updatedItems: 0,
        itemsDeactivated: 0,
        errors: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Función para formatear fecha para la API
function formatDateForApi(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const formatted = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  console.log(`Formateando fecha ${date.toISOString()} a ${formatted}`);
  return formatted;
}

export const importScheduler = new ImportScheduler();