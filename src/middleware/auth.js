const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dengue-tracker-secret-key-2024-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dengue-tracker-refresh-secret-2024';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Cache de tokens revogados (em produção, usar Redis)
const revokedTokens = new Set();

// Middleware para verificar token JWT com validação completa
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Token de autenticação não fornecido',
      code: 'TOKEN_MISSING',
      timestamp: new Date().toISOString()
    });
  }

  // Verificar se token está na lista de revogados
  if (revokedTokens.has(token)) {
    return res.status(401).json({ 
      success: false,
      error: 'Token revogado. Faça login novamente.',
      code: 'TOKEN_REVOKED'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          solution: 'Use o endpoint /api/auth/refresh para obter um novo token'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          success: false,
          error: 'Token inválido ou malformado',
          code: 'TOKEN_INVALID',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
      
      return res.status(403).json({ 
        success: false,
        error: 'Falha na verificação do token',
        code: 'TOKEN_VERIFICATION_FAILED'
      });
    }
    
    // Verificar estrutura do payload
    if (!decoded.userId && !decoded.id) {
      return res.status(403).json({ 
        success: false,
        error: 'Token não contém identificador de usuário',
        code: 'TOKEN_MALFORMED'
      });
    }

    // Adicionar informações ao request
    req.user = {
      ...decoded,
      token: token, // Adicionar token ao objeto user
      sessionId: decoded.sessionId || `session_${Date.now()}`
    };
    
    req.userId = decoded.userId || decoded.id;
    req.isAuthenticated = true;
    
    // Log de autenticação bem-sucedida (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Usuário autenticado: ${decoded.email || decoded.userId} (${decoded.role || 'user'})`);
    }
    
    next();
  });
};

// Middleware para verificar roles/permissões com cache de permissões
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado',
        code: 'USER_NOT_AUTHENTICATED'
      });
    }

    if (!req.user.role) {
      return res.status(403).json({ 
        success: false,
        error: 'Usuário não possui role definida',
        code: 'ROLE_NOT_DEFINED'
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      // Verificar hierarquia de roles (admin > moderator > user)
      const roleHierarchy = {
        'user': 1,
        'moderator': 2,
        'admin': 3,
        'superadmin': 4
      };
      
      const userLevel = roleHierarchy[req.user.role] || 0;
      const requiredLevel = Math.max(...roles.map(role => roleHierarchy[role] || 0));
      
      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          success: false,
          error: 'Acesso negado. Permissões insuficientes.',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: roles,
          userRole: req.user.role,
          suggestion: `Role mínima requerida: ${roles.join(' ou ')}`
        });
      }
    }

    next();
  };
};

// Função para gerar token JWT com payload completo
exports.generateToken = (userData, additionalPayload = {}) => {
  const payload = {
    userId: userData._id?.toString() || userData.id || userData.userId,
    email: userData.email,
    role: userData.role || 'user',
    name: userData.name || userData.nome || 'Usuário',
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...additionalPayload
  };

  // Validar payload obrigatório
  if (!payload.userId) {
    throw new Error('userId é obrigatório para gerar token');
  }

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'dengue-tracker-api',
    audience: 'dengue-tracker-client'
  });
};

// Função para gerar refresh token
exports.generateRefreshToken = (userData) => {
  const payload = {
    userId: userData._id?.toString() || userData.id || userData.userId,
    type: 'refresh',
    sessionId: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN 
  });
};

// Função para verificar refresh token
exports.verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error(`Refresh token inválido: ${error.message}`);
  }
};

// Função ALIAS para compatibilidade com código antigo que usa "gerarToken"
exports.gerarToken = (userId, role = 'user', name = 'Usuário') => {
  console.warn('⚠️  Deprecated: Use generateToken() em vez de gerarToken()');
  
  return jwt.sign(
    {
      userId: userId,
      role: role,
      name: name,
      sessionId: `legacy_${Date.now()}`
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'dengue-tracker-api'
    }
  );
};

