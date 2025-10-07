import { db } from './db';
import { Vehicle, InsertVehicle, Part, InsertPart, vehicles, parts, vehicleParts, InsertVehiclePart } from '../shared/schema';
import { MetasyncPart, MetasyncVehicle, MetasyncVehicleNew } from '../shared/types';
import { storage } from './storage';
import { sql, eq, and, or, like, gte, lte, isNull, isNotNull, inArray } from 'drizzle-orm';

/**
 * Clase para manejo eficiente de lotes de datos en la importación
 * Con soporte mejorado para los diferentes formatos de la API MetaSync
 */
export class BatchProcessor {
  /**
   * Procesa un lote de vehículos en una sola operación de base de datos
   * Con manejo universal de formatos de API
   */
  async processVehicleBatch(vehicleBatch: any[], isNewFormat: boolean): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }> {
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];
    const vehiclesToInsert: InsertVehicle[] = [];
    
    try {
      console.log(`Procesando lote de ${vehicleBatch.length} vehículos. Formato: ${isNewFormat ? 'nuevo' : 'antiguo'}`);
      
      // Mostrar ejemplo de los datos que estamos recibiendo (para debug)
      if (vehicleBatch.length > 0) {
        const firstVehicle = vehicleBatch[0];
        console.log(`EJEMPLO DE DATOS: Propiedades disponibles: ${Object.keys(firstVehicle).slice(0, 10).join(', ')}`);
      }
      
      // Preparar datos para inserción masiva
      for (const vehicleData of vehicleBatch) {
        try {
          // Extraer campos de datos independientemente del formato
          const idLocal = vehicleData.idLocal || vehicleData.IdLocal || 0;
          const idEmpresa = vehicleData.idEmpresa || vehicleData.IdEmpresa || 1236;
          
          // Buscar marca/modelo/versión en todos los posibles nombres de campo
          const marca = vehicleData.nombreMarca || vehicleData.NombreMarca || 
                      vehicleData.marca || vehicleData.Marca || 'Desconocida';
          
          const modelo = vehicleData.nombreModelo || vehicleData.NombreModelo || 
                       vehicleData.modelo || vehicleData.Modelo || 'Desconocido';
          
          const version = vehicleData.nombreVersion || vehicleData.NombreVersion || 
                        vehicleData.version || vehicleData.Version || 'Desconocida';
          
          // Año y campos adicionales
          const anyo = vehicleData.anyoVehiculo || vehicleData.AnyoVehiculo || 
                     vehicleData.anyo || 0;
          
          const combustible = vehicleData.combustible || vehicleData.Combustible || '';
          const bastidor = vehicleData.bastidor || vehicleData.Bastidor || '';
          const matricula = vehicleData.matricula || vehicleData.Matricula || '';
          const color = vehicleData.color || vehicleData.Color || '';
          const kilometraje = vehicleData.kilometraje || vehicleData.Kilometraje || 0;
          const potencia = vehicleData.potenciaHP || vehicleData.PotenciaHP || 
                         vehicleData.potencia || vehicleData.Potencia || 0;
          const puertas = vehicleData.puertas || vehicleData.Puertas || null;
          
          // Crear descripción garantizando que nunca sea null
          const descripcion = `${marca} ${modelo} ${version}${anyo ? ` (${anyo})` : ''}`.trim() 
                          || `Vehículo ID ${idLocal}`;
          
          // Garantizar que imagenes sea siempre un array válido (nunca null)
          let imagenes: string[] = [];
          
          // Buscar imágenes en todas las variantes posibles de nombres de campo
          if (Array.isArray(vehicleData.urlsImgs) && vehicleData.urlsImgs.length > 0) {
            imagenes = vehicleData.urlsImgs;
          } else if (Array.isArray(vehicleData.UrlsImgs) && vehicleData.UrlsImgs.length > 0) {
            imagenes = vehicleData.UrlsImgs;
          } else if (typeof vehicleData.urlsImgs === 'string' && vehicleData.urlsImgs) {
            imagenes = [vehicleData.urlsImgs];
          } else if (typeof vehicleData.UrlsImgs === 'string' && vehicleData.UrlsImgs) {
            imagenes = [vehicleData.UrlsImgs];
          }
          
          // Si después de todo sigue vacío, añadir una imagen predeterminada
          if (imagenes.length === 0) {
            imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
          }
          
          // Crear el objeto de vehículo estandarizado para inserción
          const vehicle: InsertVehicle = {
            idLocal,
            idEmpresa,
            descripcion,
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
            imagenes,
            activo: true,
            sincronizado: true,
            ultimaSincronizacion: new Date()
          };
          
          vehiclesToInsert.push(vehicle);
        } catch (vehicleError) {
          console.error('Error preparando vehículo para inserción:', vehicleError);
          errors.push(`Error preparando vehículo: ${vehicleError instanceof Error ? vehicleError.message : 'Error desconocido'}`);
        }
      }

      // Si no hay vehículos para insertar, salir temprano
      if (vehiclesToInsert.length === 0) {
        return { inserted, updated, errors };
      }
      
      // Usar transacción para garantizar atomicidad
      await db.transaction(async (tx) => {
        // Obtener IDs locales de los vehículos a procesar
        const idLocales = vehiclesToInsert.map(v => v.idLocal);
        
        // Buscar vehículos existentes con esos IDs locales
        const existingVehicles = await tx
          .select({ id: vehicles.id, idLocal: vehicles.idLocal })
          .from(vehicles)
          .where(inArray(vehicles.idLocal, idLocales));
        
        // Crear mapa para acceso rápido
        const existingVehicleMap = new Map(
          existingVehicles.map(v => [v.idLocal, v.id])
        );
        
        // Separar vehículos para inserción y actualización
        const newVehicles = [];
        const vehiclesToUpdate = [];
        
        for (const vehicle of vehiclesToInsert) {
          if (existingVehicleMap.has(vehicle.idLocal)) {
            // Actualizar existente
            vehiclesToUpdate.push({
              ...vehicle,
              id: existingVehicleMap.get(vehicle.idLocal)
            });
          } else {
            // Vehículo nuevo para inserción
            newVehicles.push(vehicle);
          }
        }
        
        // Insertar nuevos vehículos
        if (newVehicles.length > 0) {
          try {
            const insertResult = await tx
              .insert(vehicles)
              .values(newVehicles)
              .returning({ id: vehicles.id, idLocal: vehicles.idLocal });
            
            inserted = insertResult.length;
            
            // Actualizar el mapa con vehículos recién insertados
            for (const v of insertResult) {
              existingVehicleMap.set(v.idLocal, v.id);
            }
            
            console.log(`Insertados ${inserted} vehículos nuevos`);
          } catch (insertError) {
            const error = insertError as Error;
            console.error('Error al insertar vehículos:', error);
            errors.push(`Error al insertar vehículos: ${error.message}`);
          }
        }
        
        // Actualizar vehículos existentes
        if (vehiclesToUpdate.length > 0) {
          try {
            for (const v of vehiclesToUpdate) {
              const vehicleId = existingVehicleMap.get(v.idLocal);
              if (vehicleId) {
                await tx
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
                  .where(eq(vehicles.id, vehicleId));
                updated++;
              }
            }
            console.log(`Actualizados ${updated} vehículos existentes`);
          } catch (updateError) {
            const error = updateError as Error;
            console.error('Error al actualizar vehículos:', error);
            errors.push(`Error al actualizar vehículos: ${error.message}`);
          }
        }
      });
      
      console.log(`Procesamiento por lotes completado: ${inserted} vehículos insertados, ${updated} actualizados, ${errors.length} errores`);
      if (errors.length > 0) {
        console.log('Errores en procesamiento por lotes de vehículos:', errors);
      }
      
      return { inserted, updated, errors };
    } catch (batchError) {
      const error = batchError as Error;
      console.error('Error global en procesamiento por lotes de vehículos:', error);
      errors.push(`Error global: ${error.message}`);
      return { inserted, updated, errors };
    }
  }

  /**
   * Procesa un lote de piezas en una sola operación de base de datos
   * Incluye la importación de imágenes y manejo correcto de precios
   */
  async processPartBatch(partBatch: any[], isNewFormat: boolean): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }> {
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];
    const partsToInsert: InsertPart[] = [];
    const vehiclePartRelations: { partRefLocal: number; idVehiculoOriginal: number }[] = [];
    
    try {
      // Preparar datos para inserción masiva
      for (const partData of partBatch) {
        try {
          // Extraer campos de datos independientemente del formato
          const refLocal = partData.refLocal || 0;
          const idEmpresa = partData.idEmpresa || 1236;
          const idVehiculoOriginal = partData.idVehiculo || -1;
          
          const codFamilia = partData.codFamilia || '';
          const descripcionFamilia = partData.descripcionFamilia || '';
          const codArticulo = partData.codArticulo || '';
          const descripcionArticulo = partData.descripcionArticulo || 'Pieza sin descripción';
          const codVersion = partData.codVersion || '';
          const refPrincipal = partData.refPrincipal || '';
          
          // Extraer información para matching de vehículos
          const rvCode = partData.codVersion || '';
          const anyoInicio = partData.anyoInicio || null;
          const anyoFin = partData.anyoFin || null;
          const puertas = partData.puertas || 0;
          
          // Convertir datos numéricos a texto para evitar problemas con enteros grandes
          const precio = String(partData.precio || 0);
          const anyoStock = partData.anyoStock || 0;
          const peso = String(partData.peso || 0);
          const ubicacion = partData.ubicacion || 0;
          const observaciones = partData.observaciones || '';
          const reserva = partData.reserva || 0;
          const tipoMaterial = partData.tipoMaterial || 0;
          
          // Normalizar imágenes (manejar todos los formatos posibles)
          let imagenes: string[] = [];
          
          // 1. Intentar con diferentes propiedades conocidas para imágenes
          const imageProperties = [
            'urlsImgs', 'UrlsImgs', 'imagenes', 'Imagenes', 
            'fotos', 'Fotos', 'images', 'Images', 'imageUrls', 'urls'
          ];
          
          // Registrar diagnóstico
          const imageDebug: string[] = [];
          
          // Probar cada propiedad posible
          for (const prop of imageProperties) {
            if (Array.isArray(partData[prop]) && partData[prop].length > 0) {
              // Si es un array, usarlo directamente
              imagenes = partData[prop].filter((url: any) => url && typeof url === 'string');
              imageDebug.push(`Encontradas imágenes en formato array en propiedad '${prop}': ${imagenes.length}`);
              break;
            } else if (typeof partData[prop] === 'string' && partData[prop]) {
              // Si es un string, convertirlo a array
              imagenes = [partData[prop]];
              imageDebug.push(`Encontrada imagen en formato string en propiedad '${prop}'`);
              break;
            }
          }
          
          // 2. Si no se encontraron imágenes, buscar en objetos anidados
          if (imagenes.length === 0) {
            // Buscar dentro de objetos anidados como 'data', 'imagenes', etc.
            const possibleContainers = ['data', 'imagen', 'imagen_data', 'imageData'];
            
            for (const container of possibleContainers) {
              if (partData[container] && typeof partData[container] === 'object') {
                // Intentar con las mismas propiedades dentro del contenedor
                for (const prop of imageProperties) {
                  if (Array.isArray(partData[container][prop]) && partData[container][prop].length > 0) {
                    imagenes = partData[container][prop].filter((url: any) => url && typeof url === 'string');
                    imageDebug.push(`Encontradas imágenes en objeto anidado ${container}.${prop}: ${imagenes.length}`);
                    break;
                  } else if (typeof partData[container][prop] === 'string' && partData[container][prop]) {
                    imagenes = [partData[container][prop]];
                    imageDebug.push(`Encontrada imagen en objeto anidado ${container}.${prop}`);
                    break;
                  }
                }
                
                if (imagenes.length > 0) break;
              }
            }
          }
          
          // 3. Si aún no hay imágenes, buscar propiedades que parezcan URLs
          if (imagenes.length === 0) {
            for (const [key, value] of Object.entries(partData)) {
              if (typeof value === 'string' && 
                  (key.toLowerCase().includes('url') || key.toLowerCase().includes('img') || key.toLowerCase().includes('image')) &&
                  (value.startsWith('http') || value.startsWith('//'))) {
                imagenes = [value];
                imageDebug.push(`Encontrada posible URL de imagen en propiedad '${key}'`);
                break;
              }
            }
          }
          
          // Si realmente no hay imágenes, añadir imagen por defecto
          if (imagenes.length === 0) {
            imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
            imageDebug.push('No se encontraron imágenes, usando placeholder');
          }
          
          // Filtrar URLs no válidas
          imagenes = imagenes.filter(url => {
            // Eliminar valores nulos, undefined o vacíos
            if (!url) return false;
            
            // Convertir a string si no lo es
            const urlStr = String(url).trim();
            
            // Verificar que tenga un formato válido
            return urlStr.length > 0 && (
              urlStr.startsWith('http') || 
              urlStr.startsWith('//') || 
              urlStr.startsWith('/') || 
              urlStr.startsWith('data:image/')
            );
          });
          
          // Si después de filtrar no hay imágenes válidas, usar placeholder
          if (imagenes.length === 0) {
            imagenes = ["https://via.placeholder.com/150?text=Sin+Imagen"];
            imageDebug.push('Después de filtrar, no quedaron URLs válidas. Usando placeholder');
          }
          
          // Registrar diagnóstico si es útil
          if (imageDebug.length > 0) {
            console.log(`Diagnóstico de imágenes para pieza ${refLocal}: ${imageDebug.join(', ')}`);
          }
          
          // Extraer idVehiculo de los datos de la pieza (múltiples posibles ubicaciones)
          let idVehiculo = 0;
          if (partData.idVehiculo && typeof partData.idVehiculo === 'number') {
            idVehiculo = partData.idVehiculo;
          } else if (partData.vehicleId && typeof partData.vehicleId === 'number') {
            idVehiculo = partData.vehicleId;
          } else if (partData.id_vehiculo && typeof partData.id_vehiculo === 'number') {
            idVehiculo = partData.id_vehiculo;
          }
          
          // Obtener datos del vehículo principal para incluirlo en la pieza
          // Si los datos vienen directamente en el JSON de la pieza, usarlos
          let nombreMarca = '';
          let nombreModelo = '';
          let nombreVersion = '';
          let anyoVehiculo = 0;
          
          // Intentar obtener datos del vehículo del JSON de entrada (primero de campos unificados)
          if (partData.nombreMarca) {
            nombreMarca = String(partData.nombreMarca || '');
          } else if (partData.vehicleMarca || partData.vehicle_marca) {
            // Fallback a campos antiguos (temporalmente)
            nombreMarca = String(partData.vehicleMarca || partData.vehicle_marca || '');
          }
          
          if (partData.nombreModelo) {
            nombreModelo = String(partData.nombreModelo || '');
          } else if (partData.vehicleModelo || partData.vehicle_modelo) {
            nombreModelo = String(partData.vehicleModelo || partData.vehicle_modelo || '');
          }
          
          if (partData.nombreVersion) {
            nombreVersion = String(partData.nombreVersion || '');
          } else if (partData.vehicleVersion || partData.vehicle_version) {
            nombreVersion = String(partData.vehicleVersion || partData.vehicle_version || '');
          }
          
          if (partData.anyoVehiculo) {
            anyoVehiculo = Number(partData.anyoVehiculo || 0);
          } else if (partData.vehicleAnyo || partData.vehicle_anyo) {
            anyoVehiculo = Number(partData.vehicleAnyo || partData.vehicle_anyo || 0);
          }
          
          // Si tenemos idVehiculo, intentar obtener los datos del vehículo
          if (idVehiculo > 0 && (!nombreMarca || !nombreModelo)) {
            try {
              // Buscar vehículo usando idVehiculo como idLocal
              const vehicleResult = await db
                .select({
                  marca: vehicles.marca,
                  modelo: vehicles.modelo,
                  version: vehicles.version,
                  anyo: vehicles.anyo
                })
                .from(vehicles)
                .where(eq(vehicles.idLocal, idVehiculo))
                .limit(1);
              
              if (vehicleResult.length > 0) {
                nombreMarca = vehicleResult[0].marca || '';
                nombreModelo = vehicleResult[0].modelo || '';
                nombreVersion = vehicleResult[0].version || '';
                anyoVehiculo = vehicleResult[0].anyo || 0;
                console.log(`Encontrada información de vehículo para pieza ${refLocal}: ${nombreMarca} ${nombreModelo}`);
              }
            } catch (error) {
              console.error(`Error buscando datos de vehículo para pieza ${refLocal}:`, error);
            }
          }
          
          // Crear parte estandarizada para inserción
          const part: InsertPart = {
            refLocal,
            idEmpresa,
            idVehiculo,
            
            // Campos unificados del vehículo desde el endpoint de piezas
            codMarca: codFamilia || '',
            nombreMarca: nombreMarca || descripcionFamilia || '',
            codModelo: codArticulo || '',
            nombreModelo: nombreModelo || descripcionArticulo || '',
            nombreVersion: nombreVersion || codVersion || '',
            codVersion,
            tipoVersion: partData.tipoVersion || '',
            combustible: partData.combustible || '',
            anyoVehiculo: anyoVehiculo || 0,
            
            relatedVehiclesCount: 0, // Se actualizará después al procesar relaciones
            codFamilia,
            descripcionFamilia,
            codArticulo,
            descripcionArticulo,
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
            activo: false, // Inicialmente inactiva, se activa con relaciones
            sincronizado: true,
            ultimaSincronizacion: new Date()
          };
          
          partsToInsert.push(part);
          
          // Si hay un vehículo asociado, registrar la relación
          if (idVehiculoOriginal > 0) {
            vehiclePartRelations.push({
              partRefLocal: refLocal,
              idVehiculoOriginal
            });
          }
        } catch (partError) {
          console.error('Error preparando pieza para inserción:', partError);
          errors.push(`Error preparando pieza: ${partError instanceof Error ? partError.message : 'Error desconocido'}`);
        }
      }

      // Si no hay piezas para insertar, salir temprano
      if (partsToInsert.length === 0) {
        return { inserted, updated, errors };
      }
      
      // Usar transacción para garantizar atomicidad
      await db.transaction(async (tx) => {
        // Obtener referencias locales de las piezas a procesar
        const refLocales = partsToInsert.map(p => p.refLocal);
        
        // Buscar piezas existentes
        const existingParts = await tx
          .select({ id: parts.id, refLocal: parts.refLocal })
          .from(parts)
          .where(inArray(parts.refLocal, refLocales));
        
        // Crear mapa para acceso rápido
        const existingPartMap = new Map(
          existingParts.map(p => [p.refLocal, p.id])
        );
        
        // Separar piezas para inserción y actualización
        const newParts = [];
        const partsToUpdate = [];
        
        for (const part of partsToInsert) {
          if (existingPartMap.has(part.refLocal)) {
            // Actualizar existente
            partsToUpdate.push({
              ...part,
              id: existingPartMap.get(part.refLocal)
            });
          } else {
            // Pieza nueva para inserción
            newParts.push(part);
          }
        }
        
        // Insertar nuevas piezas
        if (newParts.length > 0) {
          try {
            const insertResult = await tx
              .insert(parts)
              .values(newParts)
              .returning({ id: parts.id, refLocal: parts.refLocal });
            
            inserted = insertResult.length;
            
            // Actualizar el mapa con piezas recién insertadas
            for (const p of insertResult) {
              existingPartMap.set(p.refLocal, p.id);
            }
            
            console.log(`Insertadas ${inserted} piezas nuevas`);
          } catch (insertError) {
            const error = insertError as Error;
            console.error('Error al insertar piezas:', error);
            errors.push(`Error al insertar piezas: ${error.message}`);
          }
        }
        
        // Actualizar piezas existentes
        if (partsToUpdate.length > 0) {
          try {
            for (const p of partsToUpdate) {
              const partId = existingPartMap.get(p.refLocal);
              if (partId) {
                await tx
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
                    // Usando solo campos unificados
                    sincronizado: true,
                    ultimaSincronizacion: new Date(),
                    
                  })
                  .where(eq(parts.id, partId));
                updated++;
              }
            }
            console.log(`Actualizadas ${updated} piezas existentes`);
          } catch (updateError) {
            const error = updateError as Error;
            console.error('Error al actualizar piezas:', error);
            errors.push(`Error al actualizar piezas: ${error.message}`);
          }
        }
        
        // Procesar relaciones pieza-vehículo
        if (vehiclePartRelations.length > 0) {
          await this.processVehiclePartRelations(tx, vehiclePartRelations, existingPartMap);
        }
      });
      
      console.log(`Procesamiento por lotes de piezas completado: ${inserted} piezas insertadas, ${updated} actualizadas, ${errors.length} errores`);
      if (errors.length > 0) {
        console.log('Errores en procesamiento por lotes de piezas:', errors);
      }
      
      return { inserted, updated, errors };
    } catch (batchError) {
      const error = batchError as Error;
      console.error('Error global en procesamiento por lotes de piezas:', error);
      errors.push(`Error global: ${error.message}`);
      return { inserted, updated, errors };
    }
  }
  
  /**
   * Procesa las relaciones entre piezas y vehículos
   */
  private async processVehiclePartRelations(
    tx: any,
    relations: { partRefLocal: number; idVehiculoOriginal: number }[],
    partMap: Map<number, number>
  ): Promise<void> {
    try {
      // Obtener los IDs de vehículos originales únicos
      const idVehiculosOriginales = [...new Set(relations.map(r => r.idVehiculoOriginal))];
      
      // Buscar vehículos existentes
      const existingVehicles = await tx
        .select({ id: vehicles.id, idLocal: vehicles.idLocal })
        .from(vehicles)
        .where(inArray(vehicles.idLocal, idVehiculosOriginales));
      
      // Crear mapa para acceso rápido
      const vehicleMap = new Map(
        existingVehicles.map(v => [v.idLocal, v.id])
      );
      
      // Procesar cada relación
      for (const relation of relations) {
        const partId = partMap.get(relation.partRefLocal);
        const vehicleId = vehicleMap.get(relation.idVehiculoOriginal);
        
        if (!partId) {
          console.log(`No se encontró la pieza con refLocal ${relation.partRefLocal}`);
          continue;
        }
        
        // Si existe el vehículo, crear relación directa
        if (vehicleId) {
          // Verificar si ya existe la relación
          const existingRelation = await tx
            .select({ id: vehicleParts.id })
            .from(vehicleParts)
            .where(and(
              eq(vehicleParts.partId, partId),
              eq(vehicleParts.vehicleId, vehicleId)
            ));
          
          if (existingRelation.length === 0) {
            // Crear nueva relación entre vehículo y pieza
            const newRelation: InsertVehiclePart = {
              vehicleId,
              partId,
              idVehiculoOriginal: relation.idVehiculoOriginal
            };
            
            await tx.insert(vehicleParts).values(newRelation);
              
            // Contar vehículos relacionados con esta pieza
            const relatedVehiclesQuery = await tx
              .select({ count: sql`count(*)` })
              .from(vehicleParts)
              .where(eq(vehicleParts.partId, partId));
              
            const relatedCount = Number(relatedVehiclesQuery[0]?.count || 0);
              
            // Activar la pieza y actualizar contador de vehículos relacionados
            await tx
              .update(parts)
              .set({ 
                activo: true,
                relatedVehiclesCount: relatedCount
              })
              .where(eq(parts.id, partId));
          }
        } else {
          // Vehículo no encontrado, crear relación pendiente
          await tx.insert(vehicleParts).values({
            vehicleId: null, // Pendiente
            partId,
            idVehiculoOriginal: relation.idVehiculoOriginal
          });
        }
      }
    } catch (error) {
      console.error('Error al procesar relaciones vehículo-pieza:', error);
    }
  }

  /**
   * Procesa pendientes relaciones vehículo-pieza después de importar vehículos
   * Intenta encontrar vehículos que ahora existan para las relaciones pendientes
   */
  async processPendingRelations(): Promise<{ updated: number }> {
    let updated = 0;
    
    try {
      await db.transaction(async (tx) => {
        // Buscar relaciones pendientes (vehicleId es NULL)
        const pendingRelations = await tx
          .select({
            id: vehicleParts.id,
            partId: vehicleParts.partId,
            idVehiculoOriginal: vehicleParts.idVehiculoOriginal
          })
          .from(vehicleParts)
          .where(isNull(vehicleParts.vehicleId));
        
        if (pendingRelations.length === 0) {
          console.log('No hay relaciones pendientes para procesar');
          return;
        }
        
        console.log(`Encontradas ${pendingRelations.length} relaciones pendientes para procesar`);
        
        // Obtener IDs originales de vehículos
        const idVehiculosOriginales = [...new Set(pendingRelations.map(r => r.idVehiculoOriginal))];
        
        // Buscar vehículos que ahora existan
        const existingVehicles = await tx
          .select({ id: vehicles.id, idLocal: vehicles.idLocal })
          .from(vehicles)
          .where(inArray(vehicles.idLocal, idVehiculosOriginales));
        
        if (existingVehicles.length === 0) {
          console.log('No se encontraron vehículos para las relaciones pendientes');
          return;
        }
        
        console.log(`Encontrados ${existingVehicles.length} vehículos para asociar con relaciones pendientes`);
        
        // Crear mapa para acceso rápido
        const vehicleMap = new Map(
          existingVehicles.map(v => [v.idLocal, v.id])
        );
        
        // Actualizar relaciones pendientes
        for (const relation of pendingRelations) {
          const vehicleId = vehicleMap.get(relation.idVehiculoOriginal);
          
          if (vehicleId) {
            await tx
              .update(vehicleParts)
              .set({ vehicleId })
              .where(eq(vehicleParts.id, relation.id));
            
            // Activar la pieza
            await tx
              .update(parts)
              .set({ activo: true })
              .where(eq(parts.id, relation.partId));
            
            updated++;
          }
        }
      });
      
      return { updated };
    } catch (error) {
      console.error('Error al procesar relaciones pendientes:', error);
      return { updated };
    }
  }
}

export const batchProcessor = new BatchProcessor();