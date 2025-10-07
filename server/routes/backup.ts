import express from 'express';
import { backupService, BackupInfo } from '../services/backup-service';
import { requireAuth, requireAdmin } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configurar multer para subida de archivos de backup SQL
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'backups'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.sql'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .sql'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB máximo
  }
});

// Listar todos los backups
router.get('/list', requireAuth, requireAdmin, async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({
      success: true,
      backups: backups.map(backup => ({
        ...backup,
        sizeFormatted: backupService.formatFileSize(backup.size)
      }))
    });
  } catch (error) {
    console.error('Error listando backups:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar backups'
    });
  }
});

// Crear backup de base de datos
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const backup = await backupService.createDatabaseBackup(name);
    
    res.json({
      success: true,
      message: 'Backup de base de datos creado correctamente',
      backup: {
        ...backup,
        sizeFormatted: backupService.formatFileSize(backup.size)
      }
    });
  } catch (error) {
    console.error('Error creando backup de base de datos:', error);
    res.status(500).json({
      success: false,
      error: `Error creando backup de base de datos: ${error}`
    });
  }
});

// Restaurar base de datos
router.post('/restore/:backupId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    const backups = await backupService.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup no encontrado'
      });
    }

    await backupService.restoreDatabase(backup.path);
    
    res.json({
      success: true,
      message: 'Base de datos restaurada correctamente'
    });
  } catch (error) {
    console.error('Error restaurando base de datos:', error);
    res.status(500).json({
      success: false,
      error: `Error restaurando base de datos: ${error}`
    });
  }
});

// Eliminar backup
router.delete('/:backupId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    await backupService.deleteBackup(backupId);
    
    res.json({
      success: true,
      message: 'Backup eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando backup:', error);
    res.status(500).json({
      success: false,
      error: `Error eliminando backup: ${error}`
    });
  }
});

// Descargar backup
router.get('/download/:backupId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    const backups = await backupService.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup no encontrado'
      });
    }

    res.download(backup.path, backup.name);
  } catch (error) {
    console.error('Error descargando backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error descargando backup'
    });
  }
});

// Subir backup SQL para restaurar
router.post('/upload', requireAuth, requireAdmin, upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo de backup SQL'
      });
    }

    res.json({
      success: true,
      message: 'Backup SQL subido correctamente',
      filename: req.file.filename,
      size: backupService.formatFileSize(req.file.size)
    });
  } catch (error) {
    console.error('Error subiendo backup:', error);
    res.status(500).json({
      success: false,
      error: 'Error subiendo backup SQL'
    });
  }
});

export default router;