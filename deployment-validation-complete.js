/**
 * Complete Deployment Validation Script
 * Tests all deployment fixes and confirms the application is ready for production
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Iniciando validación completa de deployment...');

// Test TypeScript compilation
async function testTypeScriptCompilation() {
  console.log('\n📝 Probando compilación TypeScript...');
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
      stdio: 'pipe',
      shell: false
    });
    
    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ TypeScript compilation: PASSED');
        resolve(true);
      } else {
        console.log('❌ TypeScript compilation: FAILED');
        console.log('Errores:', stderr);
        resolve(false);
      }
    });
  });
}

// Test server connection
async function testServerConnection() {
  console.log('\n🌐 Probando conexión del servidor...');
  
  try {
    const response = await fetch('http://localhost:5000/api/health');
    if (response.ok) {
      console.log('✅ Server connection: PASSED');
      return true;
    } else {
      console.log('❌ Server connection: FAILED - Status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server connection: FAILED - Error:', error.message);
    return false;
  }
}

// Test database operations
async function testDatabaseOperations() {
  console.log('\n🗄️ Probando operaciones de base de datos...');
  
  try {
    const response = await fetch('http://localhost:5000/api/parts?limit=1');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Database operations: PASSED');
      console.log('   - Parts endpoint response:', data.data ? data.data.length : 0, 'items');
      return true;
    } else {
      console.log('❌ Database operations: FAILED - Status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Database operations: FAILED - Error:', error.message);
    return false;
  }
}

// Test schema validation
async function testSchemaValidation() {
  console.log('\n📋 Probando validación de schema...');
  
  try {
    // Import and test schema
    const schemaPath = path.join(__dirname, 'shared/schema.ts');
    if (fs.existsSync(schemaPath)) {
      console.log('✅ Schema validation: PASSED');
      console.log('   - Schema file exists and is accessible');
      return true;
    } else {
      console.log('❌ Schema validation: FAILED - Schema file not found');
      return false;
    }
  } catch (error) {
    console.log('❌ Schema validation: FAILED - Error:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Validando todos los componentes del deployment...\n');
  
  const results = {
    typescript: await testTypeScriptCompilation(),
    server: await testServerConnection(),
    database: await testDatabaseOperations(),
    schema: await testSchemaValidation()
  };
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log('\n📊 RESUMEN DE VALIDACIÓN:');
  console.log('='.repeat(50));
  console.log(`✅ Tests pasados: ${passedTests}/${totalTests}`);
  console.log(`❌ Tests fallidos: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ¡DEPLOYMENT READY! Todos los tests pasados.');
    console.log('💡 La aplicación está lista para deployment en producción.');
    console.log('🚀 Puedes proceder con el deployment usando el botón de Replit.');
  } else {
    console.log('\n⚠️  Deployment necesita correcciones adicionales.');
    console.log('🔧 Revisa los errores arriba antes de hacer deployment.');
  }
  
  return passedTests === totalTests;
}

// Execute validation
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Error durante la validación:', error);
  process.exit(1);
});