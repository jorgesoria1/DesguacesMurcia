/**
 * Servicio de importación corregido - Soluciona todos los problemas identificados
 * 
 * Problemas corregidos:
 * 1. Eliminación de límite artificial de 1000 registros
 * 2. Corrección de nombres de vehículos (mostrar descripción completa)
 * 3. Manejo correcto de estados de importación
 * 4. Visibilidad completa del historial de importaciones
 * 5. Separación correcta entre importación completa y parcial
 */

import axios from 'axios';
import { db } from '../db';
import { vehicles, parts, importHistory, apiConfig, syncControl } from '@shared/schema';
import { eq, sql, inArray, desc, and } from 'drizzle-orm';

interface ImportProgress {
  importId: number;
  type: 'vehicles' | 'parts' | 'all';
  processed: number;
  total: number;
  errors: string[];
  isFullImport: boolean;
}

export class ImportServiceFixed {
  private apiKey: string = '';
  private companyId: number = 0;
  private channel: string = '';
  private readonly apiUrl = 'https://apis.metasync.com/Almacen';
  private readonly maxBatchSize = 1000; // Límite de API, no del sistema
  private readonly maxRetries = 3;

  /**
   * Configura el servicio con datos de la BD
   */
  async configure(): Promise<void> {
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    
    if (!config) {
      throw new Error('No se encontró configuración de API activa');
    }
    
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    this.channel = config.channel;
    
    console.log(`Servicio configurado - Company: ${this.companyId}, Channel: ${this.channel}`);
  }

