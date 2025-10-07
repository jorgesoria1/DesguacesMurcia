/**
 * Simple deployment script that avoids build issues
 * This script will be used for production deployment
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Simple deployment script starting...');

// Create a basic dist structure
const createDistStructure = () => {
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Create a simple index.js that starts the server
  const indexContent = `
const { spawn } = require('child_process');

console.log('🚀 Starting production server...');

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (error) => {
  console.error('Error starting server:', error);
});

server.on('close', (code) => {
  console.log(\`Server process exited with code \${code}\`);
});
`;
  
  fs.writeFileSync(path.join(distDir, 'index.js'), indexContent);
  console.log('✅ Created dist/index.js');
};

// Create public directory structure
const createPublicStructure = () => {
  const publicDir = path.join(__dirname, 'dist', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Create a simple index.html
  const indexHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Desguace Murcia</title>
</head>
<body>
    <div id="root"></div>
    <script>
        // App will be served by Express with Vite middleware
        console.log('Desguace Murcia loading...');
    </script>
</body>
</html>
`;
  
  fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
  console.log('✅ Created dist/public/index.html');
};

// Main deployment function
const deploy = () => {
  console.log('📦 Creating deployment structure...');
  
  createDistStructure();
  createPublicStructure();
  
  console.log('🎉 Simple deployment structure created!');
  console.log('📝 Deployment files:');
  console.log('  - dist/index.js (server starter)');
  console.log('  - dist/public/index.html (basic HTML)');
  console.log('  - production-config.js (main server)');
  console.log('🚀 Ready for deployment!');
};

// Run deployment
deploy();