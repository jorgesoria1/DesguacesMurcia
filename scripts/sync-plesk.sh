#!/bin/bash
# Script de sincronización para deploy de Plesk
# Uso: ./scripts/sync-plesk.sh

echo "🔄 SINCRONIZACIÓN PLESK - Desguace Murcia"
echo "========================================"
echo ""

# Variables de configuración
APP_DIR="/var/www/vhosts/tu-dominio.com/httpdocs"
BACKUP_DIR="/var/backups/desguaces"
DATE=$(date +%Y%m%d_%H%M%S)

# Función para logs con timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log "❌ Error: No se encuentra package.json. Ejecutar desde el directorio del proyecto."
    exit 1
fi

# Crear directorio de backup si no existe
mkdir -p "$BACKUP_DIR"

# 1. BACKUP DE SEGURIDAD
log "📦 Creando backup de seguridad..."
if [ ! -z "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/db_backup_$DATE.sql"
    log "✅ Backup de BD creado: db_backup_$DATE.sql"
else
    log "⚠️ DATABASE_URL no configurada, omitiendo backup de BD"
fi

# Backup de archivos críticos
tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" \
    package.json \
    .env \
    uploads/ \
    2>/dev/null

log "✅ Backup de archivos creado: files_backup_$DATE.tar.gz"

# 2. OBTENER CAMBIOS DE GIT
log "📥 Descargando cambios desde GitHub..."
if git pull origin main; then
    log "✅ Cambios descargados exitosamente"
else
    log "❌ Error al descargar cambios. Revisa la conexión con GitHub."
    exit 1
fi

# 3. VERIFICAR CAMBIOS EN DEPENDENCIAS
if git diff HEAD@{1} HEAD --name-only | grep -q "package.json"; then
    log "📦 Detectados cambios en dependencias, ejecutando npm install..."
    if npm install; then
        log "✅ Dependencias actualizadas"
    else
        log "❌ Error al instalar dependencias"
        exit 1
    fi
else
    log "✅ Sin cambios en dependencias"
fi

# 4. APLICAR CAMBIOS DE BASE DE DATOS
log "🗄️ Aplicando cambios de base de datos..."
if npm run db:push; then
    log "✅ Schema de BD actualizado"
else
    log "⚠️ Warning: Error en db:push, puede que no haya cambios"
fi

# 5. BUILD DEL FRONTEND
log "🎨 Building frontend..."
if npm run build; then
    log "✅ Frontend construido exitosamente"
else
    log "❌ Error en build del frontend"
    exit 1
fi

# 6. REINICIAR APLICACIÓN
log "🔄 Reiniciando aplicación..."
if command -v pm2 >/dev/null 2>&1; then
    if pm2 restart desguaces-app; then
        log "✅ Aplicación reiniciada con PM2"
    else
        log "❌ Error al reiniciar con PM2"
        exit 1
    fi
else
    log "⚠️ PM2 no encontrado, reinicia manualmente el servidor"
fi

# 7. VERIFICACIÓN POST-DEPLOY
log "🔍 Verificando deploy..."
sleep 3

# Test health endpoint
if command -v curl >/dev/null 2>&1; then
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        log "✅ Health check: OK"
    else
        log "⚠️ Warning: Health check falló, verifica el servidor"
    fi
fi

# 8. CLEANUP DE BACKUPS ANTIGUOS (mantener solo los últimos 5)
log "🧹 Limpiando backups antiguos..."
cd "$BACKUP_DIR"
ls -t db_backup_*.sql 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
ls -t files_backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null

log "✅ SINCRONIZACIÓN COMPLETADA"
echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "1. Verificar tu sitio web: https://tu-dominio.com/health"
echo "2. Probar login admin: https://tu-dominio.com/admin"
echo "3. Verificar funcionalidades críticas"
echo ""
echo "📋 ARCHIVOS DE BACKUP CREADOS:"
echo "- Base de datos: $BACKUP_DIR/db_backup_$DATE.sql"
echo "- Archivos: $BACKUP_DIR/files_backup_$DATE.tar.gz"
echo ""
echo "🔄 Para sincronizar de nuevo: ./scripts/sync-plesk.sh"