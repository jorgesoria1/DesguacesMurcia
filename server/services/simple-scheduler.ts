import { storage } from '../storage';
import { ImportSchedule } from '@shared/schema';
import { db } from '../db';
import { apiConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Scheduler mejorado para importaciones programadas
 * Con validaciones, reintentos y mejor manejo de errores
 */
export class SimpleImportScheduler {
  private isInitialized: boolean = false;
  private schedules: Map<number, NodeJS.Timeout> = new Map();
  private retryAttempts: Map<number, number> = new Map();
  private readonly maxRetryAttempts = 3;

  constructor() {}

  /**
   * Inicializa el programador de importaciones con validaciones mejoradas
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📅 Programador de importaciones ya inicializado');
      return;
    }

    try {
      console.log('🔄 Inicializando sistema de programación de importaciones...');
      
      // VALIDACIÓN CRÍTICA: Verificar configuración de API antes de continuar
      await this.validateApiConfiguration();
      
      // Cargar programaciones desde la base de datos
      const schedules = await storage.getImportSchedules();
      console.log(`📋 Encontradas ${schedules.length} programaciones en base de datos`);
      
      if (schedules.length === 0) {
        console.log('⚙️ Creando programaciones por defecto...');
        await this.createDefaultSchedules();
      } else {
        console.log(`📊 Cargadas ${schedules.length} programaciones existentes`);
        
        // LÓGICA MEJORADA: Procesar programaciones vencidas con mejor control de errores
        const now = new Date();
        let vencidas = 0;
        let programadas = 0;
        
        for (const schedule of schedules) {
          if (schedule.active && schedule.nextRun && schedule.nextRun < now) {
            vencidas++;
            const horasVencida = Math.round((now.getTime() - schedule.nextRun.getTime()) / (1000 * 60 * 60));
            console.log(`🚨 PROGRAMACIÓN VENCIDA: ${schedule.type} (${horasVencida}h de retraso)`);
            
            // Ejecutar con manejo robusto de errores
            try {
              await this.executeImportWithRetry(schedule);
              console.log(`✅ Importación vencida ${schedule.type} recuperada exitosamente`);
            } catch (error) {
              console.error(`❌ Error irrecuperable en importación ${schedule.type}:`, error);
              await this.notifyImportError(schedule, error);
            }
          }
          
          if (schedule.active) {
            this.scheduleImport(schedule);
            programadas++;
          }
        }
        
        console.log(`📊 Resumen inicialización: ${vencidas} recuperadas, ${programadas} programadas`);
      }
      
      this.isInitialized = true;
      console.log('✅ Sistema de programación de importaciones inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error al inicializar programador de importaciones:', error);
      throw error;
    }
  }

  /**
   * Crear programaciones por defecto
   */
  private async createDefaultSchedules(): Promise<void> {
    const defaultSchedules = [
      {
        type: 'vehicles',
        frequency: '12h',
        active: false,
        startTime: '02:00',
        isFullImport: false,
        options: {}
      },
      {
        type: 'parts',
        frequency: '12h', 
        active: false,
        startTime: '02:30',
        isFullImport: false,
        options: {}
      },
      {
        type: 'all',
        frequency: '24h',
        active: false,
        startTime: '01:00',
        isFullImport: false,
        options: {}
      }
    ];

    for (const scheduleData of defaultSchedules) {
      try {
        const schedule = await storage.createImportSchedule(scheduleData);
        console.log(`✅ Programación creada: ${schedule.type} cada ${schedule.frequency} (${schedule.active ? 'activa' : 'inactiva'})`);
      } catch (error) {
        console.error(`❌ Error creando programación ${scheduleData.type}:`, error);
      }
    }
  }

  /**
   * Programa una tarea de importación con mejor cálculo de tiempo
   */
  private scheduleImport(schedule: ImportSchedule): void {
    if (!schedule.active) {
      return;
    }

    console.log(`📅 Programando tarea: ${schedule.type} cada ${schedule.frequency}`);
    
    // Calcular próxima ejecución con lógica mejorada
    const nextExecution = this.calculateNextExecution(schedule);
    const timeUntilNext = nextExecution.getTime() - Date.now();
    
    if (timeUntilNext > 0) {
      const timeout = setTimeout(async () => {
        await this.executeImportWithRetry(schedule);
        // Re-programar automáticamente
        this.scheduleImport(schedule);
      }, timeUntilNext);
      
      this.schedules.set(schedule.id, timeout);
      const minutesUntil = Math.round(timeUntilNext / 1000 / 60);
      const hoursUntil = Math.round(minutesUntil / 60);
      
      if (hoursUntil > 0) {
        console.log(`⏰ ${schedule.type} programada en ${hoursUntil}h (${nextExecution.toLocaleString()})`);
      } else {
        console.log(`⏰ ${schedule.type} programada en ${minutesUntil} minutos (${nextExecution.toLocaleString()})`);
      }
    } else {
      // Esto no debería ocurrir con el nuevo cálculo, pero por seguridad
      console.error(`❌ Error: tiempo calculado es negativo para ${schedule.type}. Usando intervalo por defecto.`);
      const fallbackTime = new Date(Date.now() + this.parseFrequency(schedule.frequency));
      const timeout = setTimeout(async () => {
        await this.executeImportWithRetry(schedule);
        this.scheduleImport(schedule);
      }, this.parseFrequency(schedule.frequency));
      this.schedules.set(schedule.id, timeout);
    }
  }

  /**
   * Ejecuta una importación programada
   */
  private async executeImport(schedule: ImportSchedule): Promise<void> {
    try {
      console.log(`🚀 Ejecutando importación programada: ${schedule.type}`);
      
      // Actualizar última ejecución
      await this.updateLastRun(schedule.id);
      
      // Integración con el sistema de importación real
      const { MetasyncOptimizedImportService } = await import('../api/metasync-optimized-import-service');
      const importService = new MetasyncOptimizedImportService();
      
      if (schedule.type === 'vehicles') {
        console.log(`📋 Iniciando importación de vehículos...`);
        const importRecord = await storage.createImportHistory({
          type: 'vehicles',
          status: 'running',
          isFullImport: false,
          canResume: true,
          startTime: new Date()
        });
        await importService.importVehicles(importRecord.id);
        console.log(`✅ Importación de vehículos completada (ID: ${importRecord.id})`);
      } else if (schedule.type === 'parts') {
        console.log(`🔧 Iniciando importación de piezas...`);
        const importRecord = await storage.createImportHistory({
          type: 'parts',
          status: 'running',
          isFullImport: false,
          canResume: true,
          startTime: new Date()
        });
        await importService.importParts(importRecord.id);
        console.log(`✅ Importación de piezas completada (ID: ${importRecord.id})`);
      } else if (schedule.type === 'all') {
        console.log(`🌟 Iniciando importación completa...`);
        
        // Crear registro para vehículos
        const vehicleImportRecord = await storage.createImportHistory({
          type: 'vehicles',
          status: 'running',
          isFullImport: false,
          canResume: true,
          startTime: new Date()
        });
        
        // Crear registro para piezas
        const partsImportRecord = await storage.createImportHistory({
          type: 'parts',
          status: 'running',
          isFullImport: false,
          canResume: true,
          startTime: new Date()
        });
        
        // Ejecutar ambas importaciones
        await importService.importVehicles(vehicleImportRecord.id, false);
        await importService.importParts(partsImportRecord.id);
        
        console.log(`✅ Importación completa completada (Vehículos ID: ${vehicleImportRecord.id}, Piezas ID: ${partsImportRecord.id})`);
      }
      
    } catch (error) {
      console.error(`❌ Error en importación programada ${schedule.type}:`, error);
      // Registrar el error en la base de datos
      try {
        await storage.createImportHistory({
          type: schedule.type,
          status: 'failed',
          isFullImport: false,
          canResume: false,
          startTime: new Date(),
          endTime: new Date(),
          errorCount: 1,
          errors: [error instanceof Error ? error.message : String(error)]
        });
      } catch (dbError) {
        console.error(`❌ Error adicional registrando fallo:`, dbError);
      }
    }
  }

  /**
   * Actualiza la última ejecución de una programación
   */
  private async updateLastRun(scheduleId: number): Promise<void> {
    try {
      await storage.updateImportSchedule(scheduleId, {
        lastRun: new Date(),
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000) // Próxima en 24h por defecto
      });
    } catch (error) {
      console.error('Error actualizando última ejecución:', error);
    }
  }

  /**
   * Convierte frecuencia en milisegundos con validación mejorada
   */
  private parseFrequency(frequency: string): number {
    if (!frequency || typeof frequency !== 'string') {
      console.warn(`⚠️ Frecuencia inválida: ${frequency}`);
      return 0;
    }

    const match = frequency.match(/(\d+)([hmdw])/);
    if (!match) {
      console.warn(`⚠️ Formato de frecuencia no reconocido: ${frequency}`);
      return 0;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    if (value <= 0 || value > 168) { // Máximo 1 semana
      console.warn(`⚠️ Valor de frecuencia fuera de rango: ${value}`);
      return 0;
    }

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000; // horas
      case 'm': return value * 60 * 1000; // minutos  
      case 'd': return value * 24 * 60 * 60 * 1000; // días
      case 'w': return value * 7 * 24 * 60 * 60 * 1000; // semanas
      default: 
        console.warn(`⚠️ Unidad no reconocida: ${unit}`);
        return 0;
    }
  }

  /**
   * Obtiene el estado de inicialización
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Ejecuta una importación inmediata para pruebas
   */
  async executeImmediate(type: 'vehicles' | 'parts' | 'all'): Promise<void> {
    try {
      console.log(`🚀 Ejecutando importación inmediata: ${type}`);
      
      const schedule = {
        id: -1, // ID temporal para ejecución inmediata
        type,
        frequency: 'immediate',
        active: true,
        isFullImport: false,
        lastRun: null,
        nextRun: null,
        startTime: '00:00',
        days: null,
        options: {}
      } as ImportSchedule;
      
      await this.executeImport(schedule);
      
    } catch (error) {
      console.error(`❌ Error en importación inmediata ${type}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza las fechas de próxima ejecución para programaciones obsoletas
   */
  async updateObsoleteSchedules(): Promise<void> {
    try {
      const schedules = await storage.getImportSchedules();
      const now = new Date();
      
      for (const schedule of schedules) {
        if (schedule.nextRun && schedule.nextRun < now && schedule.active) {
          // Calcular próxima ejecución basada en la frecuencia
          const intervalMs = this.parseFrequency(schedule.frequency);
          const nextRun = new Date(now.getTime() + intervalMs);
          
          await storage.updateImportSchedule(schedule.id, {
            nextRun
          });
          
          console.log(`📅 Actualizada programación ${schedule.type}: próxima ejecución ${nextRun.toISOString()}`);
        }
      }
    } catch (error) {
      console.error('❌ Error actualizando programaciones obsoletas:', error);
    }
  }

  /**
   * Fuerza la reinicialización del scheduler
   */
  async forceReinitialize(): Promise<void> {
    console.log('🔄 Forzando reinicialización del scheduler...');
    
    // Limpiar programaciones existentes
    this.cleanup();
    
    // Actualizar programaciones obsoletas
    await this.updateObsoleteSchedules();
    
    // Reinicializar
    await this.initialize();
    
    console.log('✅ Scheduler reinicializado correctamente');
  }

  /**
   * Limpia todas las programaciones
   */
  cleanup(): void {
    for (const timeout of this.schedules.values()) {
      clearTimeout(timeout);
    }
    this.schedules.clear();
    this.isInitialized = false;
    console.log('🧹 Programaciones limpiadas');
  }

  /**
   * Valida la configuración de API antes de inicializar
   */
  private async validateApiConfiguration(): Promise<void> {
    try {
      const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
      
      if (!config) {
        console.warn('⚠️ No hay configuración de API activa - las importaciones podrían fallar');
        return;
      }
      
      if (!config.apiKey || config.apiKey === 'API_KEY_PLACEHOLDER') {
        console.warn('⚠️ API Key no configurada - las importaciones fallarán');
        return;
      }
      
      if (!config.companyId || config.companyId <= 0) {
        console.warn('⚠️ Company ID inválido - verificar configuración');
        return;
      }
      
      console.log(`✅ Configuración API validada: Company ${config.companyId}, Channel ${config.channel}`);
      
    } catch (error) {
      console.error('❌ Error validando configuración de API:', error);
      throw new Error('Fallo en validación de configuración API');
    }
  }
  
  /**
   * Calcula la próxima ejecución considerando startTime
   */
  private calculateNextExecution(schedule: ImportSchedule): Date {
    const now = new Date();
    const intervalMs = this.parseFrequency(schedule.frequency);
    
    if (intervalMs <= 0) {
      return new Date(now.getTime() + 60 * 60 * 1000); // Default: 1 hora
    }
    
    // Si hay startTime definido, intentar programar a esa hora
    if (schedule.startTime) {
      const [hours, minutes] = schedule.startTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const nextExecution = new Date();
        nextExecution.setHours(hours, minutes, 0, 0);
        
        // Si ya pasó hoy, seguir agregando el intervalo hasta encontrar un tiempo futuro
        while (nextExecution <= now) {
          nextExecution.setTime(nextExecution.getTime() + intervalMs);
        }
        
        return nextExecution;
      }
    }
    
    // Fallback: simplemente añadir el intervalo
    return new Date(now.getTime() + intervalMs);
  }
  
  /**
   * Ejecuta importación con sistema de reintentos
   */
  private async executeImportWithRetry(schedule: ImportSchedule): Promise<void> {
    const maxRetries = this.maxRetryAttempts;
    let attempt = this.retryAttempts.get(schedule.id) || 0;
    
    for (let retry = attempt; retry < maxRetries; retry++) {
      try {
        console.log(`🚀 Ejecutando ${schedule.type} (intento ${retry + 1}/${maxRetries})...`);
        
        await this.executeImport(schedule);
        
        // Éxito: resetear contador de reintentos
        this.retryAttempts.delete(schedule.id);
        console.log(`✅ ${schedule.type} ejecutada exitosamente`);
        return;
        
      } catch (error) {
        console.error(`❌ Intento ${retry + 1} fallido para ${schedule.type}:`, error);
        
        if (retry < maxRetries - 1) {
          const delay = Math.pow(2, retry) * 60 * 1000; // Backoff exponencial
          console.log(`⏳ Esperando ${delay/1000/60} minutos antes del siguiente intento...`);
          this.retryAttempts.set(schedule.id, retry + 1);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Todos los reintentos agotados
          this.retryAttempts.delete(schedule.id);
          await this.notifyImportError(schedule, error);
          throw error;
        }
      }
    }
  }
  
  /**
   * Notifica errores de importación para monitoreo
   */
  private async notifyImportError(schedule: ImportSchedule, error: any): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Registrar en base de datos
      await storage.createImportHistory({
        type: schedule.type,
        status: 'failed',
        isFullImport: schedule.isFullImport || false,
        canResume: false,
        startTime: new Date(),
        endTime: new Date(),
        errorCount: 1,
        errors: [errorMessage],
        details: {
          scheduleId: schedule.id,
          retryAttempts: this.maxRetryAttempts,
          failureReason: 'max_retries_exceeded'
        }
      });
      
      console.error(`🚨 FALLO CRÍTICO: Importación ${schedule.type} fallida tras ${this.maxRetryAttempts} intentos`);
      console.error(`📝 Detalle del error: ${errorMessage}`);
      
      // TODO: En el futuro, enviar notificación por email o webhook
      
    } catch (notifyError) {
      console.error('❌ Error adicional al notificar fallo:', notifyError);
    }
  }
}

// Instancia singleton
export const simpleScheduler = new SimpleImportScheduler();