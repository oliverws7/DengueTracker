const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Helper para IP seguro (resolve problema IPv6)
const getClientIP = (req) => {
  // Usa o ipKeyGenerator para lidar corretamente com IPv6
  return ipKeyGenerator(req, req.res);
};

// Rate limiting geral para todas as rotas
exports.generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: {
    success: false,
    error: 'Muitas requisições deste IP. Tente novamente após 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Para usuários autenticados, usar userId + IP para mais precisão
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}:${ipKeyGenerator(req, req.res)}`;
    }
    return ipKeyGenerator(req, req.res);
  },
  skip: (req) => {
    // Pular rate limiting para localhost em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const ip = ipKeyGenerator(req, req.res);
      return ip === '::1' || ip === '127.0.0.1';
    }
    return false;
  }
});

// Rate limiting para autenticação (mais restritivo)
exports.authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Apenas 5 tentativas de login por hora
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente após uma hora.',
    code: 'AUTH_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta tentativas bem-sucedidas
  keyGenerator: (req) => {
    // Rate limit por email para prevenir ataques de força bruta
    const email = req.body?.email;
    if (email) {
      return `auth:${email}:${ipKeyGenerator(req, req.res)}`;
    }
    return ipKeyGenerator(req, req.res);
  }
});

// Rate limiting para criação de relatórios
exports.reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 relatórios por hora
  message: {
    success: false,
    error: 'Limite de relatórios excedido. Tente novamente após uma hora.',
    code: 'REPORT_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Para usuários autenticados, limitar por usuário
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}:reports`;
    }
    // Para não autenticados, limitar por IP
    return `ip:${ipKeyGenerator(req, req.res)}:reports`;
  }
});

// Rate limiting para API pública
exports.apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 1000, // 1000 requisições por hora
  message: {
    success: false,
    error: 'Limite de requisições excedido para API pública.',
    code: 'API_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator
});

// Rate limiting específico para WebSocket/auth (se necessário no futuro)
exports.wsConnectionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // Máximo 50 conexões WebSocket por hora
  message: {
    success: false,
    error: 'Muitas conexões WebSocket. Tente novamente mais tarde.',
    code: 'WS_CONNECTION_LIMIT'
  },
  keyGenerator: ipKeyGenerator
});

// Rate limiting para uploads de arquivos
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // Máximo 20 uploads por hora
  message: {
    success: false,
    error: 'Limite de uploads excedido. Tente novamente após uma hora.',
    code: 'UPLOAD_LIMIT_EXCEEDED'
  },
  keyGenerator: (req) => {
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}:uploads`;
    }
    return ipKeyGenerator(req, req.res);
  }
});