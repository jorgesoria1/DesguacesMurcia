#!/usr/bin/env node

// Script para verificar mejoras en pattern matching para piezas específicas
import { db } from './server/db.js';
import { parts } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testPatternMatchingImprovements() {
  console.log('🔧 VERIFICANDO MEJORAS EN PATTERN MATCHING\n');
  
  try {
    // Piezas específicas de la imagen del usuario
    const referenciasPrueba = ['751782', '805372', '994087'];
    
    console.log('📋 Verificando piezas específicas de la imagen:');
    
    for (const refLocal of referenciasPrueba) {
      const [pieza] = await db
        .select()
        .from(parts)
        .where(eq(parts.refLocal, refLocal))
        .limit(1);
      
      if (pieza) {
        console.log(`\n--- Pieza ${refLocal} ---`);
        console.log(`Descripción: ${pieza.descripcionArticulo}`);
        console.log(`Familia: ${pieza.descripcionFamilia}`);
        console.log(`Código Familia: ${pieza.codFamilia}`);
        console.log(`Marca actual: ${pieza.vehicleMarca || 'N/A'}`);
        console.log(`Modelo actual: ${pieza.vehicleModelo || 'N/A'}`);
        console.log(`ID Vehículo: ${pieza.idVehiculo}`);
        
        // Simular el pattern matching mejorado
        const resultado = simularPatternMatching(pieza);
        console.log(`Pattern matching mejorado: ${resultado.marca} ${resultado.modelo}`);
        console.log(`Estado: ${resultado.marca ? '✅ ÉXITO' : '❌ FALLO'}`);
      } else {
        console.log(`❌ Pieza ${refLocal} no encontrada`);
      }
    }
    
    // Verificar estadísticas de mejora general
    console.log('\n📊 ANÁLISIS DE MEJORAS GENERALES:');
    
    const piezasSinDatos = await db
      .select()
      .from(parts)
      .where(eq(parts.idVehiculo, -1240407414)) // ID específico de la pieza sin datos
      .limit(10);
    
    console.log(`\nPiezas con ID vehículo ${-1240407414} (ejemplo sin datos):`);
    
    let exitos = 0;
    let fallos = 0;
    
    for (const pieza of piezasSinDatos) {
      const resultado = simularPatternMatching(pieza);
      if (resultado.marca) {
        exitos++;
        console.log(`  ✅ ${pieza.refLocal}: ${resultado.marca} ${resultado.modelo}`);
      } else {
        fallos++;
        console.log(`  ❌ ${pieza.refLocal}: Sin datos`);
      }
    }
    
    console.log(`\n📈 Resultados del pattern matching mejorado:`);
    console.log(`Éxitos: ${exitos}/${exitos + fallos} (${((exitos/(exitos + fallos))*100).toFixed(1)}%)`);
    console.log(`Fallos: ${fallos}/${exitos + fallos} (${((fallos/(exitos + fallos))*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

function simularPatternMatching(pieza) {
  // Simular la lógica de pattern matching mejorado
  const descripcionArticulo = pieza.descripcionArticulo || '';
  const descripcionFamilia = pieza.descripcionFamilia || '';
  const codFamilia = pieza.codFamilia || '';
  
  const textoCompleto = `${descripcionFamilia} ${descripcionArticulo}`.toUpperCase();
  
  // Lista de marcas con variaciones
  const marcasYVariaciones = {
    'AUDI': ['AUDI'],
    'BMW': ['BMW'],
    'CITROEN': ['CITROEN', 'CITROËN'],
    'FIAT': ['FIAT'],
    'FORD': ['FORD'],
    'HONDA': ['HONDA'],
    'HYUNDAI': ['HYUNDAI'],
    'KIA': ['KIA'],
    'MERCEDES': ['MERCEDES', 'MERCEDES-BENZ', 'MERCEDESBENZ'],
    'NISSAN': ['NISSAN'],
    'OPEL': ['OPEL'],
    'PEUGEOT': ['PEUGEOT'],
    'RENAULT': ['RENAULT'],
    'SEAT': ['SEAT'],
    'SKODA': ['SKODA', 'ŠKODA'],
    'SUZUKI': ['SUZUKI'],
    'TOYOTA': ['TOYOTA'],
    'VOLKSWAGEN': ['VOLKSWAGEN', 'VW'],
    'VOLVO': ['VOLVO'],
    'CHEVROLET': ['CHEVROLET'],
    'SSANGYONG': ['SSANGYONG'],
    'MITSUBISHI': ['MITSUBISHI'],
    'MAZDA': ['MAZDA'],
    'SUBARU': ['SUBARU'],
    'ISUZU': ['ISUZU'],
    'DACIA': ['DACIA'],
    'LANCIA': ['LANCIA'],
    'ALFA': ['ALFA', 'ALFA ROMEO'],
    'JEEP': ['JEEP'],
    'CHRYSLER': ['CHRYSLER'],
    'DODGE': ['DODGE'],
    'MINI': ['MINI'],
    'SMART': ['SMART'],
    'PORSCHE': ['PORSCHE'],
    'JAGUAR': ['JAGUAR'],
    'LAND': ['LAND ROVER', 'LANDROVER'],
    'LEXUS': ['LEXUS'],
    'INFINITI': ['INFINITI'],
    'ACURA': ['ACURA']
  };
  
  let vehicleMarca = '';
  let vehicleModelo = '';
  
  // Buscar marca usando todas las variaciones
  let marcaEncontrada = false;
  for (const [marcaEstandar, variaciones] of Object.entries(marcasYVariaciones)) {
    for (const variacion of variaciones) {
      if (textoCompleto.includes(variacion)) {
        vehicleMarca = marcaEstandar;
        marcaEncontrada = true;
        
        // Intentar extraer modelo
        const regex = new RegExp(`${variacion}\\s+([A-Z0-9\\s\\-\\.]+)`, 'i');
        const match = textoCompleto.match(regex);
        if (match && match[1]) {
          const modeloPotencial = match[1].trim().split(' ').slice(0, 3).join(' ');
          if (modeloPotencial && modeloPotencial.length > 1) {
            vehicleModelo = modeloPotencial;
          }
        }
        break;
      }
    }
    if (marcaEncontrada) break;
  }
  
  // Fallbacks si no se encontró marca
  if (!vehicleMarca) {
    if (descripcionFamilia && descripcionFamilia.length > 3) {
      const familiaUpper = descripcionFamilia.toUpperCase();
      const invalidFamilias = ['GENERICO', 'ELECTRICIDAD', 'CARROCERÍA', 'INTERIOR', 'SUSPENSIÓN', 'FRENOS', 'DIRECCIÓN', 'TRANSMISIÓN', 'MOTOR', 'ADMISIÓN', 'ESCAPE', 'ALUMBRADO', 'CLIMATIZACIÓN', 'ACCESORIOS', 'CAMBIO', 'EMBRAGUE', 'COMBUSTIBLE', 'ACEITE', 'REFRIGERACIÓN'];
      
      const esGenerico = invalidFamilias.some(invalid => familiaUpper.includes(invalid));
      
      if (!esGenerico) {
        const partes = descripcionFamilia.split(' ').filter(p => p.length > 1);
        if (partes.length >= 2) {
          vehicleMarca = partes[0];
          vehicleModelo = partes.slice(1).join(' ');
        } else if (partes.length === 1 && partes[0].length > 3) {
          vehicleMarca = partes[0];
        }
      }
    }
    
    if (!vehicleMarca && codFamilia && codFamilia.length > 1 && !/^\d+$/.test(codFamilia)) {
      const codFamiliaUpper = codFamilia.toUpperCase();
      const invalidCodes = ['GEN', 'GENERAL', 'SIN', 'NO', 'NA', 'NULL'];
      
      if (!invalidCodes.some(invalid => codFamiliaUpper.includes(invalid))) {
        vehicleMarca = codFamilia;
      }
    }
  }
  
  return { marca: vehicleMarca, modelo: vehicleModelo };
}

testPatternMatchingImprovements();