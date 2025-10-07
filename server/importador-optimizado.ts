import { db } from "./db";
import { parts, vehicles } from "../shared/schema";
import { eq, like, inArray } from "drizzle-orm";

interface ImportResult {
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * Procesa un lote de vehículos con manejo robusto de errores y validación de campos
 */
export async function procesarLoteVehiculos(vehiculosRaw: any[]): Promise<ImportResult> {
  console.log(`Iniciando procesamiento de ${vehiculosRaw.length} vehículos`);
  
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  
  // Si no hay vehículos para procesar, salir temprano
  if (vehiculosRaw.length === 0) {
    return { inserted, updated, errors };
  }
  
  try {
    // 1. Preprocesar y normalizar los vehículos
    const vehiculosProcesados = vehiculosRaw.map(preprocesarVehiculo);
    
    // 2. Agrupar en lotes para evitar problemas con transacciones grandes
    const tamanoLote = 50;
    const lotes = [];
    
    for (let i = 0; i < vehiculosProcesados.length; i += tamanoLote) {
      lotes.push(vehiculosProcesados.slice(i, i + tamanoLote));
    }
    
    console.log(`Vehículos divididos en ${lotes.length} lotes de máximo ${tamanoLote} elementos`);
    
    // 3. Procesar cada lote individualmente
    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i];
      console.log(`Procesando lote ${i + 1}/${lotes.length} con ${lote.length} vehículos`);
      
      try {
        const resultado = await procesarLoteIndividual(lote);
        inserted += resultado.inserted;
        updated += resultado.updated;
        errors.push(...resultado.errors);
      } catch (error) {
        console.error(`Error en lote ${i + 1}:`, error);
        errors.push(`Error en lote ${i + 1}: ${error.message}`);
      }
    }
    
    console.log(`Procesamiento completo: ${inserted} insertados, ${updated} actualizados, ${errors.length} errores`);
    return { inserted, updated, errors };
  } catch (error) {
    console.error("Error global en procesamiento de vehículos:", error);
    errors.push(`Error global: ${error.message}`);
    return { inserted, updated, errors };
  }
}

/**
 * Preprocesa un vehículo para asegurar que cumple con los requisitos de la base de datos
 */
function preprocesarVehiculo(rawVehicle: any): any {
  // Extraer campos principales con valores por defecto seguros
  const idLocal = rawVehicle.idLocal || rawVehicle.IdLocal || 0;
  const idEmpresa = rawVehicle.idEmpresa || rawVehicle.IdEmpresa || 1236;
  const marca = rawVehicle.marca || rawVehicle.Marca || "Desconocida";
  const modelo = rawVehicle.modelo || rawVehicle.Modelo || "Desconocido";
  const version = rawVehicle.version || rawVehicle.Version || "Desconocida";
  const anyo = rawVehicle.anyo || rawVehicle.AnyoVehiculo || 0;
  const bastidor = rawVehicle.bastidor || rawVehicle.Bastidor || "";
  const matricula = rawVehicle.matricula || rawVehicle.Matricula || "";
  const color = rawVehicle.color || rawVehicle.Color || "";
  const combustible = rawVehicle.combustible || rawVehicle.Combustible || "";
  const kilometraje = rawVehicle.kilometraje || rawVehicle.Kilometraje || 0;
  const potencia = rawVehicle.potencia || rawVehicle.Potencia || 0;
  
  // Crear descripción garantizando valor no nulo
  const descripcion = `${marca} ${modelo} ${version}${anyo ? ` (${anyo})` : ''}`.trim() || `Vehículo ID ${idLocal}`;
  
  // Normalizar imágenes (campo crítico)
  let imagenes = [];
  
  if (Array.isArray(rawVehicle.imagenes) && rawVehicle.imagenes.length > 0) {
    imagenes = rawVehicle.imagenes;
  } else if (Array.isArray(rawVehicle.UrlsImgs) && rawVehicle.UrlsImgs.length > 0) {
    imagenes = rawVehicle.UrlsImgs;
  } else if (typeof rawVehicle.imagenes === 'string' && rawVehicle.imagenes) {
    imagenes = [rawVehicle.imagenes];
  } else if (typeof rawVehicle.UrlsImgs === 'string' && rawVehicle.UrlsImgs) {
    imagenes = [rawVehicle.UrlsImgs];
  }
  
  // Si no hay imágenes, usar una por defecto
  if (imagenes.length === 0) {
    imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
  }
  
  // Crear un objeto limpio con todos los campos necesarios
  return {
    idLocal,
    idEmpresa,
    marca,
    modelo,
    version,
    anyo,
    bastidor,
    matricula,
    color,
    combustible,
    kilometraje,
    potencia,
    descripcion,
    imagenes,
    activo: true,
    sincronizado: true,
    ultimaSincronizacion: new Date(),
    fechaCreacion: new Date(),
    
  };
}

