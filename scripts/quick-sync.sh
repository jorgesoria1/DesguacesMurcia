#!/bin/bash
# Sincronización rápida para cambios menores
# Uso: ./scripts/quick-sync.sh

echo "⚡ SYNC RÁPIDO - Desguace Murcia"
echo "==============================="

# Función para logs
log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

log "📥 Descargando cambios..."
if git pull origin main; then
    log "✅ Cambios descargados"
else
    log "❌ Error en git pull"
    exit 1
fi

log "🔄 Reiniciando aplicación..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart desguaces-app
    log "✅ Aplicación reiniciada"
else
    log "⚠️ PM2 no encontrado - reinicia manualmente"
fi

log "🔍 Verificando..."
sleep 2
if curl -f http://localhost:5000/health >/dev/null 2>&1; then
    log "✅ Servidor funcionando correctamente"
else
    log "⚠️ Warning: Verificar el servidor manualmente"
fi

echo ""
echo "✅ SYNC RÁPIDO COMPLETADO"
echo "🌐 Verificar: https://tu-dominio.com"