// Middleware para adicionar usuário ao request (opcional - para rotas públicas)
exports.setUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    // Verificar se token está revogado
    if (revokedTokens.has(token)) {
      req.isAuthenticated = false;
      req.tokenRevoked = true;
      return next();
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
        req.userId = decoded.userId || decoded.id;
        req.isAuthenticated = true;
        
        // Adicionar metadados para logging
        req.authMetadata = {
          method: 'bearer',
          tokenLength: token.length,
          decodedAt: new Date().toISOString()
        };
      } else {
        req.isAuthenticated = false;
        req.authError = err?.message;
      }
    });
  } else {
    req.isAuthenticated = false;
  }
  
  next();
};

// Função para decodificar token sem verificar (útil para WebSocket)
exports.decodeToken = (token, options = {}) => {
  try {
    const decoded = jwt.decode(token, { ...options, complete: true });
    
    if (!decoded) {
      return null;
    }
    
    // Adicionar metadados
    return {
      ...decoded.payload,
      header: decoded.header,
      signature: decoded.signature,
      decodedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao decodificar token:', error.message);
    return null;
  }
};

// Middleware para autenticação opcional (não falha se token ausente/inválido)
exports.optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    // Verificar se token está revogado
    if (revokedTokens.has(token)) {
      req.isAuthenticated = false;
      req.tokenRevoked = true;
      return next();
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
        req.userId = decoded.userId || decoded.id;
        req.isAuthenticated = true;
        req.authMethod = 'bearer';
        
        // Log em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔓 Autenticação opcional: Usuário ${decoded.email || decoded.userId} autenticado`);
        }
      } else {
        req.isAuthenticated = false;
        req.authError = err?.message;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️  Autenticação opcional: Token inválido - ${err?.message}`);
        }
      }
    });
  } else {
    req.isAuthenticated = false;
    req.authMethod = 'none';
  }
  
  next();
};

// Função para revogar token (logout)
exports.revokeToken = (token) => {
  if (!token) return false;
  
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      // Adicionar à lista de revogados
      revokedTokens.add(token);
      
      // Agendar limpeza após expiração (em produção, usar TTL do Redis)
      const expiresIn = (decoded.exp * 1000) - Date.now();
      if (expiresIn > 0) {
        setTimeout(() => {
          revokedTokens.delete(token);
        }, expiresIn);
      }
      
      return true;
    }
  } catch (error) {
    console.error('Erro ao revogar token:', error);
  }
  
  return false;
};

// Função para limpar tokens revogados expirados
exports.cleanupRevokedTokens = () => {
  const now = Math.floor(Date.now() / 1000);
  let removedCount = 0;
  
  for (const token of revokedTokens) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp && decoded.exp < now) {
        revokedTokens.delete(token);
        removedCount++;
      }
    } catch (error) {
      // Token inválido, remover
      revokedTokens.delete(token);
      removedCount++;
    }
  }
  
  return removedCount;
};

// Validador de token para WebSocket/Socket.IO
exports.validateSocketToken = (token) => {
  return new Promise((resolve) => {
    if (!token) {
      return resolve({ valid: false, error: 'Token não fornecido' });
    }
    
    if (revokedTokens.has(token)) {
      return resolve({ valid: false, error: 'Token revogado' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        resolve({ 
          valid: false, 
          error: err.message,
          expired: err.name === 'TokenExpiredError'
        });
      } else {
        resolve({ 
          valid: true, 
          user: decoded,
          userId: decoded.userId || decoded.id
        });
      }
    });
  });
};

// Middleware para validação de API Key (para integrações)
exports.validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key não fornecida',
      code: 'API_KEY_MISSING'
    });
  }
  
  // Verificar API Key (em produção, buscar do banco de dados)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      error: 'API Key inválida',
      code: 'API_KEY_INVALID'
    });
  }
  
  req.apiKey = apiKey;
  req.authMethod = 'api-key';
  req.isAuthenticated = true;
  
  next();
};

// Middleware de segurança para prevenir ataques de força bruta
exports.securityHeaders = (req, res, next) => {
  // Headers de segurança para endpoints de autenticação
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache'
  });
  
  next();
};

// Função auxiliar para extrair token de diferentes fontes
exports.extractToken = (req) => {
  return (
    req.headers.authorization?.split(' ')[1] ||
    req.query.token ||
    req.cookies?.token ||
    req.body?.token
  );
};

// Exportar constantes para uso externo
exports.constants = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN
};