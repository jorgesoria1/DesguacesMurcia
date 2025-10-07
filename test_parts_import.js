#!/usr/bin/env node

/**
 * Test simple de importación de piezas para identificar el problema
 */

import { neon } from '@neondatabase/serverless';
import axios from 'axios';

const sql = neon(process.env.DATABASE_URL);

async function testPartsImport() {
  try {
    console.log('🧪 Probando importación simple de piezas...\n');

    // 1. Verificar configuración de API
    console.log('1. Verificando configuración de API...');
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

    console.log(`✅ API configurada - Company ID: ${config[0].company_id}`);

    // 2. Probar llamada a la API
    console.log('\n2. Probando llamada a API de MetaSync...');
    
    const testDate = '17/07/2025';
    const testUrl = 'https://apis.metasync.com/Almacen/RecuperarCambiosCanal';
    
    console.log(`📡 URL: ${testUrl}`);
    console.log(`📅 Fecha: ${testDate}`);
    console.log(`🔑 API Key: ${config[0].api_key.substring(0, 20)}...`);

    // Probar método GET con formato correcto
    const response = await axios.get(testUrl, {
      params: {
        fecha: testDate,
        lastid: 0,
        offset: 10,
        canal: 'webcliente MRC',
        idEmpresa: config[0].company_id
      },
      headers: {
        'apikey': config[0].api_key
      },
      timeout: 30000
    });

    console.log(`✅ Respuesta HTTP: ${response.status}`);
    console.log(`📊 Datos recibidos:`, {
      piezas: response.data?.piezas?.length || 0,
      resultSet: !!response.data?.result_set,
      total: response.data?.result_set?.total || 'N/A'
    });

    if (response.data?.piezas?.length > 0) {
      const firstPart = response.data.piezas[0];
      console.log('\n📦 Primera pieza de ejemplo:');
      console.log(`  ID Local: ${firstPart.refLocal || firstPart.RefLocal}`);
      console.log(`  Código: ${firstPart.codArticulo || firstPart.CodArticulo}`);
      console.log(`  Descripción: ${firstPart.descripcionArticulo || firstPart.DescripcionArticulo}`);
      console.log(`  Precio: ${firstPart.precio || firstPart.Precio}`);
      console.log(`  ID Vehículo: ${firstPart.idVehiculo || firstPart.IdVehiculo}`);
    }

    // 3. Probar consulta simple a la base de datos
    console.log('\n3. Probando consulta simple a base de datos...');
    
    const partsCount = await sql`
      SELECT COUNT(*) as total 
      FROM parts 
      WHERE activo = true
    `;
    
    console.log(`✅ Piezas activas en BD: ${partsCount[0].total}`);

    // 4. Probar inserción de prueba
    console.log('\n4. Probando inserción de prueba...');
    
    if (response.data?.piezas?.length > 0) {
      const testPart = response.data.piezas[0];
      
      try {
        const insertResult = await sql`
          INSERT INTO parts (
            ref_local,
            id_empresa,
            cod_articulo,
            descripcion_articulo,
            precio,
            id_vehiculo,
            activo
          ) VALUES (
            ${999999999},
            ${config[0].company_id},
            ${'TEST_CODE'},
            ${'TEST PART - DELETE ME'},
            ${10.00},
            ${-1},
            ${false}
          )
          ON CONFLICT (ref_local) 
          DO UPDATE SET 
            descripcion_articulo = 'TEST UPDATED',
            ultima_sincronizacion = NOW()
          RETURNING id
        `;
        
        console.log(`✅ Inserción exitosa - ID: ${insertResult[0].id}`);
        
        // Limpiar datos de prueba
        await sql`DELETE FROM parts WHERE ref_local = 999999999`;
        console.log('✅ Datos de prueba limpiados');
        
      } catch (insertError) {
        console.error('❌ Error en inserción:', insertError.message);
      }
    }

    console.log('\n✅ Test completado exitosamente');

  } catch (error) {
    console.error('❌ Error en test:', error.message);
    if (error.response) {
      console.error('📡 Respuesta HTTP:', error.response.status);
      console.error('📄 Datos de error:', error.response.data);
    }
  }
}

// Ejecutar test
testPartsImport()
  .then(() => {
    console.log('\n🎯 Test finalizado');
  })
  .catch(console.error);