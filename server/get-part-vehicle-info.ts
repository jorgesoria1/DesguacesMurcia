/**
 * Script para obtener y actualizar la información de vehículos para todas las piezas
 * directamente desde el endpoint de piezas de MetaSync
 */

import { db } from './db';
import { eq, sql, isNull, or } from 'drizzle-orm';
import { parts, apiConfig } from '../shared/schema';
import axios from 'axios';
import fs from 'fs';

// Interfaz para los datos de las piezas en la respuesta JSON
interface MetasyncPart {
  refLocal: number;
  idVehiculo: number;
  codFamilia: string;
  descripcionFamilia: string;
  codArticulo: string;
  descripcionArticulo: string;
  // Otros campos opcionales que podrían contener información de vehículo
  [key: string]: any;
}

/**
 * Extrae información de vehículo de una pieza basado en los datos disponibles
 */
function extractVehicleInfo(part: MetasyncPart): { 
  marca: string; 
  modelo: string; 
  version: string; 
  anyo: number 
} {
  // Inicializar valores por defecto
  let marca = '';
  let modelo = '';
  let version = '';
  let anyo = 0;

  // En este sistema, codFamilia a menudo contiene la marca del vehículo
  if (part.codFamilia && part.codFamilia !== '010') { // 010 es genérico
    marca = part.descripcionFamilia || part.codFamilia;
  }
  
  // Si hay una descripción de familia, podría contener información de marca/modelo
  if (part.descripcionFamilia && part.descripcionFamilia !== 'GENERICO') {
    // Intentar extraer marca y modelo de la descripción si está disponible
    const descripcion = part.descripcionFamilia;
    
    // Si la descripción tiene un formato como "MARCA MODELO"
    const partes = descripcion.split(' ');
    if (partes.length >= 2) {
      marca = marca || partes[0];
      modelo = partes.slice(1).join(' ');
    } else {
      marca = descripcion;
    }
  }
  
  // Intentar extraer información de versión y año si está disponible
  if (part.codVersion && part.codVersion !== '01000000') {
    version = part.codVersion;
  }
  
  // Si hay año de stock disponible y es razonable, usarlo como año del vehículo
  if (part.anyoStock && part.anyoStock > 1950 && part.anyoStock < 2030) {
    anyo = part.anyoStock;
  }
  
  return { marca, modelo, version, anyo };
}

async function updateAllPartsWithVehicleInfo() {
  console.log('Iniciando actualización de información de vehículos en piezas desde endpoint MetaSync...');

  try {
    // 1. Obtener la configuración de la API
    const configResult = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    
    if (!configResult || configResult.length === 0) {
      throw new Error('No se encontró configuración activa de API');
    }
    
    const apiConfigData = configResult[0];

    // 2. Cargar el archivo JSON con los datos de piezas (que ya tenemos descargado)
    // Nota: También podríamos hacer una solicitud API directa, pero usaremos los datos que tenemos
    const jsonFilePath = './attached_assets/RecuperarCambiosCanal_2025-05-14T07-38.json';
    
    if (!fs.existsSync(jsonFilePath)) {
      console.log('Archivo JSON no encontrado. Intentando obtener datos desde la API...');
      
      // Solicitar datos desde la API si no tenemos el archivo
      const response = await axios.post('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
        apiKey: apiConfigData.apiKey,
        companyId: apiConfigData.companyId,
        channel: apiConfigData.channel,
        filtro: {
          incluirPiezas: true,
          incluirVehiculos: true
        }
      });
      
      if (!response.data || !response.data.success) {
        throw new Error('Error en la respuesta de la API');
      }
      
      processPiezasData(response.data.data.piezas);
    } else {
      // Leer el archivo JSON
      const rawData = fs.readFileSync(jsonFilePath, 'utf8');
      const jsonData = JSON.parse(rawData);
      
      if (!jsonData.data || !jsonData.data.piezas) {
        throw new Error('Formato JSON inválido o sin datos de piezas');
      }
      
      await processPiezasData(jsonData.data.piezas);
    }
    
    console.log('Proceso finalizado correctamente');
  } catch (error) {
    console.error('Error al actualizar datos de vehículo:', error);
  }
}

