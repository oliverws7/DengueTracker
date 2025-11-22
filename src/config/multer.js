const multer = require('multer');
const path = require('path');

// Configurar storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploads/'); // Pasta onde as imagens serão salvas
  },
  filename: (req, file, cb) => {
    // Nome único para o arquivo: timestamp + extensão
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'foco-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtrar apenas imagens
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limite
  }
});

module.exports = upload;