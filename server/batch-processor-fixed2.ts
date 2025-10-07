import { db } from "./db";
import { parts, vehicles } from "../shared/schema";
import { eq, like, inArray } from "drizzle-orm";

/**
 * Procesa un lote de vehículos con manejo adecuado de errores
 */
export async function processVehiclesBatch(vehiclesToProcess: any[]) {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  
  // Array para almacenar vehículos procesados y listos para insertar
  const processedVehicles: any[] = [];

  try {
    console.log("Iniciando procesamiento de lote de vehículos. Total:", vehiclesToProcess.length);
    
    if (vehiclesToProcess.length === 0) {
      return { inserted, updated, errors };
    }

    // Analizar primer vehículo para determinar formato (depuración)
    const firstVehicle = vehiclesToProcess[0];
    console.log(`Formato de vehículo recibido. Propiedades de ejemplo: ${Object.keys(firstVehicle).slice(0, 10).join(", ")}`);
    console.log(`Valores de ejemplo: idLocal=${firstVehicle.idLocal || firstVehicle.IdLocal}, marca=${firstVehicle.marca || firstVehicle.Marca}`);

    // Preprocesar los vehículos y convertirlos a formato estándar
    for (let i = 0; i < vehiclesToProcess.length; i++) {
      const rawVehicle = vehiclesToProcess[i];
      
      // Extraer y normalizar campos según el formato (nuevo o antiguo)
      const idLocal = rawVehicle.idLocal || rawVehicle.IdLocal || 0;
      const idEmpresa = rawVehicle.idEmpresa || 1236; // Valor por defecto
      const marca = rawVehicle.marca || rawVehicle.Marca || "Desconocida";
      const modelo = rawVehicle.modelo || rawVehicle.Modelo || "Desconocido";
      const version = rawVehicle.version || rawVehicle.Version || "Desconocida";
      const bastidor = rawVehicle.bastidor || rawVehicle.Bastidor || "";
      const matricula = rawVehicle.matricula || rawVehicle.Matricula || "";
      const color = rawVehicle.color || rawVehicle.Color || "";
      const kilometraje = rawVehicle.kilometraje || rawVehicle.Kilometraje || 0;
      const combustible = rawVehicle.combustible || rawVehicle.Combustible || "";
      const potencia = rawVehicle.potencia || rawVehicle.Potencia || 0;
      const anyo = rawVehicle.anyo || rawVehicle.AnyoVehiculo || 0;
      
      // Garantizar que imagenes sea siempre un array (nunca null)
      let imagenes = [];
      if (Array.isArray(rawVehicle.imagenes)) {
        imagenes = rawVehicle.imagenes;
      } else if (Array.isArray(rawVehicle.UrlsImgs)) {
        imagenes = rawVehicle.UrlsImgs;
      } else if (typeof rawVehicle.UrlsImgs === 'string') {
        // Si es una cadena, la convertimos en un array con un elemento
        imagenes = rawVehicle.UrlsImgs ? [rawVehicle.UrlsImgs] : [];
      } else if (typeof rawVehicle.imagenes === 'string') {
        // Si es una cadena, la convertimos en un array con un elemento
        imagenes = rawVehicle.imagenes ? [rawVehicle.imagenes] : [];
      }
      
      // Si después de todo sigue vacío, añadir una imagen predeterminada
      if (!imagenes || imagenes.length === 0) {
        imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
      }
      
      // Crear descripción asegurando que nunca sea null
      const descripcion = `${marca} ${modelo} ${version}${anyo ? ` (${anyo})` : ''}`.trim();
      
      // Crear vehículo estandarizado
      const standardVehicle = {
        idLocal,
        idEmpresa,
        marca,
        modelo,
        version,
        bastidor,
        matricula,
        color,
        kilometraje,
        combustible,
        potencia,
        anyo,
        imagenes,
        descripcion: descripcion || `Vehículo ID ${idLocal || 0}`, // Valor predeterminado si todo lo demás falla
        activo: true,
        sincronizado: true,
        ultimaSincronizacion: new Date(),
        fechaCreacion: new Date(),
        
      };
      
      // Verificación final para asegurar campos críticos
      if (!standardVehicle.imagenes || !Array.isArray(standardVehicle.imagenes)) {
        standardVehicle.imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
        console.log(`Corregida imagen para vehículo ${idLocal}`);
      }
      
      // Añadir a lista de vehículos procesados
      processedVehicles.push(standardVehicle);
      
      // Depuración para primeros 5 vehículos
      if (i < 5) {
        console.log(`Vehículo #${i+1} procesado: idLocal=${standardVehicle.idLocal}, descripcion=${standardVehicle.descripcion}`);
      }
    }
    
    console.log(`Total de vehículos preprocesados: ${processedVehicles.length}`);
    
    // Reemplazar el array original con los vehículos procesados
    vehiclesToProcess = processedVehicles;

    // Usar transacción para garantizar atomicidad
    await db.transaction(async (tx) => {
      // Obtener IDs locales de los vehículos a procesar
      const idLocales = vehiclesToProcess.map((v) => v.idLocal);
      
      // Buscar vehículos existentes con esos IDs locales
      const existingVehicles = await tx
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idLocales));
      
      // Crear mapa para acceso rápido
      const existingVehicleMap = new Map(
        existingVehicles.map((v) => [v.idLocal, v.id])
      );

      // Separar vehículos nuevos y existentes
      const newVehicles = vehiclesToProcess.filter(
        (v) => !existingVehicleMap.has(v.idLocal)
      );
      
      // Insertar nuevos vehículos
      if (newVehicles.length > 0) {
        const insertResult = await tx
          .insert(vehicles)
          .values(newVehicles)
          .returning({ id: vehicles.id, idLocal: vehicles.idLocal });
        
        // Actualizar contadores
        inserted = insertResult.length;
        
        // Actualizar mapa con vehículos recién insertados
        for (const vehicle of insertResult) {
          existingVehicleMap.set(vehicle.idLocal, vehicle.id);
        }
      }

      // Actualizar vehículos existentes
      for (const vehicle of vehiclesToProcess) {
        const existingId = existingVehicleMap.get(vehicle.idLocal);
        
        if (existingId) {
          await tx
            .update(vehicles)
            .set({
              ...vehicle,
              
            })
            .where(eq(vehicles.id, existingId));
          
          updated++;
        }
      }
    });

    return { inserted, updated, errors };
  } catch (error) {
    console.error("Error en processVehiclesBatch:", error);
    errors.push(`Error global: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return { inserted, updated, errors };
  }
}

/**
 * Procesa un lote de piezas con manejo correcto de lotes e imágenes
 */
export async function processPartsBatch(partsToProcess: any[], isNewFormat: boolean, fromDate?: Date) {
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];
  const vehiclePairsToProcess: { partRefLocal: number, idVehiculoOriginal: number, codVersion?: string }[] = [];

  try {
    if (partsToProcess.length === 0) {
      return { inserted, updated, errors };
    }

    console.log(`Formato de respuesta: ${isNewFormat ? 'nuevo' : 'viejo'}`);

    // Procesar datos de cada pieza para estandarizarlos
    for (let i = 0; i < partsToProcess.length; i++) {
      try {
        const part = partsToProcess[i];
        let refLocal: number;
        let idEmpresa: number;
        let idVehiculoOriginal: number;
        let codVersion: string;
        let urlsImgs: string[];
        let precio: number | string;

        if (isNewFormat) {
          // Nuevos campos según se informa en Trello
          const newFormat = part as any;
          refLocal = newFormat.refLocal || newFormat.idPieza || 0;
          idEmpresa = newFormat.idEmpresa || 0;
          // Convertir precio: dividir por 10 para ajustar el valor (500 → 50)
          let precioOriginal = typeof newFormat.precio === 'string' 
              ? parseFloat(newFormat.precio) 
              : (newFormat.precio || 0);
          
          // Si el precio es -1, mantenerlo como está (indica precio especial)
          precio = precioOriginal === -1 ? -1 : precioOriginal / 10;
          idVehiculoOriginal = newFormat.idVehiculo;
          codVersion = newFormat.codVersion || '';
          urlsImgs = newFormat.urlsImgs || [];
          
          partsToProcess[i] = {
            refLocal,
            idEmpresa,
            idVehiculoOriginal,
            codFamilia: newFormat.codFamilia || '',
            descripcionFamilia: newFormat.descripcionFamilia || '',
            codArticulo: newFormat.codArticulo || '',
            descripcionArticulo: newFormat.descripcionArticulo || '',
            codVersion,
            refPrincipal: newFormat.refPrincipal || '',
            refSecundaria: newFormat.refSecundaria || '',
            equivalencias: newFormat.equivalencias || [],
            medidas: newFormat.medidas || {},
            descripcionMedidas: newFormat.descripcionMedidas || '',
            tipoMaterial: newFormat.tipoMaterial || 0,
            precio,
            informacionAdicional: newFormat.informacionAdicional || '',
            ubicacion: newFormat.ubicacion || '',
            observaciones: newFormat.observaciones || '',
            caracteristicas: newFormat.caracteristicas || [],
            imagenes: urlsImgs,
            puertas: 0, // Valor por defecto
            anyoInicio: 0, // Valor por defecto
            anyoFin: 0, // Valor por defecto
            rvCode: '', // Valor por defecto
            activo: true,
            sincronizado: true,
            ultimaSincronizacion: new Date(),
            fechaCreacion: new Date(),
            
          };
          
          // Añadir relación si hay ID de vehículo
          if (idVehiculoOriginal > 0) {
            vehiclePairsToProcess.push({
              partRefLocal: refLocal,
              idVehiculoOriginal
            });
          }
        }
      } catch (partError) {
        console.error('Error preparando pieza:', partError);
        errors.push(`Error preparando pieza: ${partError instanceof Error ? partError.message : 'Error desconocido'}`);
      }
    }

    // Ejecutar inserción y actualización masiva si hay piezas para procesar
    if (partsToProcess.length > 0) {
      console.log(`Procesando por lotes ${partsToProcess.length} piezas...`);
      
      try {
        // PASO 1: Obtener refLocal para verificar cuáles ya existen - fuera de transacción
        const refLocalesParaProcesar = partsToProcess.map(p => p.refLocal);
          
        // Consultar piezas existentes con esos refLocal - usar procesamiento por lotes
        let existingParts = [];
          
        if (refLocalesParaProcesar.length > 0) {
          // Dividir en grupos más pequeños para evitar límites de SQL
          const chunkSize = 100; // Tamaño seguro para cláusulas IN
          const refLocalesChunks = [];
            
          for (let i = 0; i < refLocalesParaProcesar.length; i += chunkSize) {
            refLocalesChunks.push(refLocalesParaProcesar.slice(i, i + chunkSize));
          }
            
          // Procesar cada grupo FUERA de la transacción
          const allExistingParts = [];
          for (const chunk of refLocalesChunks) {
            const result = await db.select({ refLocal: parts.refLocal, id: parts.id })
              .from(parts)
              .where(inArray(parts.refLocal, chunk));
              
            allExistingParts.push(...result);
          }
          existingParts = allExistingParts;
        }
          
        const existingRefLocales = new Map(existingParts.map(p => [p.refLocal, p.id]));
          
        // PASO 2: Filtrar solo piezas nuevas e insertarlas en una transacción aparte
        const newParts = partsToProcess.filter(p => !existingRefLocales.has(p.refLocal));
        console.log(`Preparando para insertar ${newParts.length} piezas nuevas...`);
          
        if (newParts.length > 0) {
          // Transacción solo para la inserción
          await db.transaction(async (tx) => {
            try {
              // Insertar nuevas piezas
              const result = await tx.insert(parts).values(newParts).returning({ id: parts.id, refLocal: parts.refLocal });
              inserted = result.length;
              
              // Verificar si se insertaron correctamente
              if (result.length === 0) {
                console.error('No se insertaron piezas aunque el comando no falló.');
              } else {
                // Actualizar el mapa con las piezas recién insertadas
                for (const part of result) {
                  existingRefLocales.set(part.refLocal, part.id);
                }
                
                console.log(`Insertadas ${result.length} piezas nuevas. IDs: ${result.map(p => p.id).slice(0, 5).join(', ')}...`);
              }
            } catch (insertError) {
              console.error('Error al insertar piezas:', insertError);
              errors.push(`Error al insertar piezas: ${insertError instanceof Error ? insertError.message : 'Error desconocido'}`);
              throw insertError;
            }
          });
        }

        // PASO 3: Actualizar piezas existentes en una transacción separada
        const existingPartsToUpdate = [];
        for (const existingPart of existingParts) {
          const partToUpdate = partsToProcess.find(p => p.refLocal === existingPart.refLocal);
          if (partToUpdate) {
            existingPartsToUpdate.push({
              id: existingPart.id,
              data: {
                ...partToUpdate,
                
              }
            });
          }
        }

        if (existingPartsToUpdate.length > 0) {
          await db.transaction(async (tx) => {
            for (const { id, data } of existingPartsToUpdate) {
              try {
                await tx.update(parts)
                  .set(data)
                  .where(eq(parts.id, id));
                updated++;
              } catch (updateError) {
                console.error(`Error al actualizar pieza ${id}:`, updateError);
                errors.push(`Error al actualizar pieza: ${updateError instanceof Error ? updateError.message : 'Error desconocido'}`);
                throw updateError;
              }
            }
          });
        }
        
        // PASO 4: Procesar relaciones con vehículos en transacciones más pequeñas
        console.log(`Procesando ${vehiclePairsToProcess.length} relaciones vehículo-pieza...`);
        let relationCount = 0;
        
        // Procesar relaciones en lotes de 100 para evitar transacciones demasiado grandes
        const relationChunkSize = 100;
        for (let i = 0; i < vehiclePairsToProcess.length; i += relationChunkSize) {
          const relationChunk = vehiclePairsToProcess.slice(i, i + relationChunkSize);
          
          await db.transaction(async (tx) => {
            for (const relation of relationChunk) {
              try {
                // Obtener el ID de la pieza a partir de refLocal
                const partId = existingRefLocales.get(relation.partRefLocal);
                if (!partId) {
                  console.warn(`No se encontró ID para la pieza con refLocal=${relation.partRefLocal}`);
                  continue;
                }
                
                // Buscar vehículo por ID original
                if (relation.idVehiculoOriginal > 0) {
                  // Para IDs positivos, buscar coincidencia directa
                  const matchedVehicles = await tx.select()
                    .from(vehicles)
                    .where(eq(vehicles.idLocal, relation.idVehiculoOriginal))
                    .limit(1);
                  
                  if (matchedVehicles.length > 0) {
                    // Actualizar la pieza con la referencia al vehículo
                    await tx.update(parts)
                      .set({ 
                        idVehiculo: matchedVehicles[0].idLocal,
                        activo: true 
                      })
                      .where(eq(parts.id, partId));
                    relationCount++;
                  }
                } else if (relation.idVehiculoOriginal < 0) {
                  // Para IDs negativos, intentar hacer matching por código de versión
                  if (relation.codVersion) {
                    const matchedVehicles = await tx.select()
                      .from(vehicles)
                      .where(like(vehicles.version, `%${relation.codVersion}%`))
                      .limit(1);
                      
                    if (matchedVehicles.length > 0) {
                      // Actualizar la pieza con la referencia al vehículo
                      await tx.update(parts)
                        .set({ 
                          idVehiculo: matchedVehicles[0].idLocal,
                          activo: true 
                        })
                        .where(eq(parts.id, partId));
                      relationCount++;
                    } else {
                      // Marcar la pieza como pendiente de relación
                      await tx.update(parts)
                        .set({ 
                          idVehiculo: relation.idVehiculoOriginal, 
                          isPendingRelation: true,
                          activo: false
                        })
                        .where(eq(parts.id, partId));
                      relationCount++;
                    }
                  } else {
                    // Marcar la pieza como pendiente de relación si no hay codVersion
                    await tx.update(parts)
                      .set({ 
                        idVehiculo: relation.idVehiculoOriginal, 
                        isPendingRelation: true,
                        activo: false
                      })
                      .where(eq(parts.id, partId));
                    relationCount++;
                  }
                } else {
                  // Marcar la pieza como pendiente de relación para vehículos normales no encontrados
                  await tx.update(parts)
                    .set({ 
                      idVehiculo: relation.idVehiculoOriginal, 
                      isPendingRelation: true,
                      activo: false
                    })
                    .where(eq(parts.id, partId));
                  relationCount++;
                }
              } catch (relationError) {
                console.error(`Error al procesar relación vehículo-pieza:`, relationError);
                errors.push(`Error al procesar relación: ${relationError instanceof Error ? relationError.message : 'Error desconocido'}`);
                // No lanzamos el error para permitir que otras relaciones se procesen
              }
            }
          });
          
          // Registrar progreso por lotes
          console.log(`Procesado lote de relaciones: ${Math.min(i + relationChunkSize, vehiclePairsToProcess.length)}/${vehiclePairsToProcess.length}`);
        }
        
        console.log(`Procesadas ${relationCount} relaciones vehículo-pieza`);
        console.log(`Operación completada con éxito: ${inserted} piezas insertadas, ${updated} actualizadas`);
      } catch (dbError) {
        console.error('Error en la base de datos:', dbError);
        errors.push(`Error en la base de datos: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`);
      }
    
      return { inserted, updated, errors };
    } else {
      return { inserted: 0, updated: 0, errors };
    }
  } catch (batchError) {
    console.error('Error en el procesamiento por lotes de piezas:', batchError);
    errors.push(`Error en el procesamiento por lotes: ${batchError instanceof Error ? batchError.message : 'Error desconocido'}`);
    return { inserted, updated, errors };
  }
}