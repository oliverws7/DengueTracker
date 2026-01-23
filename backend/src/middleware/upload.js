const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Tipos de arquivo permitidos
const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

// Tamanho máximo do arquivo (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/images');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtro de validação
const fileFilter = (req, file, cb) => {
  // Verificar tipo MIME
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    return cb(new Error('Tipo de arquivo não permitido. Use apenas imagens (JPG, PNG, GIF, WebP).'), false);
  }
  
  // Verificar extensão do arquivo
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Extensão de arquivo não permitida.'), false);
  }
  
  cb(null, true);
};

// Middleware de upload principal
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // Máximo de 5 arquivos por upload
  }
});

// Middleware de upload único
exports.uploadSingle = (fieldName = 'image') => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // Erros do Multer
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
              code: 'FILE_TOO_LARGE'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              error: 'Número máximo de arquivos excedido',
              code: 'TOO_MANY_FILES'
            });
          }
        }
        
        // Erros de validação
        return res.status(400).json({
          success: false,
          error: err.message || 'Erro no upload do arquivo',
          code: 'UPLOAD_ERROR'
        });
      }
      
      // Adicionar informações do arquivo à requisição
      if (req.file) {
        req.file.url = `/uploads/images/${req.file.filename}`;
        req.file.fullPath = path.join(__dirname, '../uploads/images', req.file.filename);
      }
      
      next();
    });
  };
};

// Middleware de upload múltiplo
exports.uploadMultiple = (fieldName = 'images', maxCount = 5) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
              code: 'FILE_TOO_LARGE'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              error: `Número máximo de arquivos excedido. Máximo: ${maxCount}`,
              code: 'TOO_MANY_FILES'
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: err.message || 'Erro no upload dos arquivos',
          code: 'UPLOAD_ERROR'
        });
      }
      
      // Adicionar URLs aos arquivos
      if (req.files && req.files.length > 0) {
        req.files = req.files.map(file => ({
          ...file,
          url: `/uploads/images/${file.filename}`,
          fullPath: path.join(__dirname, '../uploads/images', file.filename)
        }));
      }
      
      next();
    });
  };
};

// Middleware para compressão de imagem (opcional - você pode instalar sharp depois)
exports.compressImage = async (req, res, next) => {
  try {
    if (req.file || (req.files && req.files.length > 0)) {
      // Implementação futura com sharp para compressão
      // const sharp = require('sharp');
      console.log('📷 Compressão de imagem disponível (instale: npm install sharp)');
    }
    next();
  } catch (error) {
    console.error('Erro na compressão:', error);
    next();
  }
};

// Função para deletar arquivo
exports.deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!filePath) return resolve(true);
    
    const fullPath = path.join(__dirname, '../uploads', filePath.replace('/uploads/', ''));
    
    fs.unlink(fullPath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // Arquivo não existe, considerar como deletado
          return resolve(true);
        }
        return reject(err);
      }
      resolve(true);
    });
  });
};

// Validador de imagens
exports.validateImage = (req, res, next) => {
  if (!req.file && (!req.files || req.files.length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'Nenhuma imagem foi enviada',
      code: 'NO_IMAGE_PROVIDED'
    });
  }
  
  // Validar dimensões mínimas (opcional)
  // if (req.file) {
  //   const dimensions = sizeOf(req.file.path);
  //   if (dimensions.width < 100 || dimensions.height < 100) {
  //     return res.status(400).json({
  //       success: false,
  //       error: 'Imagem muito pequena. Mínimo: 100x100 pixels',
  //       code: 'IMAGE_TOO_SMALL'
  //     });
  //   }
  // }
  
  next();
};

// Configurações exportadas
exports.config = {
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  maxFileSize: MAX_FILE_SIZE,
  uploadDir: path.join(__dirname, '../uploads/images')
};