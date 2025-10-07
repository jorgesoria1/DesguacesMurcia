#!/usr/bin/env node

// Script para analizar la estructura de datos de vehículos en el endpoint de piezas
import fetch from 'node-fetch';

async function analyzeVehicleDataStructure() {
  console.log('🔍 ANALIZANDO ESTRUCTURA DE DATOS DE VEHÍCULOS EN ENDPOINT DE PIEZAS\n');
  
  try {
    const apiKey = process.env.METASYNC_API_KEY;
    if (!apiKey) {
      console.log('❌ Error: METASYNC_API_KEY no está configurada');
      return;
    }

    console.log('📡 Haciendo llamada a API MetaSync...');
    
    const response = await fetch('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'fecha': '2024-01-01 00:00:00',
        'lastid': '0',
        'offset': '100', // Solo 100 para análisis rápido
        'canal': 'desguacesmurcia',
        'idempresa': '1476'
      }
    });

    if (!response.ok) {
      console.log(`❌ Error en API: ${response.status} - ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ Respuesta recibida exitosamente\n');
    
    // Analizar estructura principal
    console.log('📊 ESTRUCTURA PRINCIPAL DE LA RESPUESTA:');
    console.log(`- Piezas encontradas: ${data.piezas ? data.piezas.length : 0}`);
    console.log(`- Vehículos encontrados: ${data.vehiculos ? data.vehiculos.length : 0}`);
    console.log(`- Total count: ${data.totalCount || 'N/A'}`);
    console.log(`- Last ID: ${data.lastId || 'N/A'}\n`);
    
    // Analizar array de vehículos
    if (data.vehiculos && data.vehiculos.length > 0) {
      console.log('🚗 ANÁLISIS DEL ARRAY VEHICULOS:');
      console.log(`Cantidad total de vehículos: ${data.vehiculos.length}\n`);
      
      // Mostrar estructura de los primeros 3 vehículos
      for (let i = 0; i < Math.min(3, data.vehiculos.length); i++) {
        const vehiculo = data.vehiculos[i];
        console.log(`--- VEHÍCULO ${i + 1} ---`);
        console.log(`ID Local: ${vehiculo.idLocal}`);
        console.log(`Código: ${vehiculo.codigo}`);
        console.log(`Marca: ${vehiculo.nombreMarca || vehiculo.codMarca || 'No disponible'}`);
        console.log(`Modelo: ${vehiculo.nombreModelo || vehiculo.codModelo || 'No disponible'}`);
        console.log(`Versión: ${vehiculo.nombreVersion || vehiculo.codVersion || 'No disponible'}`);
        console.log(`Año: ${vehiculo.anyoVehiculo || 'No disponible'}`);
        console.log(`Bastidor: ${vehiculo.bastidor || 'No disponible'}`);
        console.log(`Matrícula: ${vehiculo.matricula || 'No disponible'}`);
        
        // Mostrar todas las propiedades disponibles
        console.log('Propiedades disponibles:', Object.keys(vehiculo).join(', '));
        console.log('');
      }
      
      // Analizar diversidad de marcas en el lote
      const marcas = new Set();
      const modelos = new Set();
      
      data.vehiculos.forEach(v => {
        if (v.nombreMarca) marcas.add(v.nombreMarca);
        if (v.codMarca) marcas.add(v.codMarca);
        if (v.nombreModelo) modelos.add(v.nombreModelo);
        if (v.codModelo) modelos.add(v.codModelo);
      });
      
      console.log('📈 DIVERSIDAD EN EL LOTE:');
      console.log(`Marcas únicas encontradas: ${marcas.size}`);
      console.log(`Modelos únicos encontrados: ${modelos.size}`);
      console.log(`Marcas: ${Array.from(marcas).slice(0, 10).join(', ')}${marcas.size > 10 ? '...' : ''}`);
      console.log('');
    }
    
    // Analizar algunas piezas procesadas
    if (data.piezas && data.piezas.length > 0) {
      console.log('🔧 ANÁLISIS DE PIEZAS PROCESADAS (ID NEGATIVO):');
      
      const piezasProcesadas = data.piezas.filter(p => p.idVehiculo < 0);
      console.log(`Piezas procesadas en este lote: ${piezasProcesadas.length}/${data.piezas.length}\n`);
      
      if (piezasProcesadas.length > 0) {
        for (let i = 0; i < Math.min(5, piezasProcesadas.length); i++) {
          const pieza = piezasProcesadas[i];
          console.log(`--- PIEZA PROCESADA ${i + 1} ---`);
          console.log(`ID: ${pieza.refLocal}`);
          console.log(`ID Vehículo: ${pieza.idVehiculo}`);
          console.log(`Descripción: ${pieza.descripcionArticulo}`);
          console.log(`Familia: ${pieza.descripcionFamilia}`);
          console.log(`Código Familia: ${pieza.codFamilia}`);
          console.log(`Precio: ${pieza.precio}`);
          
          // Buscar vehículo correlacionado en el array
          const vehiculoCorrelacionado = data.vehiculos?.find(v => v.idLocal === Math.abs(pieza.idVehiculo));
          if (vehiculoCorrelacionado) {
            console.log(`✅ VEHÍCULO CORRELACIONADO ENCONTRADO:`);
            console.log(`  - Marca: ${vehiculoCorrelacionado.nombreMarca || vehiculoCorrelacionado.codMarca}`);
            console.log(`  - Modelo: ${vehiculoCorrelacionado.nombreModelo || vehiculoCorrelacionado.codModelo}`);
            console.log(`  - Versión: ${vehiculoCorrelacionado.nombreVersion || vehiculoCorrelacionado.codVersion}`);
          } else {
            console.log(`❌ No se encontró vehículo correlacionado para ID ${Math.abs(pieza.idVehiculo)}`);
          }
          console.log('');
        }
      }
    }
    
    // Resumen de hallazgos
    console.log('📋 RESUMEN DE HALLAZGOS:');
    console.log('1. ¿Viene array de vehículos?', data.vehiculos ? '✅ SÍ' : '❌ NO');
    console.log('2. ¿Datos completos de marca/modelo?', data.vehiculos && data.vehiculos.some(v => v.nombreMarca && v.nombreModelo) ? '✅ SÍ' : '❌ NO');
    console.log('3. ¿Hay piezas procesadas?', data.piezas && data.piezas.some(p => p.idVehiculo < 0) ? '✅ SÍ' : '❌ NO');
    console.log('4. ¿Es posible correlación?', data.vehiculos && data.piezas ? '✅ SÍ' : '❌ NO');
    
  } catch (error) {
    console.error('❌ Error al analizar estructura:', error.message);
  }
}

analyzeVehicleDataStructure();