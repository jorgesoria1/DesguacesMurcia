#!/usr/bin/env node

/**
 * Script para restaurar datos de vehículo para piezas procesadas
 * Problema: 89,769 piezas procesadas tienen descripcionFamilia como marca incorrectamente
 * Solución: Recuperar datos reales de vehículo desde la API MetaSync
 */

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

class ProcessedVehicleDataRestorer {
  constructor() {
    this.apiKey = process.env.METASYNC_API_KEY;
    this.companyId = 1236;
    this.channel = 'webcliente MRC';
    this.baseUrl = 'https://apis.metasync.com';
    
    this.processedCount = 0;
    this.fixedCount = 0;
    this.errorCount = 0;
  }

  /**
   * Hacer consulta a la API MetaSync para obtener datos de vehículo procesado
   */
  async getProcessedVehicleData(idVehiculo) {
    try {
      // Intentar obtener datos del vehículo procesado desde el endpoint de vehículos
      const url = `${this.baseUrl}/Vehiculos/RecuperarCambiosCanal`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'fecha': '2024-01-01',
          'lastid': '0',
          'offset': '0',
          'canal': this.channel,
          'idempresa': this.companyId.toString()
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Buscar el vehículo específico por idLocal
      const vehicle = data.vehiculos?.find(v => v.idLocal === idVehiculo);
      
      if (vehicle) {
        return {
          marca: vehicle.marca || vehicle.nombreMarca || '',
          modelo: vehicle.modelo || vehicle.nombreModelo || '',
          version: vehicle.version || vehicle.nombreVersion || '',
          anyo: vehicle.anyo || vehicle.anyoVehiculo || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error obteniendo datos del vehículo ${idVehiculo}:`, error.message);
      return null;
    }
  }

  /**
   * Buscar datos de vehículo usando la descripción del artículo
   */
  extractVehicleFromDescription(descripcionArticulo) {
    const description = descripcionArticulo.toUpperCase();
    
    // Patrones comunes de marcas en descripciones
    const brandPatterns = [
      { pattern: /VOLKSWAGEN|VW\b/, brand: 'VOLKSWAGEN' },
      { pattern: /BMW\b/, brand: 'BMW' },
      { pattern: /MERCEDES|BENZ/, brand: 'MERCEDES-BENZ' },
      { pattern: /AUDI\b/, brand: 'AUDI' },
      { pattern: /FORD\b/, brand: 'FORD' },
      { pattern: /OPEL\b/, brand: 'OPEL' },
      { pattern: /PEUGEOT\b/, brand: 'PEUGEOT' },
      { pattern: /RENAULT\b/, brand: 'RENAULT' },
      { pattern: /CITROËN|CITROEN/, brand: 'CITROËN' },
      { pattern: /SEAT\b/, brand: 'SEAT' },
      { pattern: /FIAT\b/, brand: 'FIAT' },
      { pattern: /TOYOTA\b/, brand: 'TOYOTA' },
      { pattern: /NISSAN\b/, brand: 'NISSAN' },
      { pattern: /HONDA\b/, brand: 'HONDA' },
      { pattern: /HYUNDAI\b/, brand: 'HYUNDAI' },
      { pattern: /KIA\b/, brand: 'KIA' },
      { pattern: /DACIA\b/, brand: 'DACIA' },
      { pattern: /SKODA\b/, brand: 'SKODA' }
    ];

    // Patrones de modelos comunes
    const modelPatterns = [
      { pattern: /GOLF\b/, model: 'GOLF' },
      { pattern: /POLO\b/, model: 'POLO' },
      { pattern: /PASSAT\b/, model: 'PASSAT' },
      { pattern: /FOCUS\b/, model: 'FOCUS' },
      { pattern: /FIESTA\b/, model: 'FIESTA' },
      { pattern: /MONDEO\b/, model: 'MONDEO' },
      { pattern: /ASTRA\b/, model: 'ASTRA' },
      { pattern: /CORSA\b/, model: 'CORSA' },
      { pattern: /VECTRA\b/, model: 'VECTRA' },
      { pattern: /3008\b/, model: '3008' },
      { pattern: /308\b/, model: '308' },
      { pattern: /307\b/, model: '307' },
      { pattern: /CLIO\b/, model: 'CLIO' },
      { pattern: /MEGANE\b/, model: 'MEGANE' },
      { pattern: /LAGUNA\b/, model: 'LAGUNA' }
    ];

    let brand = '';
    let model = '';

    // Buscar marca
    for (const { pattern, brand: brandName } of brandPatterns) {
      if (pattern.test(description)) {
        brand = brandName;
        break;
      }
    }

    // Buscar modelo
    for (const { pattern, model: modelName } of modelPatterns) {
      if (pattern.test(description)) {
        model = modelName;
        break;
      }
    }

    return { brand, model };
  }

  /**
   * Restaurar datos de vehículo para piezas procesadas
   */
  async restoreProcessedVehicleData() {
    console.log('🔧 Iniciando restauración de datos de vehículo para piezas procesadas...');
    
    try {
      // Obtener piezas procesadas que necesitan corrección
      const partsNeedingFix = await sql`
        SELECT 
          id,
          ref_local,
          id_vehiculo,
          vehicle_marca,
          descripcion_articulo,
          descripcion_familia,
          cod_familia
        FROM parts 
        WHERE id_vehiculo < 0 
          AND (
            vehicle_marca IS NULL 
            OR vehicle_marca = '' 
            OR vehicle_marca IN (
              'ELECTRICIDAD', 'CARROCERÍA TRASERA', 'CARROCERÍA LATERALES', 
              'SUSPENSIÓN / FRENOS', 'INTERIOR', 'DIRECCIÓN / TRANSMISIÓN', 
              'MOTOR', 'ALUMBRADO', 'CAMBIO / EMBRAGUE', 'AIRE ACONDICIONADO',
              'ACCESORIOS', 'CARROCERÍA DELANTERA'
            )
          )
        LIMIT 1000
      `;

      console.log(`📊 Encontradas ${partsNeedingFix.length} piezas que necesitan corrección`);

      for (const part of partsNeedingFix) {
        this.processedCount++;
        
        try {
          let vehicleData = null;
          
          // Método 1: Intentar obtener desde API usando idVehiculo
          if (part.id_vehiculo < 0) {
            vehicleData = await this.getProcessedVehicleData(part.id_vehiculo);
          }
          
          // Método 2: Extraer desde descripción del artículo si no hay datos de API
          if (!vehicleData || (!vehicleData.marca && !vehicleData.modelo)) {
            const extracted = this.extractVehicleFromDescription(part.descripcion_articulo);
            if (extracted.brand) {
              vehicleData = {
                marca: extracted.brand,
                modelo: extracted.model || '',
                version: '',
                anyo: 0
              };
            }
          }
          
          // Actualizar si se encontraron datos válidos
          if (vehicleData && vehicleData.marca && vehicleData.marca !== part.vehicle_marca) {
            await sql`
              UPDATE parts 
              SET 
                vehicle_marca = ${vehicleData.marca},
                vehicle_modelo = ${vehicleData.modelo || ''},
                vehicle_version = ${vehicleData.version || ''},
                vehicle_anyo = ${vehicleData.anyo || 0},
                fecha_actualizacion = NOW()
              WHERE id = ${part.id}
            `;
            
            this.fixedCount++;
            console.log(`✅ Corregida pieza ${part.ref_local}: ${part.vehicle_marca || 'SIN_MARCA'} → ${vehicleData.marca} ${vehicleData.modelo}`);
          }
          
          // Progreso cada 100 piezas
          if (this.processedCount % 100 === 0) {
            console.log(`📈 Progreso: ${this.processedCount} procesadas, ${this.fixedCount} corregidas, ${this.errorCount} errores`);
          }
          
          // Pausa pequeña para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          this.errorCount++;
          console.error(`❌ Error procesando pieza ${part.ref_local}:`, error.message);
        }
      }

      console.log('\n📊 RESUMEN DE RESTAURACIÓN:');
      console.log(`Total procesadas: ${this.processedCount}`);
      console.log(`Total corregidas: ${this.fixedCount}`);
      console.log(`Errores: ${this.errorCount}`);
      console.log(`Porcentaje de éxito: ${((this.fixedCount / this.processedCount) * 100).toFixed(2)}%`);

    } catch (error) {
      console.error('💥 Error fatal en restauración:', error);
      throw error;
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const restorer = new ProcessedVehicleDataRestorer();
  
  restorer.restoreProcessedVehicleData()
    .then(() => {
      console.log('✅ Restauración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en restauración:', error);
      process.exit(1);
    });
}

module.exports = ProcessedVehicleDataRestorer;