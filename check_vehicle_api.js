/**
 * Script para verificar un vehículo específico en la API de MetaSync
 * Buscará el vehículo con ID 48036 para verificar si su código es 09351
 */

import pkg from 'pg';
const { Client } = pkg;
import axios from 'axios';

// Configuración de la base de datos
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

class VehicleApiChecker {
  constructor() {
    this.client = new Client({ connectionString: DATABASE_URL });
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

  async checkVehicleInDatabase(vehicleId) {
    try {
      const result = await this.client.query(
        'SELECT id, id_local, marca, modelo, version, anyo, descripcion FROM vehicles WHERE id = $1',
        [vehicleId]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Vehículo con ID ${vehicleId} no encontrado en la base de datos`);
        return null;
      }

      const vehicle = result.rows[0];
      console.log(`✅ Vehículo encontrado en BD:`);
      console.log(`   ID interno: ${vehicle.id}`);
      console.log(`   ID Local (API): ${vehicle.id_local}`);
      console.log(`   Marca: ${vehicle.marca}`);
      console.log(`   Modelo: ${vehicle.modelo}`);
      console.log(`   Version: ${vehicle.version}`);
      console.log(`   Año: ${vehicle.anyo}`);
      console.log(`   Descripción: ${vehicle.descripcion}`);

      return vehicle;
    } catch (error) {
      console.error('❌ Error consultando vehículo en BD:', error);
      throw error;
    }
  }

  async searchVehicleInApi(idLocal) {
    try {
      console.log(`🔍 Buscando vehículo con idLocal ${idLocal} en la API...`);
      
      // Intentar diferentes endpoints de la API
      const endpoints = [
        'RecuperarCambiosVehiculosCanal',
        'RecuperarCambiosCanalEmpresa'
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`📡 Probando endpoint: ${endpoint}`);
          
          const response = await axios.get(`https://apis.metasync.com/Almacen/${endpoint}`, {
            headers: {
              'apikey': this.apiConfig.api_key,
              'fecha': this.formatDate(new Date('2024-01-01')),
              'lastid': '0',
              'offset': '10000' // Búsqueda amplia
            }
          });

          if (response.data && response.data.vehiculos) {
            console.log(`✅ ${endpoint} devolvió ${response.data.vehiculos.length} vehículos`);
            
            // Buscar el vehículo específico
            const targetVehicle = response.data.vehiculos.find(v => v.idLocal === idLocal);
            
            if (targetVehicle) {
              console.log(`🎯 ¡Vehículo encontrado en API!`);
              console.log(`   idLocal: ${targetVehicle.idLocal}`);
              console.log(`   Descripción: ${targetVehicle.descripcion}`);
              console.log(`   Marca: ${targetVehicle.nombreMarca}`);
              console.log(`   Modelo: ${targetVehicle.nombreModelo}`);
              console.log(`   Version: ${targetVehicle.nombreVersion}`);
              console.log(`   Año: ${targetVehicle.anyoVehiculo}`);
              
              // Verificar si tiene código 09351
              const hasCode09351 = targetVehicle.descripcion && 
                (targetVehicle.descripcion.includes('09351') || 
                 targetVehicle.descripcion.includes('9351'));
              
              console.log(`🔍 ¿Contiene código 09351? ${hasCode09351 ? '✅ SÍ' : '❌ NO'}`);
              
              if (hasCode09351) {
                console.log(`✨ CONFIRMADO: El vehículo contiene el código 09351`);
              } else {
                console.log(`⚠️ El vehículo NO contiene el código 09351`);
                console.log(`   Descripción completa: ${targetVehicle.descripcion}`);
              }
              
              return targetVehicle;
            }
          }
        } catch (apiError) {
          console.log(`⚠️ Error en ${endpoint}:`, apiError.message);
          continue;
        }
      }

      console.log(`❌ Vehículo con idLocal ${idLocal} no encontrado en ningún endpoint`);
      return null;
      
    } catch (error) {
      console.error('❌ Error buscando vehículo en API:', error);
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

  async execute() {
    try {
      await this.initialize();
      
      const vehicleId = 48036;
      console.log(`🔍 Verificando vehículo con ID ${vehicleId}...`);
      
      // 1. Buscar en la base de datos
      const dbVehicle = await this.checkVehicleInDatabase(vehicleId);
      
      if (!dbVehicle) {
        console.log('❌ No se puede continuar sin datos del vehículo');
        return;
      }

      // 2. Buscar en la API usando el idLocal
      const apiVehicle = await this.searchVehicleInApi(dbVehicle.id_local);
      
      if (apiVehicle) {
        console.log('\n📋 RESUMEN:');
        console.log(`   Vehículo ID: ${vehicleId}`);
        console.log(`   ID Local API: ${dbVehicle.id_local}`);
        console.log(`   Encontrado en API: ✅ SÍ`);
        
        const hasCode = apiVehicle.descripcion && 
          (apiVehicle.descripcion.includes('09351') || 
           apiVehicle.descripcion.includes('9351'));
        
        console.log(`   Código 09351: ${hasCode ? '✅ SÍ' : '❌ NO'}`);
        
        if (hasCode) {
          console.log(`\n🎯 CONFIRMACIÓN: El vehículo con ID ${vehicleId} SÍ contiene el código 09351`);
        } else {
          console.log(`\n⚠️ RESULTADO: El vehículo con ID ${vehicleId} NO contiene el código 09351`);
        }
      } else {
        console.log('\n❌ No se pudo verificar el vehículo en la API');
      }
      
    } catch (error) {
      console.error('❌ Error ejecutando verificación:', error);
    } finally {
      await this.client.end();
    }
  }
}

// Ejecutar el script
async function main() {
  const checker = new VehicleApiChecker();
  await checker.execute();
}

main().catch(console.error);