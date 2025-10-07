import { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configuración de multer para subida de imágenes generales
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'vehicle-images');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    const fileName = `vehicle_${timestamp}_${randomSuffix}${ext}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, WebP)'));
    }
  }
});

/**
 * Registra las rutas de subida de imágenes generales
 */
export function registerImageUploadRoutes(app: Express) {
  // Ruta para subir imágenes del formulario de tasación de vehículos
  app.post('/api/upload-image', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
      }

      // Construir la URL de la imagen
      const imageUrl = `/uploads/vehicle-images/${req.file.filename}`;
      
      console.log(`📸 Imagen subida exitosamente:`, {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: imageUrl
      });
      
      res.json({
        success: true,
        imageUrl: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Servir archivos estáticos de imágenes de vehículos
  app.use('/uploads/vehicle-images', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', 'vehicle-images', req.path);
    
    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Imagen no encontrada' });
    }
  });
}