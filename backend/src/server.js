require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");
const helmet = require("helmet");
const cron = require("node-cron");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit"); // ✅ ADICIONADO AQUI
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

// Importação de Scripts e Utilitários de Infraestrutura
const realizarBackup = require("./scripts/backup");
const validateEnv = require("./scripts/validateEnv");

// Importação de Middlewares
const { 
  authenticateToken, 
  authorizeRoles, 
  setUser, 
  optionalAuth,
  validateApiKey,
  validateSocketToken,
  securityHeaders,
  revokeToken,
  cleanupRevokedTokens
} = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

// Validação inicial do ambiente
if (typeof validateEnv === 'function') validateEnv();

// ======================
// CONFIGURAÇÕES DE SEGURANÇA
// ======================
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000", 
      "http://localhost:5173", 
      "http://localhost:5000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "http://localhost:8080"
    ];
    
    // Em desenvolvimento, permitir mais flexibilidade
    if (process.env.NODE_ENV === 'development') {
      if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    } else {
      // Em produção, apenas origens permitidas
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} não permitido por CORS`));
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "Accept", "X-Requested-With"]
};

// ======================
// SEQUÊNCIA DE MIDDLEWARES (ORDEM IMPORTANTE!)
// ======================

// 1. Logging (primeiro para registrar todas as requisições)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 2. Headers de segurança específicos para auth
app.use('/api/auth', securityHeaders);

// 3. Compressão de resposta (exceto para SSE/WebSocket)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression'] || req.path.includes('/socket.io/') || req.path.includes('/uploads/')) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024
}));

// 4. Helmet com configuração específica
const helmetConfig = process.env.NODE_ENV === 'production' ? {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:5000"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
} : {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
};

app.use(helmet(helmetConfig));

// 5. CORS
app.use(cors(corsOptions));

// 6. Parsers de corpo com limites
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_REQUEST_SIZE || '10mb' 
}));

// 7. Sanitização contra NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  Tentativa de NoSQL injection sanitizada: ${key}`, {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
    }
  }
}));

// 8. Proteção XSS
app.use(xss());

// 9. Proteção contra Parameter Pollution
app.use(hpp({
  whitelist: [
    'page', 'limit', 'sort', 'fields', 
    'latitude', 'longitude', 'radius',
    'status', 'type', 'priority', 'tipo',
    'nivelRisco', 'cidade', 'bairro'
  ]
}));

// 10. Middleware de usuário (opcional)
app.use(setUser);

// ======================
// RATE LIMITING SIMPLIFICADO (SEM ERROS) - ✅ ATUALIZADO
// ======================

// Use rate limiting padrão sem configurações complexas
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    success: false,
    error: 'Limite geral de requisições excedido',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Muitas tentativas de autenticação',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Limite de criação de relatórios excedido',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    error: 'Limite de API excedido',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Limite de uploads excedido',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ======================
// BACKUP AUTOMÁTICO & MANUTENÇÃO
// ======================
if (process.env.NODE_ENV === 'production') {
  cron.schedule('0 3 * * *', () => {
    console.log('📅 [SISTEMA] Iniciando rotina de backup diário...');
    if (typeof realizarBackup === 'function') realizarBackup();
  });
}

// Limpeza de tokens revogados a cada hora
cron.schedule('0 * * * *', () => {
  const removed = cleanupRevokedTokens();
  if (removed > 0 && process.env.NODE_ENV === 'development') {
    console.log(`🧹 Limpeza automática: ${removed} tokens revogados expirados removidos`);
  }
});

// ======================
// WEBSOCKET CONFIGURAÇÃO (ATUALIZADA)
// ======================
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e6 // 1MB
});

const usuariosOnline = new Map();
const socketSessions = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Token de autenticação necessário'));
    }
    
    const validation = await validateSocketToken(token);
    
    if (!validation.valid) {
      return next(new Error(validation.error));
    }
    
    socket.userId = validation.userId;
    socket.userData = validation.user;
    
    // Armazenar sessão
    socketSessions.set(socket.id, {
      userId: validation.userId,
      connectedAt: new Date(),
      userAgent: socket.handshake.headers['user-agent']
    });
    
    next();
  } catch (error) {
    next(new Error('Falha na autenticação do socket'));
  }
});

io.on("connection", (socket) => {
  console.log(`🔌 Socket conectado: ${socket.id} (Usuário: ${socket.userId})`);
  
  // Adicionar à lista de usuários online
  usuariosOnline.set(socket.userId, {
    socketId: socket.id,
    userId: socket.userId,
    connectedAt: new Date(),
    userData: socket.userData
  });
  
  // Entrar nas salas apropriadas
  socket.join("sala-global");
  socket.join(`usuario-${socket.userId}`);
  
  if (socket.userData.role === 'admin' || socket.userData.role === 'moderator') {
    socket.join("sala-moderadores");
  }
  
  // Emitir evento de conexão bem-sucedida
  socket.emit("conexao-estabelecida", {
    success: true,
    message: `Bem-vindo, ${socket.userData.name || 'Usuário'}!`,
    userId: socket.userId,
    sessionId: socket.id,
    usuariosOnline: Array.from(usuariosOnline.values()).map(u => ({
      userId: u.userId,
      name: u.userData?.name || 'Usuário'
    }))
  });
  
  // Notificar outros usuários sobre novo usuário online
  socket.to("sala-global").emit("novo-usuario-online", {
    userId: socket.userId,
    name: socket.userData.name || 'Usuário',
    timestamp: new Date().toISOString()
  });
  
  // Eventos específicos do DengueTracker
  socket.on("novo-relatorio", async (relatorio) => {
    try {
      // Validação básica
      if (!relatorio || !relatorio.tipo || !relatorio.localizacao) {
        return socket.emit("erro-relatorio", {
          error: "Dados do relatório incompletos"
        });
      }
      
      // Broadcast para sala global
      socket.to("sala-global").emit("atualizacao-relatorios", {
        tipo: "novo",
        relatorio: {
          ...relatorio,
          reportadoPor: socket.userId,
          reportadoPorNome: socket.userData.name
        },
        timestamp: new Date().toISOString()
      });
      
      // Notificar moderadores sobre novo relatório
      socket.to("sala-moderadores").emit("novo-relatorio-moderacao", {
        relatorio,
        usuario: socket.userData,
        timestamp: new Date().toISOString()
      });
      
      socket.emit("relatorio-enviado", {
        success: true,
        message: "Relatório enviado com sucesso"
      });
    } catch (error) {
      socket.emit("erro-relatorio", {
        error: "Erro ao processar relatório"
      });
    }
  });
  
  socket.on("alerta-dengue", (alerta) => {
    // Apenas admin/moderadores podem enviar alertas
    if (socket.userData.role === 'admin' || socket.userData.role === 'moderator') {
      io.to("sala-global").emit("alerta-dengue-global", {
        ...alerta,
        enviadoPor: socket.userData.name,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  socket.on("upload-imagem", (dados) => {
    // Notificar sobre novo upload de imagem
    socket.to("sala-global").emit("nova-imagem-relatorio", {
      reportId: dados.reportId,
      imagemUrl: dados.imagemUrl,
      uploadedBy: socket.userData.name,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Socket desconectado: ${socket.id} (Razão: ${reason})`);
    
    // Remover da lista de usuários online
    if (usuariosOnline.has(socket.userId)) {
      usuariosOnline.delete(socket.userId);
      
      // Notificar outros usuários
      socket.to("sala-global").emit("usuario-offline", {
        userId: socket.userId,
        name: socket.userData?.name || 'Usuário',
        timestamp: new Date().toISOString()
      });
    }
    
    // Remover sessão
    socketSessions.delete(socket.id);
  });
  
  // Heartbeat para manter conexão ativa
  socket.on("heartbeat", () => {
    socket.emit("heartbeat-response", {
      timestamp: new Date().toISOString(),
      online: usuariosOnline.size
    });
  });
});

global.io = io;

// ======================
// CONEXÃO MONGODB & ÍNDICES (ATUALIZADA)
// ======================
const mongoOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
  minPoolSize: 5,
  retryWrites: true,
  w: 'majority',
  retryReads: true,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
};

// Configuração de reconexão
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

const connectWithRetry = () => {
  mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/denguetracker", mongoOptions)
    .then(() => {
      console.log("✅ MongoDB conectado com sucesso!");
      reconnectAttempts = 0;
      
      // Verificar índices após conexão
      setTimeout(async () => {
        try {
          const collections = await mongoose.connection.db.collections();
          console.log(`📊 ${collections.length} coleções no banco de dados`);
          
          // Criar índices para performance
          const Report = require('./models/Report');
          const User = require('./models/User');
          
          await Report.createIndexes();
          await User.createIndexes();
          
          console.log("🔍 Índices otimizados para performance");
        } catch (err) {
          console.warn("⚠️  Não foi possível verificar coleções:", err.message);
        }
      }, 2000);
    })
    .catch(err => {
      reconnectAttempts++;
      console.error(`❌ Erro MongoDB (Tentativa ${reconnectAttempts}/${maxReconnectAttempts}):`, err.message);
      
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`🔄 Tentando reconectar em ${delay/1000} segundos...`);
        setTimeout(connectWithRetry, delay);
      } else {
        console.error("💥 Falha crítica: Não foi possível conectar ao MongoDB após múltiplas tentativas");
        process.exit(1);
      }
    });
};

connectWithRetry();

// Middleware para verificar conexão com DB
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: "Database temporarily unavailable",
      code: "DATABASE_UNAVAILABLE",
      message: "Serviço de banco de dados está temporariamente indisponível",
      retryAfter: 30,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// ======================
// FUNÇÃO HELPER PARA CARREGAR ROTAS COM FALLBACK
// ======================
const loadRoute = (routePath, fallbackMessage = "Rota em desenvolvimento") => {
  try {
    const route = require(routePath);
    console.log(`✅ Rota carregada: ${routePath}`);
    return route;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.warn(`⚠️  Rota não encontrada: ${routePath} - Usando fallback`);
      
      // Criar rota placeholder
      const express = require('express');
      const router = express.Router();
      
      router.all('*', (req, res) => {
        res.json({
          success: true,
          message: fallbackMessage,
          path: req.path,
          method: req.method,
          status: 'in_development',
          timestamp: new Date().toISOString()
        });
      });
      
      return router;
    }
    console.error(`❌ Erro ao carregar rota ${routePath}:`, error.message);
    throw error;
  }
};

// ======================
// ROTAS DA API (COM FALLBACK AUTOMÁTICO)
// ======================

// Rotas públicas (sem autenticação obrigatória)
app.use("/api/auth", authLimiter, loadRoute("./routes/authRoutes", "Sistema de autenticação"));

// Rotas públicas com estatísticas
app.use("/api/public/stats", loadRoute("./routes/publicStatsRoutes", "Estatísticas públicas"));

// Rota de relatórios públicos (implementação inline com paginação)
app.get("/api/reports/public", optionalAuth, async (req, res) => {
  try {
    const Report = require('./models/Report');
    const { page = 1, limit = 10, cidade, bairro, tipo } = req.query;
    
    const query = { 
      status: 'confirmado',
      isPublic: true 
    };
    
    if (cidade) query.cidade = new RegExp(cidade, 'i');
    if (bairro) query.bairro = new RegExp(bairro, 'i');
    if (tipo) query.tipoCriadouro = tipo;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [reports, total] = await Promise.all([
      Report.find(query)
        .select('-observacoesAgente -agenteResponsavel -motivoEliminacao')
        .populate('usuario', 'nome email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Report.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: skip + reports.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Erro em relatórios públicos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar relatórios públicos'
    });
  }
});

// Rotas protegidas com autenticação JWT
app.use("/api/users", authenticateToken, generalLimiter, loadRoute("./routes/userRoutes", "Gerenciamento de usuários"));
app.use("/api/reports", authenticateToken, reportLimiter, loadRoute("./routes/reportRoutes", "Gerenciamento de relatórios"));
app.use("/api/gamification", authenticateToken, generalLimiter, loadRoute("./routes/gamificationRoutes", "Sistema de gamificação"));

// Rotas administrativas
app.use("/api/admin", authenticateToken, authorizeRoles('admin', 'superadmin'), loadRoute("./routes/adminRoutes", "Painel administrativo"));

// Upload de imagens com rate limiting específico
app.use("/api/upload", authenticateToken, uploadLimiter, loadRoute("./routes/uploadRoutes", "Upload de imagens"));

// API Keys para integrações de terceiros
app.use("/api/v1/external", validateApiKey, apiLimiter, loadRoute("./routes/externalRoutes", "API para integrações externas"));

// Health check detalhado
app.get("/health", (req, res) => {
  const healthStatus = {
    status: "online",
    timestamp: new Date().toISOString(),
    service: "DengueTracker API",
    version: process.env.npm_package_version || "2.1.0",
    environment: process.env.NODE_ENV || "development",
    
    // Status do banco de dados
    database: {
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      models: Object.keys(mongoose.connection.models).length
    },
    
    // Status da aplicação
    application: {
      uptime: process.uptime(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB"
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      cpuUsage: process.cpuUsage()
    },
    
    // Status do WebSocket
    websocket: {
      clients: io.engine?.clientsCount || 0,
      usersOnline: usuariosOnline.size,
      socketSessions: socketSessions.size
    },
    
    // Status dos middlewares
    middlewares: {
      rateLimit: "active",
      sanitization: "active",
      cors: "active",
      helmet: "active",
      compression: "active"
    },
    
    // Rotas disponíveis
    routes: {
      loaded: [
        "/api/auth",
        "/api/users",
        "/api/reports", 
        "/api/gamification",
        "/api/admin",
        "/api/upload",
        "/api/v1/external",
        "/api/public/stats",
        "/api/reports/public",
        "/health",
        "/",
        "/api/docs"
      ]
    }
  };

  const statusCode = healthStatus.database.status === "connected" ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// Rota raiz com documentação
app.get("/", (req, res) => {
  res.json({
    message: "🚀 DengueTracker API v2.1",
    description: "Sistema de monitoramento e combate à dengue com gamificação",
    version: "2.1.0",
    status: "operational",
    documentation: "/api/docs",
    health: "/health",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
        refresh: "POST /api/auth/refresh",
        logout: "POST /api/auth/logout"
      },
      users: {
        profile: "GET /api/users/profile",
        update: "PUT /api/users/profile",
        list: "GET /api/users"
      },
      reports: {
        create: "POST /api/reports",
        list: "GET /api/reports",
        get: "GET /api/reports/:id",
        update: "PUT /api/reports/:id",
        delete: "DELETE /api/reports/:id",
        public: "GET /api/reports/public"
      },
      gamification: "GET /api/gamification",
      upload: {
        single: "POST /api/upload/image",
        multiple: "POST /api/upload/images"
      },
      public: {
        stats: "/api/public/stats",
        reports: "/api/reports/public"
      }
    },
    support: {
      email: "suporte@denguetracker.com",
      docs: "https://docs.denguetracker.com"
    },
    quickStart: {
      auth: "POST /api/auth/login com {email, password}",
      createReport: "POST /api/reports com token Authorization: Bearer <token>",
      uploadImage: "POST /api/upload/image com form-data"
    }
  });
});

// Rota de documentação da API
app.get("/api/docs", (req, res) => {
  res.json({
    name: "DengueTracker API Documentation",
    version: "2.1.0",
    lastUpdated: new Date().toISOString(),
    baseUrl: `${req.protocol}://${req.get('host')}`,
    authentication: {
      jwt: {
        description: "Bearer token no header Authorization",
        example: "Authorization: Bearer <seu_token_jwt>"
      },
      apiKey: {
        description: "X-API-Key header para integrações",
        example: "X-API-Key: <sua_chave_api>"
      }
    },
    rateLimiting: {
      general: "100 requests per 15 minutes",
      auth: "20 requests per 15 minutes", 
      reports: "50 requests per 15 minutes",
      upload: "30 requests per 15 minutes",
      apiKeys: "1000 requests per hour"
    },
    endpoints: require('./docs/endpoints.json') || {
      message: "Documentação completa em desenvolvimento"
    }
  });
});

// Servir arquivos estáticos (uploads) com segurança
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", 
  (req, res, next) => {
    // Proteger acesso a arquivos de upload
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 horas
    next();
  },
  express.static(uploadsPath, {
    dotfiles: 'ignore',
    index: false,
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      // Validar que é uma imagem
      const ext = path.extname(filePath).toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      if (!allowedExtensions.includes(ext)) {
        res.status(403).end();
      }
    }
  })
);

// Servir documentação OpenAPI se existir
if (process.env.NODE_ENV !== 'production') {
  const docsPath = path.join(__dirname, "docs");
  app.use("/api-docs", express.static(docsPath));
}

// ======================
// MANIPULAÇÃO DE ERROS (ATUALIZADA)
// ======================

// Contador de requisições
app.set('requestCount', 0);
app.use((req, res, next) => {
  req.app.set('requestCount', req.app.get('requestCount') + 1);
  next();
});

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    code: "ENDPOINT_NOT_FOUND",
    path: req.path,
    method: req.method,
    availableEndpoints: [
      "/",
      "/health",
      "/api/docs",
      "/api/auth/login",
      "/api/auth/register",
      "/api/reports",
      "/api/users/profile",
      "/api/reports/public",
      "/api/upload/image"
    ],
    timestamp: new Date().toISOString(),
    requestId: Date.now().toString(36) + Math.random().toString(36).substr(2)
  });
});

// Manipulador de erros global
app.use((err, req, res, next) => {
  // Log detalhado do erro
  const errorLog = {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.userId || 'anonymous',
    timestamp: new Date().toISOString(),
    requestId: req.id || Date.now().toString(36)
  };

  console.error("🔥 Error:", errorLog);

  // Erros específicos
  let statusCode = 500;
  let response = {
    success: false,
    error: "Internal Server Error",
    code: "INTERNAL_SERVER_ERROR",
    timestamp: new Date().toISOString(),
    requestId: errorLog.requestId
  };

  if (err.name === 'ValidationError') {
    statusCode = 400;
    response = {
      success: false,
      error: "Validation Error",
      code: "VALIDATION_ERROR",
      message: err.message,
      details: err.errors,
      timestamp: new Date().toISOString()
    };
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    response = {
      success: false,
      error: "Authentication Error",
      code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      message: err.message,
      timestamp: new Date().toISOString()
    };
  } else if (err.code === 11000) {
    statusCode = 409;
    response = {
      success: false,
      error: "Duplicate Entry",
      code: "DUPLICATE_KEY",
      message: "A record with this information already exists",
      details: err.keyValue,
      timestamp: new Date().toISOString()
    };
  } else if (err.status === 429) {
    statusCode = 429;
    response = {
      success: false,
      error: "Rate Limit Exceeded",
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
      retryAfter: err.retryAfter,
      timestamp: new Date().toISOString()
    };
  } else if (err.status === 404) {
    statusCode = 404;
    response = {
      success: false,
      error: "Resource Not Found",
      code: "RESOURCE_NOT_FOUND",
      message: err.message,
      timestamp: new Date().toISOString()
    };
  } else if (process.env.NODE_ENV === 'development') {
    response = {
      ...response,
      message: err.message,
      stack: err.stack
    };
  }

  res.status(statusCode).json(response);
});

// ======================
// INICIAR SERVIDOR COM GRACEFUL SHUTDOWN
// ======================
const PORT = process.env.PORT || 5000;

let isShuttingDown = false;

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  
  isShuttingDown = true;
  console.log(`\n⚠️  Recebido sinal ${signal}. Iniciando shutdown graceful...`);
  
  try {
    // 1. Parar de aceitar novas conexões
    server.close(async () => {
      console.log('✅ Servidor HTTP fechado');
      
      // 2. Desconectar todos os sockets
      if (io) {
        io.close(() => {
          console.log('✅ WebSocket server fechado');
        });
      }
      
      // 3. Fechar conexão com MongoDB
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log('✅ Conexão MongoDB fechada');
      }
      
      // 4. Finalizar processo
      console.log('👋 Shutdown graceful completo');
      process.exit(0);
    });
    
    // Timeout de segurança
    setTimeout(() => {
      console.error('⏰ Timeout de shutdown. Forçando saída...');
      process.exit(1);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Erro durante shutdown:', error);
    process.exit(1);
  }
};

// Capturar sinais de término
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Iniciar servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ======================================================
  🚀 SERVIDOR DENGUE TRACKER v2.1 INICIADO
  ======================================================
  🔗 URL Local: http://localhost:${PORT}
  🔗 URL Network: http://0.0.0.0:${PORT}
  📁 Ambiente: ${process.env.NODE_ENV || 'development'}
  🗄️  Database: ${mongoose.connection.host || 'localhost'}
  🔒 Segurança: Helmet, CORS, RateLimit, Sanitization
  💾 Backup: ${process.env.NODE_ENV === 'production' ? 'Ativo (03:00 AM)' : 'Desativado em dev'}
  📈 WebSocket: Ativo
  📷 Upload: Sistema de imagens ativo
  🧹 Maintenance: Auto-cleanup ativo
  ======================================================
  `);
  
  // Exibir rotas disponíveis
  console.log('\n📋 Rotas principais:');
  console.log('  /                     - Documentação inicial');
  console.log('  /health               - Health check completo');
  console.log('  /api/docs             - Documentação da API');
  console.log('  /api/auth/*           - Autenticação');
  console.log('  /api/reports/*        - Relatórios de dengue');
  console.log('  /api/users/*          - Gerenciamento de usuários');
  console.log('  /api/gamification/*   - Sistema de gamificação');
  console.log('  /api/admin/*          - Painel administrativo (admin only)');
  console.log('  /api/upload/*         - Upload de imagens');
  console.log('  /api/public/stats     - Estatísticas públicas');
  console.log('  /api/reports/public   - Relatórios públicos');
  console.log('  /uploads/*            - Imagens enviadas');
  console.log('  /api/v1/external/*    - API para integrações');
  console.log('======================================================\n');
  
  // Exibir informações importantes
  console.log('💡 Dicas rápidas:');
  console.log('  • Uploads: POST /api/upload/image (multipart/form-data)');
  console.log(`  • Teste rápido: curl http://localhost:${PORT}/health`);
  console.log('  • Relatórios públicos: /api/reports/public?page=1&limit=10');
  console.log('  • Documentação completa: /api/docs');
});

module.exports = { app, io, server, mongoose };