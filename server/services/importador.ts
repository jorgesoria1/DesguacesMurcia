/**
 * Sistema de importación simplificado para MetaSync
 * Este archivo centraliza la lógica de importación de vehículos y piezas
 */
import axios from 'axios';
import { db } from '../db';
import { vehicles, parts } from '@shared/schema';
import { eq, inArray, isNull } from 'drizzle-orm';
import { importHistory } from '@shared/schema';

// URL base de MetaSync
const METASYNC_BASE_URL = 'https://apis.metasync.com';
const METASYNC_ALMACEN_URL = `${METASYNC_BASE_URL}/Almacen`;

/**
 * Servicio de importación simplificado
 */
export class ImportadorService {
  // Configuración de la API
  private apiKey: string = '';
  private companyId: number = 1236;
  
  /**
   * Constructor
   */
  constructor() {}
  
  /**
   * Establece la configuración para la API
   */
  setConfig(apiKey: string, companyId: number) {
    this.apiKey = apiKey;
    this.companyId = companyId;
  }
  
  /**
   * Inicia un proceso de importación
   */
  async iniciarImportacion(tipo: 'vehicles' | 'parts' | 'all', importId: number, desdeDate?: Date): Promise<void> {
    // Validar configuración
    if (!this.apiKey) {
      throw new Error('No se ha establecido la clave API');
    }
    
    try {
      // Actualizar estado de importación a "en progreso"
      await db.update(importHistory)
        .set({ 
          status: 'running',
          totalItems: 0,
          processedItems: 0,
          newItems: 0,
          updatedItems: 0,
          errorCount: 0,
          errors: []
        })
        .where(eq(importHistory.id, importId));
      
      // Ejecutar según tipo
      switch (tipo) {
        case 'vehicles':
          await this.importarVehiculos(importId, desdeDate);
          break;
        case 'parts':
          await this.importarPiezas(importId, desdeDate);
          break;
        case 'all':
          await this.importarVehiculos(importId, desdeDate);
          await this.importarPiezas(importId, desdeDate);
          break;
      }
      
      // Procesar relaciones pendientes
      await this.procesarRelacionesPendientes();
      
      // Actualizar estado de importación a "completado"
      await db.update(importHistory)
        .set({ 
          status: 'completed',
          endTime: new Date()
        })
        .where(eq(importHistory.id, importId));
        
      console.log(`Importación ${tipo} completada`);
    } catch (error) {
      console.error(`Error en importación ${tipo}:`, error);
      
      // Actualizar estado de importación a "fallido"
      await db.update(importHistory)
        .set({ 
          status: 'failed',
          endTime: new Date(),
          errorCount: 1,
          errors: [error instanceof Error ? error.message : 'Error desconocido']
        })
        .where(eq(importHistory.id, importId));
    }
  }
  