/**
 * Procesa un lote individual de vehículos
 */
async function procesarLoteIndividual(vehiculos: any[]): Promise<ImportResult> {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  
  try {
    await db.transaction(async (tx) => {
      // 1. Obtener IDs de vehículos existentes
      const idsLocales = vehiculos.map(v => v.idLocal);
      const vehiculosExistentes = await tx
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idsLocales));
      
      // 2. Crear mapa para búsqueda rápida
      const mapaExistentes = new Map(
        vehiculosExistentes.map(v => [v.idLocal, v.id])
      );
      
      // 3. Separar vehículos para inserción y actualización
      const vehiculosNuevos = [];
      const vehiculosActualizar = [];
      
      for (const vehiculo of vehiculos) {
        // Verificación final de seguridad para campos críticos
        if (!vehiculo.imagenes || !Array.isArray(vehiculo.imagenes) || vehiculo.imagenes.length === 0) {
          vehiculo.imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
        }
        
        if (!vehiculo.descripcion || vehiculo.descripcion.trim() === '') {
          vehiculo.descripcion = `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.version}`.trim() || 'Vehículo sin descripción';
        }
        
        if (mapaExistentes.has(vehiculo.idLocal)) {
          vehiculosActualizar.push({
            ...vehiculo,
            id: mapaExistentes.get(vehiculo.idLocal)
          });
        } else {
          vehiculosNuevos.push(vehiculo);
        }
      }
      
      // 4. Insertar vehículos nuevos
      if (vehiculosNuevos.length > 0) {
        const resultado = await tx
          .insert(vehicles)
          .values(vehiculosNuevos)
          .returning({ id: vehicles.id, idLocal: vehicles.idLocal });
        
        inserted = resultado.length;
        
        // Actualizar mapa con nuevos IDs
        for (const v of resultado) {
          mapaExistentes.set(v.idLocal, v.id);
        }
      }
      
      // 5. Actualizar vehículos existentes
      for (const vehiculo of vehiculosActualizar) {
        await tx
          .update(vehicles)
          .set({
            marca: vehiculo.marca,
            modelo: vehiculo.modelo,
            version: vehiculo.version,
            anyo: vehiculo.anyo,
            bastidor: vehiculo.bastidor,
            matricula: vehiculo.matricula,
            color: vehiculo.color,
            combustible: vehiculo.combustible,
            kilometraje: vehiculo.kilometraje,
            potencia: vehiculo.potencia,
            descripcion: vehiculo.descripcion,
            imagenes: vehiculo.imagenes,
            activo: true,
            sincronizado: true,
            ultimaSincronizacion: new Date(),
            
          })
          .where(eq(vehicles.id, vehiculo.id));
        
        updated++;
      }
    });
    
    return { inserted, updated, errors };
  } catch (error) {
    console.error("Error en procesamiento de lote:", error);
    errors.push(`Error: ${error.message}`);
    return { inserted, updated, errors };
  }
}

/**
 * Procesa un lote de piezas con manejo robusto de errores y validación de campos
 */
