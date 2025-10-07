#!/bin/bash
# Script de emergencia para sincronizar archivos compilados
# Usar solo si el sistema automático falla

echo "🔄 Sincronizando archivos compilados..."

# Compilar si es necesario
if [ "$1" = "--build" ]; then
    echo "📦 Ejecutando build..."
    npm run build
fi

# Verificar que dist/public existe
if [ ! -d "dist/public" ]; then
    echo "❌ Error: dist/public no existe. Ejecuta 'npm run build' primero"
    exit 1
fi

# Crear server/public si no existe
mkdir -p server/public

# Sincronizar archivos
echo "📂 Copiando index.html..."
cp dist/public/index.html server/public/index.html

echo "📂 Copiando directorio assets..."
cp -r dist/public/assets server/public/

echo "📂 Copiando otros archivos..."
cp dist/public/*.png server/public/ 2>/dev/null || true
cp dist/public/*.svg server/public/ 2>/dev/null || true
cp dist/public/*.ico server/public/ 2>/dev/null || true

# Verificar sincronización
echo "✅ Verificando sincronización..."
DIST_HASH=$(grep -o 'index-[a-zA-Z0-9_-]*\.js' dist/public/index.html | head -1)
SERVER_HASH=$(grep -o 'index-[a-zA-Z0-9_-]*\.js' server/public/index.html | head -1)

echo "Hash en dist/public: $DIST_HASH"
echo "Hash en server/public: $SERVER_HASH"

if [ "$DIST_HASH" = "$SERVER_HASH" ]; then
    echo "✅ Sincronización exitosa - Los archivos coinciden"
else
    echo "❌ Error: Los archivos no coinciden después de la sincronización"
    exit 1
fi

echo "🎉 Sincronización completada. El servidor debería servir los archivos actualizados."