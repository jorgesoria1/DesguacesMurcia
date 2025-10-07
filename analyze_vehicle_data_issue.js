#!/usr/bin/env node

// Script para analizar específicamente el problema de datos de vehículos
import fetch from 'node-fetch';

async function analyzeVehicleDataIssue() {
  console.log('🔍 ANÁLISIS DEL PROBLEMA DE DATOS DE VEHÍCULOS\n');
  
  try {
    const apiKey = process.env.METASYNC_API_KEY;
    if (!apiKey) {
      console.log('❌ Error: METASYNC_API_KEY no está configurada');
      return;
    }

    console.log('📡 Descargando muestra del API...');
    
    const response = await fetch('https://apis.metasync.com/Almacen/RecuperarCambiosCanal', {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'fecha': '2024-01-01 00:00:00',
        'lastid': '0',
        'offset': '1000', // Muestra más grande
        'canal': 'desguacesmurcia',
        'idempresa': '1476'
      }
    });

    if (!response.ok) {
      console.log(`❌ Error en API: ${response.status} - ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ Datos descargados exitosamente\n');
    
    // Analizar específicamente vehículos procesados
    const vehiculosProcesados = data.vehiculos?.filter(v => v.idLocal < 0) || [];
    const vehiculosFisicos = data.vehiculos?.filter(v => v.idLocal > 0) || [];
    
    console.log('📊 ANÁLISIS DE VEHÍCULOS EN EL LOTE:');
    console.log(`Total vehículos: ${data.vehiculos?.length || 0}`);
    console.log(`Vehículos físicos (ID > 0): ${vehiculosFisicos.length}`);
    console.log(`Vehículos procesados (ID < 0): ${vehiculosProcesados.length}\n`);
    
    // Analizar calidad de datos en vehículos procesados
    let procesadosConDatos = 0;
    let procesadosSinDatos = 0;
    
    console.log('🔧 ANÁLISIS DE CALIDAD DE DATOS EN VEHÍCULOS PROCESADOS:');
    
    vehiculosProcesados.forEach((v, index) => {
      const tieneMarca = v.nombreMarca && v.nombreMarca.trim() !== '';
      const tieneModelo = v.nombreModelo && v.nombreModelo.trim() !== '';
      
      if (tieneMarca && tieneModelo) {
        procesadosConDatos++;
        if (index < 5) { // Mostrar primeros 5 con datos
          console.log(`  ✅ ID ${v.idLocal}: ${v.nombreMarca} ${v.nombreModelo} ${v.nombreVersion || ''}`);
        }
      } else {
        procesadosSinDatos++;
        if (index < 5 && procesadosConDatos === 0) { // Mostrar primeros 5 sin datos
          console.log(`  ❌ ID ${v.idLocal}: [${v.nombreMarca || 'Sin marca'}] [${v.nombreModelo || 'Sin modelo'}] [${v.nombreVersion || 'Sin versión'}]`);
        }
      }
    });
    
    console.log(`\n📈 ESTADÍSTICAS DE VEHÍCULOS PROCESADOS:`);
    console.log(`Con datos completos: ${procesadosConDatos}/${vehiculosProcesados.length} (${((procesadosConDatos/vehiculosProcesados.length)*100).toFixed(1)}%)`);
    console.log(`Sin datos: ${procesadosSinDatos}/${vehiculosProcesados.length} (${((procesadosSinDatos/vehiculosProcesados.length)*100).toFixed(1)}%)\n`);
    
    // Analizar vehículos físicos para comparación
    let fisicosConDatos = 0;
    let fisicosSinDatos = 0;
    
    vehiculosFisicos.forEach(v => {
      const tieneMarca = v.nombreMarca && v.nombreMarca.trim() !== '';
      const tieneModelo = v.nombreModelo && v.nombreModelo.trim() !== '';
      
      if (tieneMarca && tieneModelo) {
        fisicosConDatos++;
      } else {
        fisicosSinDatos++;
      }
    });
    
    console.log('🚗 COMPARACIÓN CON VEHÍCULOS FÍSICOS:');
    console.log(`Físicos con datos: ${fisicosConDatos}/${vehiculosFisicos.length} (${vehiculosFisicos.length > 0 ? ((fisicosConDatos/vehiculosFisicos.length)*100).toFixed(1) : 0}%)`);
    console.log(`Físicos sin datos: ${fisicosSinDatos}/${vehiculosFisicos.length} (${vehiculosFisicos.length > 0 ? ((fisicosSinDatos/vehiculosFisicos.length)*100).toFixed(1) : 0}%)\n`);
    
    // Analizar piezas procesadas específicas
    const piezasProcesadas = data.piezas?.filter(p => p.idVehiculo < 0) || [];
    console.log('🔧 ANÁLISIS DE CORRELACIÓN DE PIEZAS PROCESADAS:');
    console.log(`Total piezas procesadas en lote: ${piezasProcesadas.length}\n`);
    
    let correlacionExitosa = 0;
    let correlacionFallida = 0;
    
    piezasProcesadas.slice(0, 10).forEach(pieza => {
      const vehiculoCorrelacionado = vehiculosProcesados.find(v => v.idLocal === pieza.idVehiculo);
      
      if (vehiculoCorrelacionado) {
        const tieneDatos = vehiculoCorrelacionado.nombreMarca && vehiculoCorrelacionado.nombreModelo;
        if (tieneDatos) {
          correlacionExitosa++;
          console.log(`  ✅ Pieza ${pieza.refLocal} → Vehículo ${pieza.idVehiculo}: ${vehiculoCorrelacionado.nombreMarca} ${vehiculoCorrelacionado.nombreModelo}`);
        } else {
          correlacionFallida++;
          console.log(`  ❌ Pieza ${pieza.refLocal} → Vehículo ${pieza.idVehiculo}: [Sin datos de marca/modelo]`);
        }
      } else {
        correlacionFallida++;
        console.log(`  ❌ Pieza ${pieza.refLocal} → Vehículo ${pieza.idVehiculo}: [No encontrado en array]`);
      }
    });
    
    console.log(`\n📊 RESUMEN DE CORRELACIÓN (muestra de 10):`);
    console.log(`Correlación exitosa: ${correlacionExitosa}/10`);
    console.log(`Correlación fallida: ${correlacionFallida}/10`);
    
    // Conclusiones
    console.log('\n🎯 CONCLUSIONES:');
    console.log('1. ¿El array de vehículos incluye procesados?', vehiculosProcesados.length > 0 ? '✅ SÍ' : '❌ NO');
    console.log('2. ¿Los vehículos procesados tienen datos completos?', 
      procesadosConDatos > procesadosSinDatos ? '✅ MAYORÍA SÍ' : 
      procesadosConDatos > 0 ? '⚡ ALGUNOS SÍ' : '❌ NO');
    console.log('3. ¿La correlación es posible?', vehiculosProcesados.length > 0 ? '✅ SÍ' : '❌ NO');
    console.log('4. ¿Necesitamos pattern matching como fallback?', 
      procesadosSinDatos > 0 ? '✅ SÍ, ESENCIAL' : '❌ NO NECESARIO');
    
  } catch (error) {
    console.error('❌ Error al analizar:', error.message);
  }
}

analyzeVehicleDataIssue();