export async function procesarLotePiezas(piezasRaw: any[]): Promise<ImportResult> {
  console.log(`Iniciando procesamiento de ${piezasRaw.length} piezas`);
  
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  
  // Si no hay piezas para procesar, salir temprano
  if (piezasRaw.length === 0) {
    return { inserted, updated, errors };
  }
  
  try {
    // 1. Preprocesar y normalizar las piezas
    const piezasProcesadas = piezasRaw.map(preprocesarPieza);
    
    // 2. Agrupar en lotes para evitar problemas con transacciones grandes
    const tamanoLote = 100; // Aumentado de 50 a 100 para mejorar rendimiento
    const lotes = [];
    
    for (let i = 0; i < piezasProcesadas.length; i += tamanoLote) {
      lotes.push(piezasProcesadas.slice(i, i + tamanoLote));
    }
    
    console.log(`Piezas divididas en ${lotes.length} lotes de máximo ${tamanoLote} elementos`);
    
    // 3. Procesar cada lote individualmente
    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i];
      console.log(`Procesando lote ${i + 1}/${lotes.length} con ${lote.length} piezas`);
      
      try {
        const resultado = await procesarLotePiezasIndividual(lote);
        inserted += resultado.inserted;
        updated += resultado.updated;
        errors.push(...resultado.errors);
      } catch (error) {
        console.error(`Error en lote de piezas ${i + 1}:`, error);
        errors.push(`Error en lote de piezas ${i + 1}: ${error.message}`);
      }
    }
    
    console.log(`Procesamiento de piezas completo: ${inserted} insertadas, ${updated} actualizadas, ${errors.length} errores`);
    return { inserted, updated, errors };
  } catch (error) {
    console.error("Error global en procesamiento de piezas:", error);
    errors.push(`Error global: ${error.message}`);
    return { inserted, updated, errors };
  }
}

/**
 * Preprocesa una pieza para asegurar que cumple con los requisitos de la base de datos
 */
function preprocesarPieza(rawPart: any): any {
  // Extraer campos principales con valores por defecto seguros
  const refLocal = rawPart.refLocal || 0;
  const idEmpresa = rawPart.idEmpresa || 1236;
  const idVehiculoOriginal = rawPart.idVehiculo || 0;
  const codFamilia = rawPart.codFamilia || "";
  const descripcionFamilia = rawPart.descripcionFamilia || "";
  const codArticulo = rawPart.codArticulo || "";
  const descripcionArticulo = rawPart.descripcionArticulo || "Pieza sin descripción";
  const codVersion = rawPart.codVersion || "";
  const refPrincipal = rawPart.refPrincipal || "";
  const precio = rawPart.precio ? String(rawPart.precio) : "0";
  const anyoStock = rawPart.anyoStock || 0;
  const peso = rawPart.peso ? String(rawPart.peso) : "0";
  const ubicacion = rawPart.ubicacion || 0;
  const observaciones = rawPart.observaciones || "";
  const reserva = rawPart.reserva || 0;
  const tipoMaterial = rawPart.tipoMaterial || 0;
  
  // Extraer información para matching
  const rvCode = codVersion || "";
  const anyoInicio = 0; // Por defecto
  const anyoFin = 0; // Por defecto
  const puertas = 0; // Por defecto
  
  // Normalizar imágenes (campo crítico)
  let imagenes = [];
  
  if (Array.isArray(rawPart.urlsImgs) && rawPart.urlsImgs.length > 0) {
    imagenes = rawPart.urlsImgs;
  } else if (Array.isArray(rawPart.UrlsImgs) && rawPart.UrlsImgs.length > 0) {
    imagenes = rawPart.UrlsImgs;
  } else if (Array.isArray(rawPart.imagenes) && rawPart.imagenes.length > 0) {
    imagenes = rawPart.imagenes;
  } else if (typeof rawPart.urlsImgs === 'string' && rawPart.urlsImgs) {
    imagenes = [rawPart.urlsImgs];
  } else if (typeof rawPart.UrlsImgs === 'string' && rawPart.UrlsImgs) {
    imagenes = [rawPart.UrlsImgs];
  } else if (typeof rawPart.imagenes === 'string' && rawPart.imagenes) {
    imagenes = [rawPart.imagenes];
  }
  
  // Si no hay imágenes, usar una por defecto
  if (imagenes.length === 0) {
    imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
  }
  
  // Crear un objeto limpio con todos los campos necesarios
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
    activo: false, // Se activará cuando tenga relaciones con vehículos
    sincronizado: true,
    ultimaSincronizacion: new Date(),
    fechaCreacion: new Date(),
    
    // Campo extra para relaciones con vehículos
    idVehiculoOriginal
  };
}

/**
 * Procesa un lote individual de piezas
 */
async function procesarLotePiezasIndividual(piezas: any[]): Promise<ImportResult> {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  
  try {
    await db.transaction(async (tx) => {
      // 1. Obtener IDs de piezas existentes
      const refsLocales = piezas.map(p => p.refLocal);
      const piezasExistentes = await tx
        .select({ id: parts.id, refLocal: parts.refLocal, precio: parts.precio, activo: parts.activo })
        .from(parts)
        .where(inArray(parts.refLocal, refsLocales));
      
      // 2. Crear mapa para búsqueda rápida
      const mapaExistentes = new Map();
      for (const p of piezasExistentes) {
        mapaExistentes.set(p.refLocal, { 
          id: p.id, 
          precio: p.precio,
          activo: p.activo 
        });
      }
      
      // 3. Separar piezas para inserción y actualización
      const piezasNuevas = [];
      const piezasActualizar = [];
      const relacionesPendientes = [];
      
      for (const pieza of piezas) {
        // Verificación final de seguridad para campos críticos
        if (!pieza.imagenes || !Array.isArray(pieza.imagenes) || pieza.imagenes.length === 0) {
          pieza.imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
        }
        
        const idVehiculoOriginal = pieza.idVehiculoOriginal;
        delete pieza.idVehiculoOriginal; // No lo guardamos en la tabla de piezas
        
        // Verificar precio para determinar si debe estar activa
        const precioNum = parseFloat(pieza.precio);
        const tieneValor = !isNaN(precioNum) && precioNum > 0;

        // Determinar si está activa (piezas con precio 0 se mantienen inactivas)
        pieza.activo = tieneValor;
        
        if (mapaExistentes.has(pieza.refLocal)) {
          const existing = mapaExistentes.get(pieza.refLocal);
          piezasActualizar.push({
            ...pieza,
            id: existing.id
          });
        } else {
          piezasNuevas.push(pieza);
        }
        
        // Registrar relación con vehículo si existe
        if (idVehiculoOriginal) {
          relacionesPendientes.push({
            refLocal: pieza.refLocal,
            idVehiculoOriginal
          });
        }
      }
      
      // 4. Insertar piezas nuevas en un solo lote para mayor eficiencia
      if (piezasNuevas.length > 0) {
        const resultado = await tx
          .insert(parts)
          .values(piezasNuevas)
          .returning({ id: parts.id, refLocal: parts.refLocal });
        
        inserted = resultado.length;
        
        // Actualizar mapa con nuevos IDs
        for (const p of resultado) {
          mapaExistentes.set(p.refLocal, { id: p.id });
        }
      }
      
      // 5. Actualizar piezas existentes usando lotes más grandes para mejorar rendimiento
      if (piezasActualizar.length > 0) {
        // Procesamos en lotes de 20 para evitar sobrecarga pero mejorar rendimiento
        const updateBatchSize = 20; 
        
        for (let i = 0; i < piezasActualizar.length; i += updateBatchSize) {
          const updateBatch = piezasActualizar.slice(i, i + updateBatchSize);
          
          // Procesar en paralelo para mayor velocidad
          await Promise.all(updateBatch.map(async (pieza) => {
            await tx
              .update(parts)
              .set({
                codFamilia: pieza.codFamilia,
                descripcionFamilia: pieza.descripcionFamilia,
                codArticulo: pieza.codArticulo,
                descripcionArticulo: pieza.descripcionArticulo,
                codVersion: pieza.codVersion,
                refPrincipal: pieza.refPrincipal,
                anyoInicio: pieza.anyoInicio,
                anyoFin: pieza.anyoFin,
                puertas: pieza.puertas,
                rvCode: pieza.rvCode,
                precio: pieza.precio,
                anyoStock: pieza.anyoStock,
                peso: pieza.peso,
                ubicacion: pieza.ubicacion,
                observaciones: pieza.observaciones,
                reserva: pieza.reserva,
                tipoMaterial: pieza.tipoMaterial,
                imagenes: pieza.imagenes,
                // Las piezas con precio 0 se mantienen inactivas
                activo: pieza.activo,
                sincronizado: true,
                ultimaSincronizacion: new Date(),
                
              })
              .where(eq(parts.id, pieza.id));
          }));
          
          updated += updateBatch.length;
        }
      }
      
      // 6. Procesar relaciones pendientes con vehículos
      if (relacionesPendientes.length > 0) {
        await procesarRelacionesPiezaVehiculo(tx, relacionesPendientes, new Map(
          Array.from(mapaExistentes.entries()).map(([refLocal, data]) => [refLocal, data.id])
        ));
      }
    });
    
    return { inserted, updated, errors };
  } catch (error) {
    console.error("Error en procesamiento de lote de piezas:", error);
    errors.push(`Error: ${error.message}`);
    return { inserted, updated, errors };
  }
}

