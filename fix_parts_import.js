/**
 * Direct script to import parts from MetaSync API with proper vehicle association
 */

import axios from 'axios';
import { db } from './server/db/index.js';
import { parts, vehicles, apiConfig } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

class DirectPartsImporter {
  constructor() {
    this.apiUrl = 'https://apis.metasync.com/Almacen';
    this.apiKey = '';
    this.companyId = 0;
    this.channel = '';
  }

  formatDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  }

  async configure() {
    console.log('Getting API configuration...');
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    
    if (!config) {
      throw new Error('No active API configuration found');
    }
    
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
    this.channel = config.channel;
    
    console.log(`Configured with companyId: ${this.companyId}, channel: ${this.channel}`);
  }

  isValidPrice(precio) {
    if (precio === null || precio === undefined) return false;
    
    const precioStr = String(precio).trim();
    
    if (precioStr === '' || precioStr === '0' || precioStr === '0.0' || 
        precioStr === '0.00' || precioStr === '0,00') {
      return false;
    }
    
    try {
      const precioNum = parseFloat(precioStr.replace(',', '.'));
      return !isNaN(precioNum) && precioNum > 0;
    } catch (error) {
      return false;
    }
  }

  async importParts() {
    await this.configure();
    
    console.log('Starting parts import from MetaSync API...');
    
    // Date from 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateStr = this.formatDate(oneYearAgo);
    
    let lastId = 0;
    let totalProcessed = 0;
    let totalInserted = 0;
    let hasMore = true;
    const BATCH_SIZE = 100;
    
    while (hasMore && totalProcessed < 1000) { // Limit to first 1000 for initial testing
      try {
        console.log(`Fetching parts from lastId: ${lastId}`);
        
        const response = await axios.get(`${this.apiUrl}/RecuperarCambiosCanal`, {
          headers: {
            'apikey': this.apiKey,
            'fecha': dateStr,
            'lastid': lastId.toString(),
            'offset': BATCH_SIZE.toString()
          }
        });
        
        const result = response.data;
        
        if (!result || !result.piezas || !Array.isArray(result.piezas)) {
          console.log('No more parts data available');
          hasMore = false;
          continue;
        }
        
        const partsData = result.piezas;
        console.log(`Received ${partsData.length} parts from API`);
        
        if (partsData.length === 0) {
          hasMore = false;
          continue;
        }
        
        const { inserted } = await this.processPartsBatch(partsData);
        
        totalProcessed += partsData.length;
        totalInserted += inserted;
        
        lastId = result.result_set?.lastId || lastId + BATCH_SIZE;
        hasMore = result.result_set && partsData.length > 0 && totalProcessed < (result.result_set.total || 1000);
        
        console.log(`Progress: ${totalProcessed} processed, ${totalInserted} inserted`);
        
      } catch (error) {
        console.error('Error in batch:', error);
        hasMore = false;
      }
    }
    
    console.log(`Import completed: ${totalInserted} parts inserted from ${totalProcessed} processed`);
    
    // Verify results
    const count = await db.select({ count: sql`COUNT(*)` }).from(parts);
    const activeCount = await db.select({ count: sql`COUNT(*)` }).from(parts).where(eq(parts.activo, true));
    
    console.log(`Total parts in database: ${count[0].count}`);
    console.log(`Active parts in database: ${activeCount[0].count}`);
  }

  async processPartsBatch(partsData) {
    let inserted = 0;
    
    for (const rawPart of partsData) {
      try {
        const refLocal = rawPart.refLocal !== undefined ? rawPart.refLocal : rawPart.RefLocal;
        const idVehiculo = rawPart.idVehiculo !== undefined ? rawPart.idVehiculo : rawPart.IdVehiculo;
        
        if (refLocal === undefined || idVehiculo === undefined) {
          continue;
        }
        
        // Check if part already exists
        const existingParts = await db.select().from(parts).where(eq(parts.refLocal, refLocal));
        if (existingParts.length > 0) {
          continue; // Skip existing parts
        }
        
        // Get associated vehicle
        const vehicleResults = await db.select().from(vehicles).where(eq(vehicles.idLocal, idVehiculo));
        const vehicle = vehicleResults.length > 0 ? vehicleResults[0] : null;
        
        const precio = rawPart.precio?.toString() || '0';
        const hasValidPrice = this.isValidPrice(precio);
        
        const partData = {
          refLocal,
          idVehiculo,
          idEmpresa: rawPart.idEmpresa || this.companyId,
          codFamilia: rawPart.codFamilia || '',
          descripcionFamilia: rawPart.descripcionFamilia || '',
          codArticulo: rawPart.codArticulo || '',
          descripcionArticulo: rawPart.descripcionArticulo || '',
          codVersion: rawPart.codVersion || '',
          refPrincipal: rawPart.refPrincipal || '',
          anyoInicio: rawPart.anyoInicio || 2000,
          anyoFin: rawPart.anyoFin || 2025,
          puertas: rawPart.puertas || 0,
          rvCode: rawPart.rvCode || '',
          precio: precio,
          anyoStock: rawPart.anyoStock || 0,
          peso: rawPart.peso?.toString() || '0',
          ubicacion: rawPart.ubicacion || 0,
          observaciones: rawPart.observaciones || '',
          reserva: rawPart.reserva || 0,
          tipoMaterial: rawPart.tipoMaterial || 0,
          imagenes: Array.isArray(rawPart.imagenes) ? rawPart.imagenes : 
                   (rawPart.imagenes ? [rawPart.imagenes] : ['https://via.placeholder.com/150']),
          // Vehicle information from associated vehicle
          vehicleMarca: vehicle?.marca || '',
          vehicleModelo: vehicle?.modelo || '',
          vehicleVersion: vehicle?.version || '',
          vehicleAnyo: vehicle?.anyo || 0,
          combustible: vehicle?.combustible || '',
          activo: vehicle && hasValidPrice,
          isPendingRelation: !vehicle,
          fechaActualizacion: new Date()
        };
        
        await db.insert(parts).values(partData);
        inserted++;
        
        if (inserted % 50 === 0) {
          console.log(`Inserted ${inserted} parts...`);
        }
        
      } catch (error) {
        console.error(`Error processing part:`, error);
      }
    }
    
    return { inserted };
  }
}

// Execute the import
const importer = new DirectPartsImporter();
importer.importParts()
  .then(() => {
    console.log('Parts import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Parts import failed:', error);
    process.exit(1);
  });