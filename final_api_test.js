#!/usr/bin/env node

/**
 * Test final con diferentes formatos de headers y parámetros
 */

import { neon } from '@neondatabase/serverless';
import axios from 'axios';

const sql = neon(process.env.DATABASE_URL);

async function finalAPITest() {
  try {
    console.log('🎯 Test final de API MetaSync con diferentes formatos...\n');

    const config = await sql`
      SELECT api_key, company_id 
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
    
    const url = 'https://apis.metasync.com/Almacen/RecuperarCambiosCanal';
    
    // Probar diferentes formatos
    const testConfigs = [
      {
        name: 'Headers + Query params',
        config: {
          method: 'get',
          url: url,
          params: {
            fecha: '17/07/2025',
            lastid: 0,
            offset: 5
          },
          headers: {
            'apikey': apiKey,
            'canal': 'webcliente MRC',
            'idempresa': companyId.toString()
          }
        }
      },
      {
        name: 'Solo Headers',
        config: {
          method: 'get',
          url: url,
          headers: {
            'apikey': apiKey,
            'fecha': '17/07/2025',
            'lastid': '0',
            'offset': '5',
            'canal': 'webcliente MRC',
            'idempresa': companyId.toString()
          }
        }
      },
      {
        name: 'URL Query String',
        config: {
          method: 'get',
          url: url + '?fecha=17/07/2025&lastid=0&offset=5&canal=webcliente%20MRC&idempresa=' + companyId,
          headers: {
            'apikey': apiKey
          }
        }
      },
      {
        name: 'Form Data',
        config: {
          method: 'post',
          url: url,
          data: new URLSearchParams({
            fecha: '17/07/2025',
            lastid: '0',
            offset: '5',
            canal: 'webcliente MRC',
            idempresa: companyId.toString()
          }),
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      }
    ];

    for (const test of testConfigs) {
      console.log(`\n🔍 Probando: ${test.name}`);
      
      try {
        const response = await axios(test.config);
        
        console.log(`✅ ÉXITO! Status: ${response.status}`);
        console.log(`📊 Datos:`, {
          hasData: !!response.data,
          piezas: response.data?.piezas?.length || 0,
          keys: Object.keys(response.data || {})
        });
        
        if (response.data?.piezas?.length > 0) {
          console.log('🎯 CONFIGURACIÓN FUNCIONAL ENCONTRADA!');
          console.log('📋 Configuración exitosa:', JSON.stringify(test.config, null, 2));
          return test;
        }
        
      } catch (error) {
        const status = error.response?.status || 'RED';
        const message = error.response?.data || error.message;
        console.log(`❌ Error ${status}: ${JSON.stringify(message).substring(0, 150)}...`);
      }
    }

    console.log('\n❌ Ninguna configuración funcionó');
    return null;
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

finalAPITest()
  .then((result) => {
    if (result) {
      console.log('\n🎯 SOLUCIÓN ENCONTRADA!');
    } else {
      console.log('\n⚠️ La API de MetaSync no responde con ningún formato probado');
      console.log('📞 Se recomienda contactar soporte técnico de MetaSync');
    }
  })
  .catch(console.error);