/**
 * Procesa un array de piezas desde MetaSync y actualiza la base de datos
 */
async function processPiezasData(piezas: MetasyncPart[]) {
  console.log(`Procesando ${piezas.length} piezas...`);
  
  let actualizadas = 0;
  const BATCH_SIZE = 250; // Actualizar en lotes más grandes
  
  // Primero, necesitamos encontrar qué refLocales existen en nuestra base de datos
  // para evitar intentar actualizar piezas que no existen
  const refLocales = piezas.map(p => p.refLocal);
  const LOOKUP_BATCH_SIZE = 1000;
  
  // Conjunto de refLocales que existen en la base de datos
  const existingRefLocales = new Set<number>();
  
  // Buscar refLocales existentes en lotes
  for (let i = 0; i < refLocales.length; i += LOOKUP_BATCH_SIZE) {
    const batchRefLocales = refLocales.slice(i, i + LOOKUP_BATCH_SIZE);
    
    const existingParts = await db.select({
      refLocal: parts.refLocal
    })
    .from(parts)
    .where(inArray(parts.refLocal, batchRefLocales));
    
    existingParts.forEach(p => existingRefLocales.add(p.refLocal));
    
    console.log(`Verificados ${i + existingParts.length} refLocales, encontrados ${existingRefLocales.size} existentes`);
  }
  
  console.log(`Total de piezas encontradas en la base de datos: ${existingRefLocales.size}`);
  
  // Filtrar solo las piezas que existen en nuestra base de datos
  const piezasToUpdate = piezas.filter(p => existingRefLocales.has(p.refLocal));
  console.log(`Actualizando ${piezasToUpdate.length} piezas existentes...`);
  
  // Procesar en lotes para evitar saturar la base de datos
  for (let i = 0; i < piezasToUpdate.length; i += BATCH_SIZE) {
    const lote = piezasToUpdate.slice(i, i + BATCH_SIZE);
    
    // Usar una sola transacción para cada lote
    await db.transaction(async (tx) => {
      for (const pieza of lote) {
        try {
          // Extraer información de vehículo de la pieza
          const vehicleInfo = extractVehicleInfo(pieza);
          
          // Actualizar la pieza en la base de datos
          await tx.update(parts)
            .set({
              vehicleMarca: vehicleInfo.marca,
              vehicleModelo: vehicleInfo.modelo,
              vehicleVersion: vehicleInfo.version,
              vehicleAnyo: vehicleInfo.anyo
            })
            .where(eq(parts.refLocal, pieza.refLocal));
          
          actualizadas++;
        } catch (err) {
          console.error(`Error al actualizar pieza ${pieza.refLocal}:`, err);
        }
      }
    });
    
    console.log(`Actualizadas ${actualizadas} piezas hasta ahora...`);
  }
  
  console.log(`Actualización completa. ${actualizadas} piezas actualizadas.`);
  
  // Actualizar contador de vehículos relacionados
  await db.execute(sql`
    UPDATE parts p
    SET related_vehicles_count = (
      SELECT COUNT(*) 
      FROM vehicle_parts vp 
      WHERE vp.part_id = p.id
    )
  `);
  
  // Mostrar estadísticas
  const stats = await db.select({
    total: sql`COUNT(*)`,
    withVehicleData: sql`SUM(CASE WHEN vehicle_marca != '' AND vehicle_marca IS NOT NULL THEN 1 ELSE 0 END)`,
    withRelatedVehicles: sql`SUM(CASE WHEN related_vehicles_count > 0 THEN 1 ELSE 0 END)`
  }).from(parts);
  
  if (stats.length > 0) {
    const data = stats[0];
    console.log('Estadísticas finales:');
    console.log(`- Total de piezas: ${data.total}`);
    console.log(`- Piezas con datos de vehículo: ${data.withVehicleData}`);
    console.log(`- Piezas con vehículos relacionados: ${data.withRelatedVehicles}`);
  }
}

// Ejecutar la función si se llama directamente
updateAllPartsWithVehicleInfo()
  .then(() => console.log('Proceso completado exitosamente'))
  .catch((error) => {
    console.error('Error en el proceso:', error);
  });

export { updateAllPartsWithVehicleInfo };