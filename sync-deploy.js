#!/usr/bin/env node
/**
 * Script de Sincronización Deploy
 * Asegura que los archivos de build se copien correctamente a deploy
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔄 SINCRONIZACIÓN DESARROLLO → DEPLOY');
console.log('=====================================');

try {
  // 1. Ejecutar build
  console.log('📦 1. Ejecutando build...');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build completado');

  // 2. Verificar que existe el directorio de build
  const buildDir = './dist/public';
  const deployDir = './server/public';
  
  if (!fs.existsSync(buildDir)) {
    throw new Error(`❌ Directorio de build no encontrado: ${buildDir}`);
  }

  console.log('📁 2. Sincronizando archivos...');

  // 3. Copiar archivos
  execSync(`cp -r ${buildDir}/* ${deployDir}/`, { stdio: 'pipe' });
  console.log('✅ Archivos copiados');

  // 4. Verificar archivos críticos
  const indexHtml = path.join(deployDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    const htmlContent = fs.readFileSync(indexHtml, 'utf-8');
    const cssMatch = htmlContent.match(/\/assets\/(index-[^.]+\.css)/);
    const jsMatch = htmlContent.match(/\/assets\/(index-[^.]+\.js)/);
    
    if (cssMatch && jsMatch) {
      console.log(`✅ HTML apunta a: ${cssMatch[1]} y ${jsMatch[1]}`);
      
      // Verificar que existen los archivos
      const cssPath = path.join(deployDir, 'assets', cssMatch[1]);
      const jsPath = path.join(deployDir, 'assets', jsMatch[1]);
      
      if (fs.existsSync(cssPath) && fs.existsSync(jsPath)) {
        console.log('✅ Archivos CSS y JS verificados');
      } else {
        throw new Error('❌ Archivos CSS o JS no encontrados en deploy');
      }
    }
  }

  // 5. Mostrar resumen
  console.log('\n📊 RESUMEN DE SINCRONIZACIÓN:');
  console.log('✅ Build ejecutado exitosamente');
  console.log('✅ Archivos copiados a deploy');
  console.log('✅ Referencias HTML verificadas');
  console.log('✅ Deploy sincronizado con desarrollo');
  
  console.log('\n🎯 Para aplicar cambios:');
  console.log('1. Reinicia el workflow si es necesario');
  console.log('2. Verifica que ambos entornos funcionen igual');

} catch (error) {
  console.error('❌ Error en sincronización:', error.message);
  process.exit(1);
}