/**
 * Procesa las relaciones entre piezas y vehículos
 */
async function procesarRelacionesPiezaVehiculo(tx: any, relaciones: any[], mapaPiezas: Map<number, number>) {
  // 1. Buscar vehículos por sus IDs originales
  const idsVehiculosOriginales = [...new Set(relaciones.map(r => r.idVehiculoOriginal))];
  
  const vehiculosEncontrados = await tx
    .select({ id: vehicles.id, idLocal: vehicles.idLocal })
    .from(vehicles)
    .where(inArray(vehicles.idLocal, idsVehiculosOriginales));
  
  // 2. Crear mapa para búsqueda rápida
  const mapaVehiculos = new Map(
    vehiculosEncontrados.map(v => [v.idLocal, v.id])
  );
  
  // 3. Crear relaciones cuando existan ambas partes
  for (const relacion of relaciones) {
    const partId = mapaPiezas.get(relacion.refLocal);
    const vehicleId = mapaVehiculos.get(relacion.idVehiculoOriginal);
    
    if (partId && vehicleId) {
      // Verificar si ya existe la relación
      const relacionExistente = await tx
        .select({ id: vehicleParts.id })
        .from(vehicleParts)
        .where(eq(vehicleParts.partId, partId))
        .where(eq(vehicleParts.vehicleId, vehicleId));
      
      if (relacionExistente.length === 0) {
        // Crear nueva relación
        await tx.insert(vehicleParts).values({
          partId,
          vehicleId,
          idVehiculoOriginal: relacion.idVehiculoOriginal,
          fechaCreacion: new Date()
        });
        
        // Activar la pieza
        await tx
          .update(parts)
          .set({ activo: true })
          .where(eq(parts.id, partId));
      }
    } else if (partId) {
      // Crear relación pendiente si existe la pieza pero no el vehículo
      await tx.insert(vehicleParts).values({
        partId,
        vehicleId: null, // Pendiente
        idVehiculoOriginal: relacion.idVehiculoOriginal,
        fechaCreacion: new Date()
      });
    }
  }
}

/**
 * Procesa relaciones pendientes para vehículos recién insertados
 */
export async function procesarRelacionesPendientes(): Promise<{ actualizadas: number }> {
  let actualizadas = 0;
  
  try {
    await db.transaction(async (tx) => {
      // 1. Buscar relaciones pendientes (vehicleId es NULL)
      const relacionesPendientes = await tx
        .select({
          id: vehicleParts.id,
          partId: vehicleParts.partId,
          idVehiculoOriginal: vehicleParts.idVehiculoOriginal
        })
        .from(vehicleParts)
        .where(eq(vehicleParts.vehicleId, null));
      
      if (relacionesPendientes.length === 0) {
        return;
      }
      
      console.log(`Encontradas ${relacionesPendientes.length} relaciones pendientes`);
      
      // 2. Obtener los IDs originales de vehículos para buscarlos
      const idsVehiculosOriginales = [...new Set(relacionesPendientes.map(r => r.idVehiculoOriginal))];
      
      // 3. Buscar vehículos que ahora existan
      const vehiculosEncontrados = await tx
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idsVehiculosOriginales));
      
      console.log(`Encontrados ${vehiculosEncontrados.length} vehículos para relaciones pendientes`);
      
      // 4. Crear mapa para búsqueda rápida
      const mapaVehiculos = new Map(
        vehiculosEncontrados.map(v => [v.idLocal, v.id])
      );
      
      // 5. Actualizar relaciones pendientes
      for (const relacion of relacionesPendientes) {
        const vehicleId = mapaVehiculos.get(relacion.idVehiculoOriginal);
        
        if (vehicleId) {
          await tx
            .update(vehicleParts)
            .set({ vehicleId })
            .where(eq(vehicleParts.id, relacion.id));
          
          // Activar la pieza
          await tx
            .update(parts)
            .set({ activo: true })
            .where(eq(parts.id, relacion.partId));
          
          actualizadas++;
        }
      }
    });
    
    console.log(`Procesamiento de relaciones pendientes completado: ${actualizadas} actualizadas`);
    return { actualizadas };
  } catch (error) {
    console.error("Error procesando relaciones pendientes:", error);
    return { actualizadas };
  }
}