  /**
   * Importa vehículos desde la API
   */
  private async importarVehiculos(importId: number, desdeDate?: Date): Promise<void> {
    console.log('Iniciando importación de vehículos...');
    
    // Establecer fecha por defecto si no se proporciona
    const fechaDesde = desdeDate || new Date('2000-01-01');
    
    try {
      // Contadores
      let totalItems = 0;
      let processedItems = 0;
      let newItems = 0;
      let updatedItems = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Parámetros de paginación
      let lastId = 0;
      let hasMore = true;
      const pageSize = 200; // Tamaño de página moderado para evitar sobrecarga
      
      // Bucle de paginación
      while (hasMore) {
        try {
          console.log(`Obteniendo vehículos: lastId=${lastId}, pageSize=${pageSize}`);
          
          // Formatear fecha
          const fechaFormateada = this.formatDate(fechaDesde);
          
          // Obtener datos de API
          const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosVehiculosCanal`, {
            headers: {
              'apikey': this.apiKey,
              'fecha': fechaFormateada,
              'lastid': lastId.toString(),
              'offset': pageSize.toString()
            }
          });
          
          // Validar respuesta
          if (!response.data || !response.data.vehiculos) {
            console.error('Formato de respuesta inválido:', response.data);
            hasMore = false;
            continue;
          }
          
          const vehiculos = response.data.vehiculos;
          console.log(`Recibidos ${vehiculos.length} vehículos de API`);
          
          if (vehiculos.length === 0) {
            hasMore = false;
            continue;
          }
          
          // Actualizar estadísticas
          totalItems += vehiculos.length;
          
          // Procesar lote de vehículos
          const resultadoProcesamiento = await this.procesarLoteVehiculos(vehiculos);
          newItems += resultadoProcesamiento.insertados;
          updatedItems += resultadoProcesamiento.actualizados;
          processedItems += vehiculos.length;
          
          if (resultadoProcesamiento.errores.length > 0) {
            errorCount += resultadoProcesamiento.errores.length;
            errors.push(...resultadoProcesamiento.errores);
          }
          
          // Actualizar estado de importación
          await db.update(importHistory)
            .set({ 
              totalItems, 
              processedItems, 
              newItems, 
              updatedItems, 
              errorCount, 
              errors: errors.slice(0, 100) // Limitar tamaño de errores
            })
            .where(eq(importHistory.id, importId));
          
          // Actualizar lastId para la siguiente página
          if (response.data.paginacion && response.data.paginacion.lastId) {
            lastId = response.data.paginacion.lastId;
            
            // Si estamos cerca del límite, parar
            if (response.data.paginacion.total && 
                processedItems >= response.data.paginacion.total) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error('Error obteniendo vehículos:', error);
          errorCount++;
          errors.push(`Error obteniendo vehículos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          
          // Actualizar estado con el error
          await db.update(importHistory)
            .set({ 
              totalItems, 
              processedItems, 
              newItems, 
              updatedItems, 
              errorCount, 
              errors: errors.slice(0, 100)
            })
            .where(eq(importHistory.id, importId));
          
          // Continuar con la siguiente página
          lastId++;
        }
      }
      
      console.log(`Importación de vehículos completada: procesados=${processedItems}, nuevos=${newItems}, actualizados=${updatedItems}, errores=${errorCount}`);
    } catch (error) {
      console.error('Error global en importación de vehículos:', error);
      throw error;
    }
  }
  
