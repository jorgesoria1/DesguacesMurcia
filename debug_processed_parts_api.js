import axios from 'axios';
import fs from 'fs';

console.log('🔍 Investigando datos de la API MetaSync para piezas procesadas...\n');

async function investigateProcessedPartsAPI() {
  try {
    // Verificar la configuración de la API
    console.log('📋 Verificando configuración de API...');
    
    const response = await axios.get('http://localhost:5000/api/metasync-optimized/import/parts', {
      params: {
        batchSize: 10,
        fullImport: false,
        debug: true
      }
    });
    
    console.log('✅ Respuesta de importación:', response.data);
    
    // Ahora revisar qué piezas se importaron
    const query = `
      SELECT 
        ref_local,
        id_vehiculo,
        vehicle_marca,
        vehicle_modelo,
        vehicle_version,
        descripcion_familia,
        cod_familia,
        precio,
        CASE 
          WHEN id_vehiculo > 0 THEN 'VEHICULO_ASOCIADO'
          WHEN id_vehiculo < 0 THEN 'VEHICULO_PROCESADO'
          ELSE 'SIN_VEHICULO'
        END as tipo_vehiculo,
        CASE 
          WHEN vehicle_marca IS NULL OR vehicle_marca = '' THEN 'SIN_DATOS_VEHICULO'
          WHEN vehicle_marca IN ('ELECTRICIDAD', 'CARROCERÍA TRASERA', 'INTERIOR', 'SUSPENSIÓN / FRENOS') THEN 'DATOS_INCORRECTOS'
          ELSE 'DATOS_CORRECTOS'
        END as estado_datos
      FROM parts 
      WHERE fecha_creacion > NOW() - INTERVAL '5 minutes'
      ORDER BY fecha_creacion DESC
      LIMIT 15;
    `;
    
    console.log('\n📊 Consultando piezas recién importadas...');
    
    const dbResponse = await axios.post('http://localhost:5000/api/execute-sql', {
      query: query
    });
    
    console.log('✅ Piezas importadas recientemente:');
    console.table(dbResponse.data.results);
    
    // Analizar estadísticas
    const results = dbResponse.data.results;
    const procesadas = results.filter(r => r.tipo_vehiculo === 'VEHICULO_PROCESADO');
    const conDatos = procesadas.filter(r => r.estado_datos === 'DATOS_CORRECTOS');
    const sinDatos = procesadas.filter(r => r.estado_datos === 'SIN_DATOS_VEHICULO');
    
    console.log('\n📈 ESTADÍSTICAS DE PIEZAS PROCESADAS:');
    console.log(`- Total procesadas: ${procesadas.length}`);
    console.log(`- Con datos correctos: ${conDatos.length} (${((conDatos.length/procesadas.length)*100).toFixed(1)}%)`);
    console.log(`- Sin datos de vehículo: ${sinDatos.length} (${((sinDatos.length/procesadas.length)*100).toFixed(1)}%)`);
    
    // Mostrar ejemplos
    if (conDatos.length > 0) {
      console.log('\n✅ EJEMPLO con datos correctos:');
      console.log(conDatos[0]);
    }
    
    if (sinDatos.length > 0) {
      console.log('\n❌ EJEMPLO sin datos de vehículo:');
      console.log(sinDatos[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📄 Respuesta del servidor:', error.response.data);
    }
  }
}

// Ejecutar la investigación
investigateProcessedPartsAPI();