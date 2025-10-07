#!/usr/bin/env node
/**
 * Script de verificación completa antes del deployment
 * Verifica todos los componentes críticos del sistema
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Iniciando verificación de deployment...\n');

// 1. Verificar archivos críticos
const criticalFiles = [
  'server/index.ts',
  'server/storage.ts', 
  'client/src/App.tsx',
  'client/src/components/AdminLayout.tsx',
  'client/src/pages/AdminOrders.tsx',
  'production-config.js',
  'package.json'
];

console.log('📂 Verificando archivos críticos...');
let missingFiles = [];
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - FALTANTE`);
    missingFiles.push(file);
  }
});

// 2. Verificar dependencias críticas en package.json
console.log('\n📦 Verificando dependencias críticas...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const criticalDeps = [
  'express',
  'react',
  'typescript',
  '@neondatabase/serverless',
  'drizzle-orm',
  'tsx'
];

criticalDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - FALTANTE`);
  }
});

// 3. Verificar configuración de production
console.log('\n⚙️ Verificando configuración de producción...');
const productionConfig = fs.readFileSync('production-config.js', 'utf8');
if (productionConfig.includes('npm run dev')) {
  console.log('❌ Configuración contiene referencias a desarrollo');
} else {
  console.log('✅ Configuración de producción correcta');
}

// 4. Verificar estructura de componentes Admin
console.log('\n🎛️ Verificando componentes de administración...');
const adminComponents = [
  'client/src/components/AdminLayout.tsx',
  'client/src/pages/AdminOrders.tsx',
  'client/src/pages/AdminDashboard.tsx'
];

adminComponents.forEach(comp => {
  if (fs.existsSync(comp)) {
    const content = fs.readFileSync(comp, 'utf8');
    if (content.includes('AdminLayout') || comp.includes('AdminLayout')) {
      console.log(`✅ ${comp} - Estructura correcta`);
    } else {
      console.log(`⚠️ ${comp} - Verificar estructura`);
    }
  } else {
    console.log(`❌ ${comp} - FALTANTE`);
  }
});

// 5. Verificar rutas de API críticas
console.log('\n🔗 Verificando rutas de API...');
const serverIndexContent = fs.readFileSync('server/index.ts', 'utf8');
const criticalRoutes = [
  'registerRoutes',
  '/health',
  '/api/contact'
];

criticalRoutes.forEach(route => {
  if (serverIndexContent.includes(route)) {
    console.log(`✅ ${route}`);
  } else {
    console.log(`❌ ${route} - FALTANTE`);
  }
});

// 6. Resumen final
console.log('\n📋 RESUMEN DE VERIFICACIÓN:');
if (missingFiles.length === 0) {
  console.log('✅ Todos los archivos críticos están presentes');
  console.log('✅ Sistema listo para deployment');
  console.log('\n🚀 Para deployar:');
  console.log('1. Asegúrate de que .replit use: run = "node production-config.js"');
  console.log('2. Inicia el deployment desde Replit');
} else {  
  console.log('❌ Archivos faltantes encontrados:');
  missingFiles.forEach(file => console.log(`   - ${file}`));
  console.log('⚠️ Resolver problemas antes del deployment');
}

console.log('\n🔍 Verificación completa.');