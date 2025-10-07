#!/usr/bin/env node

/**
 * Test de endpoints conocidos que funcionan para verificar conectividad
 */

import { neon } from '@neondatabase/serverless';
import axios from 'axios';

const sql = neon(process.env.DATABASE_URL);

async function testWorkingEndpoints() {
  try {
    console.log('🔧 Probando endpoints conocidos que funcionan...\n');

    // 1. Obtener configuración
    const config = await sql`
      SELECT api_key, company_id, active 
      FROM api_config 
      WHERE active = true 
      LIMIT 1
    `;

    if (config.length === 0) {
      console.log('❌ No hay configuración de API activa');
      return;
    }

    const apiKey = config[0].api_key;
    const companyId = config[0].company_id;
    
    console.log(`✅ API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`✅ Company ID: ${companyId}\n`);

    // 2. Probar endpoints básicos que deberían funcionar
    const baseUrl = 'https://apis.metasync.com';
    
    const endpoints = [
      // Endpoint de vehículos que debería funcionar
      {
        name: 'Vehículos',
        url: `${baseUrl}/VehiculosCanal/RecuperarCambiosVehiculosCanal`,
        method: 'POST',
        data: {
          fecha: '01/01/2024',
          lastid: 0,
          offset: 5,
          canal: 'webcliente MRC',
          idEmpresa: companyId
        }
      },
      // Endpoint de autenticación/health check
      {
        name: 'Health Check',
        url: `${baseUrl}/health`,
        method: 'GET'
      },
      // Endpoint de inventario con POST (formato anterior)
      {
        name: 'Inventario POST (anterior)',
        url: `${baseUrl}/Almacen/RecuperarCambiosCanal`,
        method: 'POST',
        data: {
          fecha: '01/01/2024',
          lastid: 0,
          offset: 5,
          canal: 'webcliente MRC',
          idEmpresa: companyId
        }
      }
    ];

    for (const endpoint of endpoints) {
      console.log(`\n🔍 Probando: ${endpoint.name}`);
      console.log(`📡 ${endpoint.method} ${endpoint.url}`);
      
      try {
        let response;
        
        if (endpoint.method === 'GET') {
          response = await axios.get(endpoint.url, {
            headers: {
              'apikey': apiKey
            },
            timeout: 15000
          });
        } else {
          response = await axios.post(endpoint.url, endpoint.data, {
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });
        }
        
        console.log(`✅ ÉXITO! Status: ${response.status}`);
        console.log(`📊 Respuesta:`, {
          hasData: !!response.data,
          dataType: typeof response.data,
          keys: typeof response.data === 'object' ? Object.keys(response.data || {}) : [],
          dataLength: response.data?.length || 'N/A'
        });
        
        // Si hay datos, mostrar sample
        if (response.data && typeof response.data === 'object') {
          console.log(`📝 Sample data:`, JSON.stringify(response.data).substring(0, 200) + '...');
        }
        
      } catch (error) {
        const status = error.response?.status || 'NETWORK';
        const message = error.response?.data || error.message;
        
        if (status !== 'NETWORK') {
          console.log(`❌ Error ${status}`);
          if (typeof message === 'object') {
            console.log(`📄 Details:`, JSON.stringify(message).substring(0, 200));
          } else {
            console.log(`📄 Message:`, message.substring(0, 100));
          }
        } else {
          console.log(`❌ Error de red: ${error.message}`);
        }
      }
    }

    console.log('\n🔧 Test de conectividad completado');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar test
testWorkingEndpoints()
  .then(() => console.log('\n✅ Proceso finalizado'))
  .catch(console.error);