  /**
   * Formatea fecha para la API
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Realiza petición a la API con reintentos
   */
  private async fetchWithRetry(endpoint: string, params: any, retries: number = 0): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/${endpoint}`, {
        headers: {
          'apikey': this.apiKey,
          'fecha': params.fecha,
          'lastid': params.lastId?.toString() || '0',
          'offset': params.offset?.toString() || this.maxBatchSize.toString(),
          'idempresa': this.companyId.toString()
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      if (retries < this.maxRetries) {
        const delay = Math.pow(2, retries) * 1000;
        console.log(`Error en API, reintentando en ${delay}ms... (intento ${retries + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(endpoint, params, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Inicia importación de vehículos SIN limitaciones artificiales
   */
  async importVehicles(importId: number, isFullImport: boolean = false, fromDate?: Date): Promise<void> {
    await this.configure();
    
    console.log(`🚗 Iniciando importación ${isFullImport ? 'COMPLETA' : 'PARCIAL'} de vehículos`);
    
    // Establecer fecha base
    const baseDate = isFullImport ? new Date('2000-01-01') : (fromDate || new Date('2020-01-01'));
    const formattedDate = this.formatDate(baseDate);
    
    let lastId = 0;
    let totalProcessed = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let hasMore = true;
    const errors: string[] = [];
    
    // Actualizar estado inicial
    await this.updateImportProgress(importId, {
      status: 'in_progress',
      processingItem: `Iniciando importación ${isFullImport ? 'completa' : 'parcial'} de vehículos`,
      progress: 0
    });

    while (hasMore) {
      try {
        console.log(`📡 Solicitando vehículos: lastId=${lastId}, fecha=${formattedDate}`);
        
        // Obtener datos de la API
        const data = await this.fetchWithRetry('RecuperarCambiosVehiculosCanal', {
          fecha: formattedDate,
          lastId: lastId,
          offset: this.maxBatchSize
        });

        // Extraer vehículos del response
        let vehiculos: any[] = [];
        if (data.data?.vehiculos && Array.isArray(data.data.vehiculos)) {
          vehiculos = data.data.vehiculos;
        } else if (data.vehiculos && Array.isArray(data.vehiculos)) {
          vehiculos = data.vehiculos;
        } else if (Array.isArray(data)) {
          vehiculos = data;
        }

        console.log(`📊 Recibidos ${vehiculos.length} vehículos en este lote`);

        if (vehiculos.length === 0) {
          console.log('✅ No hay más vehículos para importar');
          hasMore = false;
          break;
        }

        // Procesar lote
        const results = await this.processVehicleBatch(vehiculos);
        totalProcessed += vehiculos.length;
        totalNew += results.inserted;
        totalUpdated += results.updated;
        errors.push(...results.errors);

        // Actualizar progreso
        await this.updateImportProgress(importId, {
          processedItems: totalProcessed,
          newItems: totalNew,
          updatedItems: totalUpdated,
          processingItem: `Procesados ${totalProcessed} vehículos (${totalNew} nuevos, ${totalUpdated} actualizados)`,
          errors: errors.slice(0, 100)
        });

        // Calcular siguiente lastId
        if (vehiculos.length > 0) {
          const lastVehicle = vehiculos[vehiculos.length - 1];
          lastId = lastVehicle.idLocal || lastVehicle.id || (lastId + vehiculos.length);
        }

        // Continuar si recibimos el batch completo (indica que hay más datos)
        if (vehiculos.length < this.maxBatchSize) {
          hasMore = false;
        }

        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('❌ Error procesando lote de vehículos:', error);
        errors.push(`Error en lote: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        
        // Si hay muchos errores consecutivos, parar
        if (errors.length > 10) {
          break;
        }
        
        lastId++; // Intentar avanzar
      }
    }

    // Finalizar importación
    const finalStatus = errors.length > totalProcessed * 0.1 ? 'partial' : 'completed';
    await this.updateImportProgress(importId, {
      status: finalStatus,
      endTime: new Date(),
      totalItems: totalProcessed,
      progress: 100,
      processingItem: `Importación finalizada: ${totalProcessed} vehículos procesados`
    });

    console.log(`✅ Importación de vehículos ${finalStatus}: ${totalProcessed} procesados, ${totalNew} nuevos, ${totalUpdated} actualizados`);
  }

  /**
   * Inicia importación de piezas SIN limitaciones artificiales
   */
  async importParts(importId: number, isFullImport: boolean = false, fromDate?: Date): Promise<void> {
    await this.configure();
    
    console.log(`🔧 Iniciando importación ${isFullImport ? 'COMPLETA' : 'PARCIAL'} de piezas`);
    
    // Establecer fecha base
    const baseDate = isFullImport ? new Date('2000-01-01') : (fromDate || new Date('2020-01-01'));
    const formattedDate = this.formatDate(baseDate);
    
    let lastId = 0;
    let totalProcessed = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let hasMore = true;
    const errors: string[] = [];
    
    // Actualizar estado inicial
    await this.updateImportProgress(importId, {
      status: 'in_progress',
      processingItem: `Iniciando importación ${isFullImport ? 'completa' : 'parcial'} de piezas`,
      progress: 0
    });

    while (hasMore) {
      try {
        console.log(`📡 Solicitando piezas: lastId=${lastId}, fecha=${formattedDate}`);
        
        // Obtener datos de la API
        const data = await this.fetchWithRetry('RecuperarCambiosCanalEmpresa', {
          fecha: formattedDate,
          lastId: lastId,
          offset: this.maxBatchSize
        });

        // Extraer piezas del response
        let piezas: any[] = [];
        if (data.data?.piezas && Array.isArray(data.data.piezas)) {
          piezas = data.data.piezas;
        } else if (data.piezas && Array.isArray(data.piezas)) {
          piezas = data.piezas;
        } else if (Array.isArray(data)) {
          piezas = data;
        }

        console.log(`📊 Recibidas ${piezas.length} piezas en este lote`);

        if (piezas.length === 0) {
          console.log('✅ No hay más piezas para importar');
          hasMore = false;
          break;
        }

        // Procesar lote
        const results = await this.processPartsBatch(piezas);
        totalProcessed += piezas.length;
        totalNew += results.inserted;
        totalUpdated += results.updated;
        errors.push(...results.errors);

        // Actualizar progreso
        await this.updateImportProgress(importId, {
          processedItems: totalProcessed,
          newItems: totalNew,
          updatedItems: totalUpdated,
          processingItem: `Procesadas ${totalProcessed} piezas (${totalNew} nuevas, ${totalUpdated} actualizadas)`,
          errors: errors.slice(0, 100)
        });

        // Calcular siguiente lastId
        if (piezas.length > 0) {
          const lastPieza = piezas[piezas.length - 1];
          lastId = lastPieza.refLocal || lastPieza.id || (lastId + piezas.length);
        }

        // Continuar si recibimos el batch completo
        if (piezas.length < this.maxBatchSize) {
          hasMore = false;
        }

        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('❌ Error procesando lote de piezas:', error);
        errors.push(`Error en lote: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        
        // Si hay muchos errores consecutivos, parar
        if (errors.length > 10) {
          break;
        }
        
        lastId++; // Intentar avanzar
      }
    }

    // Finalizar importación
    const finalStatus = errors.length > totalProcessed * 0.1 ? 'partial' : 'completed';
    await this.updateImportProgress(importId, {
      status: finalStatus,
      endTime: new Date(),
      totalItems: totalProcessed,
      progress: 100,
      processingItem: `Importación finalizada: ${totalProcessed} piezas procesadas`
    });

    console.log(`✅ Importación de piezas ${finalStatus}: ${totalProcessed} procesadas, ${totalNew} nuevas, ${totalUpdated} actualizadas`);
  }

  /**
   * Procesa un lote de vehículos
   */
  private async processVehicleBatch(vehiculos: any[]): Promise<{ inserted: number; updated: number; errors: string[] }> {
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      // Obtener IDs locales existentes
      const idsLocales = vehiculos.map(v => v.idLocal).filter(id => id != null);
      const existingVehicles = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idsLocales));

      const existingMap = new Map(existingVehicles.map(v => [v.idLocal, v.id]));

      // Separar vehículos nuevos y a actualizar
      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      for (const vehiculo of vehiculos) {
        try {
          // Normalizar datos del vehículo
          const normalized = this.normalizeVehicle(vehiculo);
          
          if (existingMap.has(normalized.idLocal)) {
            toUpdate.push({ ...normalized, id: existingMap.get(normalized.idLocal) });
          } else {
            toInsert.push(normalized);
          }
        } catch (error) {
          errors.push(`Error normalizando vehículo ${vehiculo.idLocal}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Insertar nuevos vehículos
      if (toInsert.length > 0) {
        await db.insert(vehicles).values(toInsert);
        inserted = toInsert.length;
      }

      // Actualizar vehículos existentes
      for (const vehiculo of toUpdate) {
        try {
          await db.update(vehicles)
            .set({
              descripcion: vehiculo.descripcion,
              marca: vehiculo.marca,
              modelo: vehiculo.modelo,
              version: vehiculo.version,
              anyo: vehiculo.anyo,
              combustible: vehiculo.combustible,
              imagenes: vehiculo.imagenes,
              
            })
            .where(eq(vehicles.id, vehiculo.id));
          updated++;
        } catch (error) {
          errors.push(`Error actualizando vehículo ${vehiculo.idLocal}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

    } catch (error) {
      errors.push(`Error procesando lote: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { inserted, updated, errors };
  }

  /**
   * Procesa un lote de piezas
   */
  private async processPartsBatch(piezas: any[]): Promise<{ inserted: number; updated: number; errors: string[] }> {
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      // Obtener referencias locales existentes
      const refsLocales = piezas.map(p => p.refLocal).filter(ref => ref != null);
      const existingParts = await db
        .select({ id: parts.id, refLocal: parts.refLocal })
        .from(parts)
        .where(inArray(parts.refLocal, refsLocales));

      const existingMap = new Map(existingParts.map(p => [p.refLocal, p.id]));

      // Separar piezas nuevas y a actualizar
      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      for (const pieza of piezas) {
        try {
          // Normalizar datos de la pieza
          const normalized = this.normalizePart(pieza);
          
          if (existingMap.has(normalized.refLocal)) {
            toUpdate.push({ ...normalized, id: existingMap.get(normalized.refLocal) });
          } else {
            toInsert.push(normalized);
          }
        } catch (error) {
          errors.push(`Error normalizando pieza ${pieza.refLocal}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Insertar nuevas piezas
      if (toInsert.length > 0) {
        await db.insert(parts).values(toInsert);
        inserted = toInsert.length;
      }

      // Actualizar piezas existentes
      for (const pieza of toUpdate) {
        try {
          await db.update(parts)
            .set({
              descripcionArticulo: pieza.descripcionArticulo,
              precio: pieza.precio,
              imagenes: pieza.imagenes,
              activo: pieza.activo,
              
            })
            .where(eq(parts.id, pieza.id));
          updated++;
        } catch (error) {
          errors.push(`Error actualizando pieza ${pieza.refLocal}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

    } catch (error) {
      errors.push(`Error procesando lote: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { inserted, updated, errors };
  }

  /**
   * Normaliza datos de vehículo para mostrar nombres correctos
   */
  private normalizeVehicle(rawVehicle: any): any {
    return {
      idLocal: rawVehicle.idLocal,
      idEmpresa: rawVehicle.idEmpresa || this.companyId,
      // CORRECCIÓN: Crear descripción completa y legible del vehículo
      descripcion: `${rawVehicle.marca || ''} ${rawVehicle.modelo || ''} ${rawVehicle.version || ''} (${rawVehicle.anyo || ''})`.trim(),
      marca: rawVehicle.marca || '',
      modelo: rawVehicle.modelo || '',
      version: rawVehicle.version || '',
      anyo: parseInt(rawVehicle.anyo) || 0,
      combustible: rawVehicle.combustible || '',
      bastidor: rawVehicle.bastidor || '',
      matricula: rawVehicle.matricula || '',
      color: rawVehicle.color || '',
      kilometraje: parseInt(rawVehicle.kilometraje) || 0,
      potencia: parseInt(rawVehicle.potencia) || 0,
      puertas: parseInt(rawVehicle.puertas) || null,
      imagenes: Array.isArray(rawVehicle.imagenes) ? rawVehicle.imagenes : [],
      activo: true,
      sincronizado: true,
      fechaCreacion: new Date(),
      
    };
  }

  /**
   * Normaliza datos de pieza
   */
  private normalizePart(rawPart: any): any {
    return {
      refLocal: rawPart.refLocal,
      idEmpresa: rawPart.idEmpresa || this.companyId,
      codArticulo: rawPart.codArticulo || '',
      refPrincipal: rawPart.refPrincipal || '',
      descripcionArticulo: rawPart.descripcionArticulo || '',
      descripcionFamilia: rawPart.descripcionFamilia || '',
      codFamilia: rawPart.codFamilia || '',
      precio: parseFloat(rawPart.precio) || 0,
      peso: parseInt(rawPart.peso) || 0,
      idVehiculo: rawPart.idVehiculoOriginal || -1,
      imagenes: Array.isArray(rawPart.imagenes) ? rawPart.imagenes : [],
      activo: parseFloat(rawPart.precio) > 0, // Solo activar si tiene precio válido
      fechaCreacion: new Date(),
      
    };
  }

  /**
   * Actualiza el progreso de una importación
   */
  private async updateImportProgress(importId: number, updates: any): Promise<void> {
    try {
      await db.update(importHistory)
        .set({
          ...updates,
          lastUpdated: new Date()
        })
        .where(eq(importHistory.id, importId));
    } catch (error) {
      console.error('Error actualizando progreso:', error);
    }
  }
}

// Exportar instancia singleton
export const importServiceFixed = new ImportServiceFixed();