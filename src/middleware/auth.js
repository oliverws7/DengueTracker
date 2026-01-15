const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dengue-tracker-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Middleware para verificar token JWT
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Token de autenticação não fornecido',
      code: 'TOKEN_MISSING'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({ 
        success: false,
        error: 'Token inválido',
        code: 'TOKEN_INVALID'
      });
    }
    
    // Para compatibilidade com código antigo que usa req.userId
    req.user = user;
    req.userId = user.userId || user.id;
    next();
  });
};

// Middleware para verificar roles/permissões
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado',
        code: 'USER_NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado. Permissões insuficientes.',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRole: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Função para gerar token JWT
exports.generateToken = (userData) => {
  return jwt.sign(
    {
      userId: userData.id || userData._id || userData.userId,
      email: userData.email,
      role: userData.role || 'user',
      name: userData.name || userData.nome
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Função ALIAS para compatibilidade com código antigo que usa "gerarToken"
exports.gerarToken = (userId, role, name) => {
  return jwt.sign(
    {
      userId: userId,
      role: role || 'user',
      name: name || 'Usuário'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Middleware para adicionar usuário ao request (opcional - para rotas públicas)
exports.setUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
        req.userId = user.userId || user.id;
      }
    });
  }
  
  next();
};

// Função para decodificar token sem verificar (útil para WebSocket)
exports.decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

// Middleware para autenticação opcional (não falha se token ausente/inválido)
exports.optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
        req.userId = user.userId || user.id;
        req.isAuthenticated = true;
      } else {
        req.isAuthenticated = false;
      }
    });
  } else {
    req.isAuthenticated = false;
  }
  
  next();
};