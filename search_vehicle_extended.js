/**
 * Búsqueda extendida del vehículo 48036 en la API de MetaSync
 * Utiliza paginación para buscar en más registros
 */

import pkg from 'pg';
const { Client } = pkg;
import axios from 'axios';

// Configuración de la base de datos
const DATABASE_URL = process.env.DATABASE_URL;

class ExtendedVehicleSearcher {
  constructor() {
    this.client = new Client({ connectionString: DATABASE_URL });
    this.foundVehicle = null;
  }

  async initialize() {
    try {
      await this.client.connect();
      console.log('✅ Conectado a la base de datos');
      
      // Obtener configuración de la API
      const configResult = await this.client.query(
        'SELECT api_key, company_id, channel FROM api_config WHERE active = true LIMIT 1'
      );

      if (configResult.rows.length === 0) {
        throw new Error('No se encontró configuración activa de la API');
      }

      this.apiConfig = configResult.rows[0];
      console.log('✅ Configuración de API cargada');
      
    } catch (error) {
      console.error('❌ Error inicializando:', error);
      throw error;
    }
  }

  formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  async searchVehicleWithPagination(targetIdLocal) {
    try {
      console.log(`🔍 Buscando vehículo con idLocal ${targetIdLocal} usando paginación...`);
      
      let lastId = 0;
      let totalSearched = 0;
      let batchCount = 0;
      const batchSize = 1000;
      
      while (batchCount < 10) { // Limitar a 10 lotes (10,000 registros)
        batchCount++;
        
        try {
          console.log(`📡 Lote ${batchCount}: Buscando desde lastId ${lastId}...`);
          
          const response = await axios.get('https://apis.metasync.com/Almacen/RecuperarCambiosVehiculosCanal', {
            headers: {
              'apikey': this.apiConfig.api_key,
              'fecha': this.formatDate(new Date('2023-01-01')), // Fecha más antigua
              'lastid': lastId.toString(),
              'offset': batchSize.toString()
            }
          });

          if (response.data && response.data.vehiculos && response.data.vehiculos.length > 0) {
            const vehicles = response.data.vehiculos;
            totalSearched += vehicles.length;
            
            console.log(`   ✅ Recibidos ${vehicles.length} vehículos (total: ${totalSearched})`);
            
            // Buscar el vehículo objetivo
            const targetVehicle = vehicles.find(v => v.idLocal === targetIdLocal);
            
            if (targetVehicle) {
              console.log(`🎯 ¡ENCONTRADO! Vehículo con idLocal ${targetIdLocal}`);
              console.log(`   Descripción: ${targetVehicle.descripcion}`);
              console.log(`   Marca: ${targetVehicle.nombreMarca}`);
              console.log(`   Modelo: ${targetVehicle.nombreModelo}`);
              console.log(`   Año: ${targetVehicle.anyoVehiculo}`);
              
              // Verificar código 09351
              const hasCode09351 = targetVehicle.descripcion && 
                (targetVehicle.descripcion.includes('09351') || 
                 targetVehicle.descripcion.includes('9351'));
              
              console.log(`🔍 ¿Contiene código 09351? ${hasCode09351 ? '✅ SÍ' : '❌ NO'}`);
              
              this.foundVehicle = {
                ...targetVehicle,
                hasCode09351
              };
              
              return this.foundVehicle;
            }
            
            // Actualizar lastId para la siguiente página
            if (response.data.result_set && response.data.result_set.lastId) {
              lastId = response.data.result_set.lastId;
            } else {
              // Si no hay result_set, usar el último idLocal del lote
              const lastVehicle = vehicles[vehicles.length - 1];
              lastId = lastVehicle.idLocal;
            }
            
            // Si recibimos menos vehículos que el límite, probablemente es el último lote
            if (vehicles.length < batchSize) {
              console.log(`📄 Último lote detectado (${vehicles.length} < ${batchSize})`);
              break;
            }
            
          } else {
            console.log('❌ No se recibieron vehículos en este lote');
            break;
          }
          
        } catch (batchError) {
          console.log(`⚠️ Error en lote ${batchCount}:`, batchError.message);
          break;
        }
      }
      
      console.log(`📊 Búsqueda completada: ${totalSearched} vehículos revisados en ${batchCount} lotes`);
      return null;
      
    } catch (error) {
      console.error('❌ Error en búsqueda extendida:', error);
      throw error;
    }
  }

  async execute() {
    try {
      await this.initialize();
      
      const vehicleId = 48036;
      console.log(`🔍 Verificando vehículo con ID ${vehicleId}...`);
      
      // Obtener datos del vehículo de la base de datos
      const result = await this.client.query(
        'SELECT id, id_local, marca, modelo, version, anyo, descripcion FROM vehicles WHERE id = $1',
        [vehicleId]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Vehículo con ID ${vehicleId} no encontrado en la base de datos`);
        return;
      }

      const dbVehicle = result.rows[0];
      console.log(`✅ Vehículo en BD - ID Local: ${dbVehicle.id_local}, Descripción: "${dbVehicle.descripcion}"`);
      
      // Verificar si la descripción en BD ya contiene el código
      const hasCodeInDB = dbVehicle.descripcion && 
        (dbVehicle.descripcion.includes('09351') || 
         dbVehicle.descripcion.includes('9351'));
      
      console.log(`🔍 Código 09351 en BD: ${hasCodeInDB ? '✅ SÍ' : '❌ NO'}`);
      
      if (hasCodeInDB) {
        console.log(`\n🎯 CONFIRMACIÓN: El vehículo con ID ${vehicleId} YA contiene el código 09351 en la base de datos`);
        console.log(`   Descripción BD: "${dbVehicle.descripcion}"`);
        
        // Aún buscar en API para confirmación
        console.log(`\n🔍 Buscando en API para confirmar...`);
      }
      
      // Buscar en la API
      const apiVehicle = await this.searchVehicleWithPagination(dbVehicle.id_local);
      
      if (apiVehicle) {
        console.log(`\n📋 RESUMEN FINAL:`);
        console.log(`   Vehículo ID: ${vehicleId}`);
        console.log(`   ID Local API: ${dbVehicle.id_local}`);
        console.log(`   Código 09351 en BD: ${hasCodeInDB ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Código 09351 en API: ${apiVehicle.hasCode09351 ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Descripción BD: "${dbVehicle.descripcion}"`);
        console.log(`   Descripción API: "${apiVehicle.descripcion}"`);
        
        if (hasCodeInDB && apiVehicle.hasCode09351) {
          console.log(`\n🎯 CONFIRMACIÓN COMPLETA: El vehículo contiene el código 09351 en ambos sistemas`);
        } else if (hasCodeInDB || apiVehicle.hasCode09351) {
          console.log(`\n⚠️ DISCREPANCIA: El código 09351 está en un sistema pero no en el otro`);
        } else {
          console.log(`\n❌ RESULTADO: El vehículo NO contiene el código 09351 en ningún sistema`);
        }
      } else {
        console.log(`\n❌ Vehículo no encontrado en la API después de búsqueda extendida`);
        
        if (hasCodeInDB) {
          console.log(`\n🎯 CONFIRMACIÓN PARCIAL: El vehículo contiene el código 09351 en la base de datos`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error ejecutando búsqueda:', error);
    } finally {
      await this.client.end();
    }
  }
}

// Ejecutar el script
async function main() {
  const searcher = new ExtendedVehicleSearcher();
  await searcher.execute();
}

main().catch(console.error);