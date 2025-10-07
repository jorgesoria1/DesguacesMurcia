import { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { isAuthenticated, canManageOrders } from "../auth";

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'orders');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    // Generar nombre temporal primero, luego se puede renombrar después
    const fileName = `temp_${timestamp}_${name}${ext}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

/**
 * Registra las rutas de subida de archivos para pedidos
 */
export function registerUploadRoutes(app: Express) {
  // Ruta para subir documentos de pedidos
  app.post('/api/upload/order-document', 
    isAuthenticated, 
    canManageOrders, 
    upload.single('file'), 
    async (req: Request, res: Response) => {
      try {
        console.log('📤 Upload request received:', {
          hasFile: !!req.file,
          body: req.body,
          fileInfo: req.file ? {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          } : null,
          user: req.user?.id
        });

        if (!req.file) {
          console.error('❌ No file received in upload request');
          return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }

        const { orderId, type } = req.body;
        
        console.log('📋 Extracted from body:', { orderId, type, bodyKeys: Object.keys(req.body) });
        
        if (!orderId || !type) {
          console.error('❌ Missing orderId or type:', { orderId, type });
          return res.status(400).json({ 
            error: 'orderId y type son requeridos',
            received: { orderId, type }
          });
        }

        // Renombrar archivo con información completa
        const timestamp = Date.now();
        const ext = path.extname(req.file.originalname);
        const name = path.basename(req.file.originalname, ext);
        const newFileName = `order_${orderId}_${type}_${timestamp}_${name}${ext}`;
        
        const oldPath = path.join(process.cwd(), 'uploads', 'orders', req.file.filename);
        const newPath = path.join(process.cwd(), 'uploads', 'orders', newFileName);
        
        // Renombrar el archivo
        try {
          fs.renameSync(oldPath, newPath);
          console.log('✅ Archivo renombrado:', { from: req.file.filename, to: newFileName });
        } catch (renameError) {
          console.error('❌ Error al renombrar archivo:', renameError);
          // Si no se puede renombrar, usar el nombre original
        }
        
        const finalFileName = fs.existsSync(newPath) ? newFileName : req.file.filename;
        const filePath = `/uploads/orders/${finalFileName}`;
        
        console.log(`📄 Archivo subido para pedido ${orderId}:`, {
          originalName: req.file.originalname,
          tempFileName: req.file.filename,
          finalFileName: finalFileName,
          size: req.file.size,
          type: type,
          filePath: filePath
        });

        res.json({
          message: 'Archivo subido correctamente',
          filePath: filePath,
          originalName: req.file.originalname,
          size: req.file.size,
          type: type
        });

      } catch (error: any) {
        console.error('Error al subir archivo:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
      }
    }
  );

  // Ruta para servir archivos subidos
  app.get('/uploads/orders/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', 'orders', filename);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Servir el archivo
    res.sendFile(filePath);
  });

  // Ruta para descargar archivos (con headers apropiados)
  app.get('/api/download/order-document/:filename', 
    isAuthenticated,
    (req: Request, res: Response) => {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'uploads', 'orders', filename);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }

      // Obtener información del archivo
      const stat = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      
      // Determinar el content-type
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      }

      // Configurar headers para descarga
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
      
      // Enviar archivo
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  );
}