  /**
   * Importa piezas desde la API
   */
  private async importarPiezas(importId: number, desdeDate?: Date): Promise<void> {
    console.log('Iniciando importación de piezas...');
    
    // Establecer fecha por defecto si no se proporciona
    const fechaDesde = desdeDate || new Date('2000-01-01');
    
    try {
      // Contadores
      let totalItems = 0;
      let processedItems = 0;
      let newItems = 0;
      let updatedItems = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Parámetros de paginación
      let lastId = 0;
      let hasMore = true;
      const pageSize = 200; // Tamaño de página moderado para evitar sobrecarga
      
      // Bucle de paginación
      while (hasMore) {
        try {
          console.log(`Obteniendo piezas: lastId=${lastId}, pageSize=${pageSize}`);
          
          // Formatear fecha
          const fechaFormateada = this.formatDate(fechaDesde);
          
          // Obtener datos de API
          const response = await axios.get(`${METASYNC_ALMACEN_URL}/RecuperarCambiosCanalEmpresa`, {
            headers: {
              'apikey': this.apiKey,
              'fecha': fechaFormateada,
              'lastid': lastId.toString(),
              'offset': pageSize.toString(),
              'idempresa': this.companyId.toString()
            }
          });
          
          // Validar respuesta
          if (!response.data || !response.data.piezas) {
            console.error('Formato de respuesta inválido:', response.data);
            hasMore = false;
            continue;
          }
          
          const piezas = response.data.piezas;
          console.log(`Recibidas ${piezas.length} piezas de API`);
          
          if (piezas.length === 0) {
            hasMore = false;
            continue;
          }
          
          // Actualizar estadísticas
          totalItems += piezas.length;
          
          // Procesar lote de piezas
          const resultadoProcesamiento = await this.procesarLotePiezas(piezas);
          newItems += resultadoProcesamiento.insertadas;
          updatedItems += resultadoProcesamiento.actualizadas;
          processedItems += piezas.length;
          
          if (resultadoProcesamiento.errores.length > 0) {
            errorCount += resultadoProcesamiento.errores.length;
            errors.push(...resultadoProcesamiento.errores);
          }
          
          // Actualizar estado de importación
          await db.update(importHistory)
            .set({ 
              totalItems, 
              processedItems, 
              newItems, 
              updatedItems, 
              errorCount, 
              errors: errors.slice(0, 100) // Limitar tamaño de errores
            })
            .where(eq(importHistory.id, importId));
          
          // Actualizar lastId para la siguiente página
          if (response.data.paginacion && response.data.paginacion.lastId) {
            lastId = response.data.paginacion.lastId;
            
            // Si estamos cerca del límite, parar
            if (response.data.paginacion.total && 
                processedItems >= response.data.paginacion.total) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error('Error obteniendo piezas:', error);
          errorCount++;
          errors.push(`Error obteniendo piezas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          
          // Actualizar estado con el error
          await db.update(importHistory)
            .set({ 
              totalItems, 
              processedItems, 
              newItems, 
              updatedItems, 
              errorCount, 
              errors: errors.slice(0, 100)
            })
            .where(eq(importHistory.id, importId));
          
          // Continuar con la siguiente página
          lastId++;
        }
      }
      
      console.log(`Importación de piezas completada: procesadas=${processedItems}, nuevas=${newItems}, actualizadas=${updatedItems}, errores=${errorCount}`);
    } catch (error) {
      console.error('Error global en importación de piezas:', error);
      throw error;
    }
  }
  
  /**
   * Formatea una fecha para la API de MetaSync
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
   * Procesa un lote de vehículos
   */
  private async procesarLoteVehiculos(vehiculosRaw: any[]): Promise<{
    insertados: number;
    actualizados: number;
    errores: string[];
  }> {
    let insertados = 0;
    let actualizados = 0;
    const errores: string[] = [];
    
    try {
      // Preprocesar vehículos
      const vehiculosProcesados = vehiculosRaw.map(v => this.normalizarVehiculo(v));
      
      // Obtener IDs locales para buscar existentes
      const idsLocales = vehiculosProcesados.map(v => v.idLocal);
      
      // Buscar vehículos existentes
      const existentes = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idsLocales));
      
      // Crear mapa para búsqueda rápida
      const mapaExistentes = new Map(
        existentes.map(v => [v.idLocal, v.id])
      );
      
      // Separar vehículos para inserción y actualización
      const vehiculosNuevos = [];
      const vehiculosActualizar = [];
      
      for (const vehiculo of vehiculosProcesados) {
        if (mapaExistentes.has(vehiculo.idLocal)) {
          // Actualizar existente
          vehiculosActualizar.push({
            ...vehiculo,
            id: mapaExistentes.get(vehiculo.idLocal)
          });
        } else {
          // Vehículo nuevo
          vehiculosNuevos.push(vehiculo);
        }
      }
      
      // Insertar nuevos vehículos
      if (vehiculosNuevos.length > 0) {
        console.log(`Insertando ${vehiculosNuevos.length} vehículos nuevos`);
        
        // Insertar en lotes pequeños
        for (let i = 0; i < vehiculosNuevos.length; i += 50) {
          const lote = vehiculosNuevos.slice(i, i + 50);
          
          try {
            const resultado = await db
              .insert(vehicles)
              .values(lote)
              .returning({ id: vehicles.id, idLocal: vehicles.idLocal });
            
            insertados += resultado.length;
            
            // Actualizar mapa
            for (const v of resultado) {
              mapaExistentes.set(v.idLocal, v.id);
            }
          } catch (error) {
            console.error(`Error insertando lote ${i / 50 + 1}:`, error);
            errores.push(`Error insertando lote ${i / 50 + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }
      }
      
      // Actualizar vehículos existentes
      if (vehiculosActualizar.length > 0) {
        console.log(`Actualizando ${vehiculosActualizar.length} vehículos existentes`);
        
        // Actualizar en lotes pequeños
        for (let i = 0; i < vehiculosActualizar.length; i += 50) {
          const lote = vehiculosActualizar.slice(i, i + 50);
          
          for (const v of lote) {
            try {
              await db
                .update(vehicles)
                .set({
                  marca: v.marca,
                  modelo: v.modelo,
                  version: v.version,
                  descripcion: v.descripcion,
                  anyo: v.anyo,
                  combustible: v.combustible,
                  bastidor: v.bastidor,
                  matricula: v.matricula,
                  color: v.color,
                  kilometraje: v.kilometraje,
                  potencia: v.potencia,
                  imagenes: v.imagenes,
                  activo: true,
                  sincronizado: true,
                  ultimaSincronizacion: new Date(),
                  
                })
                .where(eq(vehicles.id, v.id));
              
              actualizados++;
            } catch (error) {
              console.error(`Error actualizando vehículo ${v.idLocal}:`, error);
              errores.push(`Error actualizando vehículo ${v.idLocal}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
          }
        }
      }
      
      return { insertados, actualizados, errores };
    } catch (error) {
      console.error('Error global procesando lote de vehículos:', error);
      errores.push(`Error global: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return { insertados, actualizados, errores };
    }
  }
  
  /**
   * Normaliza un vehículo para inserción/actualización
   */
  private normalizarVehiculo(vehiculoRaw: any): any {
    // Propiedades básicas
    const idLocal = vehiculoRaw.idLocal || vehiculoRaw.IdLocal || 0;
    const idEmpresa = vehiculoRaw.idEmpresa || vehiculoRaw.IdEmpresa || this.companyId;
    
    // Propiedades principales
    const marca = vehiculoRaw.nombreMarca || vehiculoRaw.NombreMarca || 
                 vehiculoRaw.marca || vehiculoRaw.Marca || 'Desconocida';
    
    const modelo = vehiculoRaw.nombreModelo || vehiculoRaw.NombreModelo || 
                  vehiculoRaw.modelo || vehiculoRaw.Modelo || 'Desconocido';
    
    const version = vehiculoRaw.nombreVersion || vehiculoRaw.NombreVersion || 
                   vehiculoRaw.version || vehiculoRaw.Version || 'Desconocida';
    
    // Propiedades secundarias
    const anyo = vehiculoRaw.anyoVehiculo || vehiculoRaw.AnyoVehiculo || 
                vehiculoRaw.anyo || vehiculoRaw.Anyo || 0;
    
    const combustible = vehiculoRaw.combustible || vehiculoRaw.Combustible || '';
    const bastidor = vehiculoRaw.bastidor || vehiculoRaw.Bastidor || '';
    const matricula = vehiculoRaw.matricula || vehiculoRaw.Matricula || '';
    const color = vehiculoRaw.color || vehiculoRaw.Color || '';
    const kilometraje = vehiculoRaw.kilometraje || vehiculoRaw.Kilometraje || 0;
    const potencia = vehiculoRaw.potenciaHP || vehiculoRaw.PotenciaHP || 
                    vehiculoRaw.potencia || vehiculoRaw.Potencia || 0;
    const puertas = vehiculoRaw.puertas || vehiculoRaw.Puertas || null;
    
    // Generar descripción
    const descripcion = `${marca} ${modelo} ${version}${anyo ? ` (${anyo})` : ''}`.trim() || 
                       `Vehículo ID ${idLocal}`;
    
    // Normalizar imágenes
    let imagenes: string[] = [];
    
    if (Array.isArray(vehiculoRaw.urlsImgs) && vehiculoRaw.urlsImgs.length > 0) {
      imagenes = vehiculoRaw.urlsImgs;
    } else if (Array.isArray(vehiculoRaw.UrlsImgs) && vehiculoRaw.UrlsImgs.length > 0) {
      imagenes = vehiculoRaw.UrlsImgs;
    } else if (typeof vehiculoRaw.urlsImgs === 'string' && vehiculoRaw.urlsImgs) {
      imagenes = [vehiculoRaw.urlsImgs];
    } else if (typeof vehiculoRaw.UrlsImgs === 'string' && vehiculoRaw.UrlsImgs) {
      imagenes = [vehiculoRaw.UrlsImgs];
    }
    
    // Si no hay imágenes, usar una predeterminada
    if (imagenes.length === 0) {
      imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
    }
    
    // Retornar objeto normalizado
    return {
      idLocal,
      idEmpresa,
      marca,
      modelo,
      version,
      anyo,
      combustible,
      bastidor,
      matricula,
      color,
      kilometraje,
      potencia,
      puertas,
      descripcion,
      imagenes,
      activo: true,
      sincronizado: true,
      ultimaSincronizacion: new Date()
    };
  }
  
  /**
   * Procesa un lote de piezas
   */
  private async procesarLotePiezas(piezasRaw: any[]): Promise<{
    insertadas: number;
    actualizadas: number;
    errores: string[];
  }> {
    let insertadas = 0;
    let actualizadas = 0;
    const errores: string[] = [];
    
    try {
      // Preprocesar piezas
      const piezasProcesadas = piezasRaw.map(p => this.normalizarPieza(p));
      
      // Obtener referencias locales para buscar existentes
      const refsLocales = piezasProcesadas.map(p => p.refLocal);
      
      // Buscar piezas existentes
      const existentes = await db
        .select({ id: parts.id, refLocal: parts.refLocal })
        .from(parts)
        .where(inArray(parts.refLocal, refsLocales));
      
      // Crear mapa para búsqueda rápida
      const mapaExistentes = new Map(
        existentes.map(p => [p.refLocal, p.id])
      );
      
      // Extraer relaciones pieza-vehículo
      const relaciones: { refLocal: number; idVehiculoOriginal: number }[] = [];
      
      for (const pieza of piezasProcesadas) {
        if (pieza.idVehiculoOriginal > 0) {
          relaciones.push({
            refLocal: pieza.refLocal,
            idVehiculoOriginal: pieza.idVehiculoOriginal
          });
          
          // Eliminar para no intentar insertar en tabla parts
          delete pieza.idVehiculoOriginal;
        }
      }
      
      // Separar piezas para inserción y actualización
      const piezasNuevas = [];
      const piezasActualizar = [];
      
      for (const pieza of piezasProcesadas) {
        if (mapaExistentes.has(pieza.refLocal)) {
          // Actualizar existente
          piezasActualizar.push({
            ...pieza,
            id: mapaExistentes.get(pieza.refLocal)
          });
        } else {
          // Pieza nueva
          piezasNuevas.push(pieza);
        }
      }
      
      // Insertar nuevas piezas
      if (piezasNuevas.length > 0) {
        console.log(`Insertando ${piezasNuevas.length} piezas nuevas`);
        
        // Insertar en lotes pequeños
        for (let i = 0; i < piezasNuevas.length; i += 50) {
          const lote = piezasNuevas.slice(i, i + 50);
          
          try {
            const resultado = await db
              .insert(parts)
              .values(lote)
              .returning({ id: parts.id, refLocal: parts.refLocal });
            
            insertadas += resultado.length;
            
            // Actualizar mapa
            for (const p of resultado) {
              mapaExistentes.set(p.refLocal, p.id);
            }
          } catch (error) {
            console.error(`Error insertando lote de piezas ${i / 50 + 1}:`, error);
            errores.push(`Error insertando lote de piezas ${i / 50 + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }
      }
      
      // Actualizar piezas existentes
      if (piezasActualizar.length > 0) {
        console.log(`Actualizando ${piezasActualizar.length} piezas existentes`);
        
        // Actualizar en lotes pequeños
        for (let i = 0; i < piezasActualizar.length; i += 50) {
          const lote = piezasActualizar.slice(i, i + 50);
          
          for (const p of lote) {
            try {
              await db
                .update(parts)
                .set({
                  codFamilia: p.codFamilia,
                  descripcionFamilia: p.descripcionFamilia,
                  codArticulo: p.codArticulo,
                  descripcionArticulo: p.descripcionArticulo,
                  codVersion: p.codVersion,
                  refPrincipal: p.refPrincipal,
                  anyoInicio: p.anyoInicio,
                  anyoFin: p.anyoFin,
                  puertas: p.puertas,
                  rvCode: p.rvCode,
                  precio: p.precio,
                  anyoStock: p.anyoStock,
                  peso: p.peso,
                  ubicacion: p.ubicacion,
                  observaciones: p.observaciones,
                  reserva: p.reserva,
                  tipoMaterial: p.tipoMaterial,
                  imagenes: p.imagenes,
                  sincronizado: true,
                  ultimaSincronizacion: new Date(),
                  
                })
                .where(eq(parts.id, p.id));
              
              actualizadas++;
            } catch (error) {
              console.error(`Error actualizando pieza ${p.refLocal}:`, error);
              errores.push(`Error actualizando pieza ${p.refLocal}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
          }
        }
      }
      
      // Procesar relaciones pieza-vehículo
      if (relaciones.length > 0) {
        await this.procesarRelacionesPiezaVehiculo(relaciones, mapaExistentes);
      }
      
      return { insertadas, actualizadas, errores };
    } catch (error) {
      console.error('Error global procesando lote de piezas:', error);
      errores.push(`Error global: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return { insertadas, actualizadas, errores };
    }
  }
  
  /**
   * Normaliza una pieza para inserción/actualización
   */
  private normalizarPieza(piezaRaw: any): any {
    // Propiedades básicas
    const refLocal = piezaRaw.refLocal || 0;
    const idEmpresa = piezaRaw.idEmpresa || this.companyId;
    const idVehiculoOriginal = piezaRaw.idVehiculo || -1;
    
    // Propiedades de categorización
    const codFamilia = piezaRaw.codFamilia || '';
    const descripcionFamilia = piezaRaw.descripcionFamilia || '';
    const codArticulo = piezaRaw.codArticulo || '';
    const descripcionArticulo = piezaRaw.descripcionArticulo || 'Pieza sin descripción';
    const codVersion = piezaRaw.codVersion || '';
    const refPrincipal = piezaRaw.refPrincipal || '';
    
    // Propiedades para matching
    const rvCode = piezaRaw.codVersion || '';
    const anyoInicio = piezaRaw.anyoInicio || null;
    const anyoFin = piezaRaw.anyoFin || null;
    const puertas = piezaRaw.puertas || 0;
    
    // Propiedades de detalle
    const precio = String(piezaRaw.precio || 0);
    const anyoStock = piezaRaw.anyoStock || 0;
    const peso = String(piezaRaw.peso || 0);
    const ubicacion = piezaRaw.ubicacion || 0;
    const observaciones = piezaRaw.observaciones || '';
    const reserva = piezaRaw.reserva || 0;
    const tipoMaterial = piezaRaw.tipoMaterial || 0;
    
    // Normalizar imágenes
    let imagenes: string[] = [];
    
    if (Array.isArray(piezaRaw.urlsImgs) && piezaRaw.urlsImgs.length > 0) {
      imagenes = piezaRaw.urlsImgs;
    } else if (Array.isArray(piezaRaw.UrlsImgs) && piezaRaw.UrlsImgs.length > 0) {
      imagenes = piezaRaw.UrlsImgs;
    } else if (typeof piezaRaw.urlsImgs === 'string' && piezaRaw.urlsImgs) {
      imagenes = [piezaRaw.urlsImgs];
    } else if (typeof piezaRaw.UrlsImgs === 'string' && piezaRaw.UrlsImgs) {
      imagenes = [piezaRaw.UrlsImgs];
    }
    
    // Si no hay imágenes, usar una predeterminada
    if (imagenes.length === 0) {
      imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
    }
    
    // Retornar objeto normalizado
    return {
      refLocal,
      idEmpresa,
      codFamilia,
      descripcionFamilia,
      codArticulo,
      descripcionArticulo,
      codVersion,
      refPrincipal,
      anyoInicio,
      anyoFin,
      puertas,
      rvCode,
      precio,
      anyoStock,
      peso,
      ubicacion,
      observaciones,
      reserva,
      tipoMaterial,
      imagenes,
      activo: false, // Se activará cuando tenga relaciones
      sincronizado: true,
      ultimaSincronizacion: new Date(),
      idVehiculoOriginal // Campo temporal para relación
    };
  }
  
  /**
   * Procesa relaciones entre piezas y vehículos
   */
  private async procesarRelacionesPiezaVehiculo(
    relaciones: { refLocal: number; idVehiculoOriginal: number }[],
    mapaPiezas: Map<number, number>
  ): Promise<void> {
    try {
      console.log(`Procesando ${relaciones.length} relaciones pieza-vehículo`);
      
      // Obtener IDs de vehículos originales (únicos)
      const idsVehiculosOriginales = Array.from(new Set(relaciones.map(r => r.idVehiculoOriginal)));
      
      // Buscar vehículos existentes
      const vehiculosExistentes = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idsVehiculosOriginales));
      
      // Crear mapa para búsqueda rápida
      const mapaVehiculos = new Map(
        vehiculosExistentes.map(v => [v.idLocal, v.id])
      );
      
      // Procesar cada relación
      for (const relacion of relaciones) {
        const partId = mapaPiezas.get(relacion.refLocal);
        const vehicleId = mapaVehiculos.get(relacion.idVehiculoOriginal);
        
        if (!partId) {
          console.log(`No se encontró la pieza con refLocal ${relacion.refLocal}`);
          continue;
        }
        
        try {
          // Si existe el vehículo, crear relación
          if (vehicleId) {
            // Verificar si ya existe
            const relacionExistente = await db
              .select({ id: vehicleParts.id })
              .from(vehicleParts)
              .where(eq(vehicleParts.partId, partId))
              .where(eq(vehicleParts.vehicleId, vehicleId));
            
            if (relacionExistente.length === 0) {
              // Crear nueva relación
              await db.insert(vehicleParts).values({
                vehicleId,
                partId,
                idVehiculoOriginal: relacion.idVehiculoOriginal
              });
              
              // Activar la pieza
              await db
                .update(parts)
                .set({ activo: true })
                .where(eq(parts.id, partId));
            }
          } else {
            // Vehículo no encontrado, crear relación pendiente
            const relacionPendienteExistente = await db
              .select({ id: vehicleParts.id })
              .from(vehicleParts)
              .where(eq(vehicleParts.partId, partId))
              .where(eq(vehicleParts.idVehiculoOriginal, relacion.idVehiculoOriginal))
              .where(isNull(vehicleParts.vehicleId));
            
            if (relacionPendienteExistente.length === 0) {
              await db.insert(vehicleParts).values({
                vehicleId: null, // Pendiente
                partId,
                idVehiculoOriginal: relacion.idVehiculoOriginal
              });
            }
          }
        } catch (error) {
          console.error(`Error procesando relación pieza=${relacion.refLocal}, vehículo=${relacion.idVehiculoOriginal}:`, error);
        }
      }
    } catch (error) {
      console.error('Error global procesando relaciones pieza-vehículo:', error);
    }
  }
  
  /**
   * Procesa relaciones pendientes
   */
  private async procesarRelacionesPendientes(): Promise<void> {
    try {
      console.log('Procesando relaciones pendientes...');
      
      // Buscar relaciones pendientes
      const relacionesPendientes = await db
        .select({
          id: vehicleParts.id,
          partId: vehicleParts.partId,
          idVehiculoOriginal: vehicleParts.idVehiculoOriginal
        })
        .from(vehicleParts)
        .where(isNull(vehicleParts.vehicleId));
      
      if (relacionesPendientes.length === 0) {
        console.log('No hay relaciones pendientes');
        return;
      }
      
      console.log(`Encontradas ${relacionesPendientes.length} relaciones pendientes`);
      
      // Obtener IDs originales de vehículos
      const idsVehiculosOriginales = Array.from(
        new Set(relacionesPendientes.map(r => r.idVehiculoOriginal))
      );
      
      // Buscar vehículos
      const vehiculosEncontrados = await db
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idsVehiculosOriginales));
      
      // Crear mapa para búsqueda rápida
      const mapaVehiculos = new Map(
        vehiculosEncontrados.map(v => [v.idLocal, v.id])
      );
      
      // Actualizar relaciones
      let actualizadas = 0;
      
      for (const relacion of relacionesPendientes) {
        const vehicleId = mapaVehiculos.get(relacion.idVehiculoOriginal);
        
        if (vehicleId) {
          try {
            // Actualizar relación
            await db
              .update(vehicleParts)
              .set({ vehicleId })
              .where(eq(vehicleParts.id, relacion.id));
            
            // Activar la pieza
            await db
              .update(parts)
              .set({ activo: true })
              .where(eq(parts.id, relacion.partId));
            
            actualizadas++;
          } catch (error) {
            console.error(`Error actualizando relación pendiente ${relacion.id}:`, error);
          }
        }
      }
      
      console.log(`Procesamiento de relaciones pendientes completado: ${actualizadas} actualizadas`);
    } catch (error) {
      console.error('Error global procesando relaciones pendientes:', error);
    }
  }
}

// Instancia única
export const importador = new ImportadorService();