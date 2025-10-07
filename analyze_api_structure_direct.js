#!/usr/bin/env node

// Script para analizar la estructura real del API y extraer datos que ya vienen separados
import fetch from 'node-fetch';

async function analyzeApiStructureDirect() {
  console.log('🔍 ANALIZANDO ESTRUCTURA REAL DEL API METASYNC\n');
  
  try {
    const apiKey = process.env.METASYNC_API_KEY;
    if (!apiKey) {
      console.error('❌ METASYNC_API_KEY no encontrada');
      return;
    }

    // Endpoint de piezas que según el usuario contiene datos separados de piezas y vehículos
    const url = 'https://live.metasync.es/Api/Almacen/RecuperarCambiosCanal';
    
    console.log('📡 Llamando al endpoint de piezas...');
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'fecha': '2025-01-01',
        'lastid': '0',
        'offset': '0',
        'canal': 'Web',
        'idempresa': '1'
      }
    });

    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ Respuesta recibida del API');
    
    // Analizar la estructura completa
    console.log('\n📋 ESTRUCTURA COMPLETA DE LA RESPUESTA:');
    console.log('Claves principales:', Object.keys(data));
    
    // Buscar datos de vehículos separados
    if (data.vehiculos) {
      console.log('\n🚗 DATOS DE VEHÍCULOS ENCONTRADOS:');
      console.log(`Total vehículos: ${data.vehiculos.length}`);
      
      // Mostrar primeros 5 vehículos completos
      console.log('\nPrimeros 5 vehículos (estructura completa):');
      data.vehiculos.slice(0, 5).forEach((vehiculo, index) => {
        console.log(`\n--- Vehículo ${index + 1} ---`);
        console.log(JSON.stringify(vehiculo, null, 2));
      });
    }
    
    // Buscar datos de piezas
    if (data.articulos || data.parts || data.piezas) {
      const piezas = data.articulos || data.parts || data.piezas;
      console.log('\n🔧 DATOS DE PIEZAS ENCONTRADOS:');
      console.log(`Total piezas: ${piezas.length}`);
      
      // Mostrar primeras 3 piezas completas
      console.log('\nPrimeras 3 piezas (estructura completa):');
      piezas.slice(0, 3).forEach((pieza, index) => {
        console.log(`\n--- Pieza ${index + 1} ---`);
        console.log(JSON.stringify(pieza, null, 2));
      });
    }
    
    // Buscar específicamente datos relacionados con vehículos procesados
    console.log('\n🔍 BUSCANDO RELACIONES VEHÍCULO-PIEZA:');
    
    if (data.vehiculos && (data.articulos || data.parts || data.piezas)) {
      const vehiculos = data.vehiculos;
      const piezas = data.articulos || data.parts || data.piezas;
      
      // Buscar vehículos con ID negativo (procesados)
      const vehiculosProcesados = vehiculos.filter(v => v.id && v.id < 0);
      console.log(`Vehículos procesados (ID negativo): ${vehiculosProcesados.length}`);
      
      if (vehiculosProcesados.length > 0) {
        console.log('\nPrimeros 3 vehículos procesados:');
        vehiculosProcesados.slice(0, 3).forEach((vehiculo, index) => {
          console.log(`\n--- Vehículo Procesado ${index + 1} ---`);
          console.log(`ID: ${vehiculo.id}`);
          console.log(`ID Local: ${vehiculo.idLocal || vehiculo.id_local || 'No disponible'}`);
          console.log(`Marca: ${vehiculo.marca || 'No disponible'}`);
          console.log(`Modelo: ${vehiculo.modelo || 'No disponible'}`);
          console.log(`Versión: ${vehiculo.version || 'No disponible'}`);
          console.log('Estructura completa:', JSON.stringify(vehiculo, null, 2));
        });
      }
      
      // Buscar piezas que referencien vehículos procesados
      const piezasProcesadas = piezas.filter(p => p.idVehiculo && p.idVehiculo < 0);
      console.log(`\nPiezas de vehículos procesados: ${piezasProcesadas.length}`);
      
      if (piezasProcesadas.length > 0) {
        console.log('\nPrimeras 3 piezas procesadas:');
        piezasProcesadas.slice(0, 3).forEach((pieza, index) => {
          console.log(`\n--- Pieza Procesada ${index + 1} ---`);
          console.log(`ID Vehículo: ${pieza.idVehiculo}`);
          console.log(`Ref Local: ${pieza.refLocal || pieza.ref_local || 'No disponible'}`);
          console.log(`Descripción: ${pieza.descripcionArticulo || pieza.descripcion || 'No disponible'}`);
          console.log('Estructura completa:', JSON.stringify(pieza, null, 2));
        });
      }
    }
    
    console.log('\n🎯 RESUMEN DEL ANÁLISIS:');
    console.log('Esta información muestra exactamente cómo extraer');
    console.log('los datos de vehículos que ya vienen separados en el API.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeApiStructureDirect();