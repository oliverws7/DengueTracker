require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");
const helmet = require("helmet");

const app = express();
const server = http.createServer(app);

// ======================
// CONFIGURAÇÕES DE SEGURANÇA
// ======================

// Importar middlewares de segurança
const { generalLimiter, authLimiter, reportLimiter } = require("./middleware/rateLimit");
const { setUser } = require("./middleware/auth");

// Configuração de CORS - Mais robusta
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000", 
      "http://localhost:5173", 
      "http://localhost:8081", 
      "http://localhost:19006",
      "http://localhost:5000"
    ];
    
    // Permitir requisições sem origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS bloqueado: ${origin}`);
      callback(new Error('Não permitido por CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "X-Api-Key"],
  exposedHeaders: ["X-Total-Count", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware de segurança HELMET
if (process.env.NODE_ENV === 'production') {
  // Configuração rigorosa para produção
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
} else {
  // Configuração mais permissiva para desenvolvimento
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
  }));
}

// Aplicar CORS
app.use(cors(corsOptions));

// Parse JSON com limite
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// RATE LIMITING
// ======================

// Rate limiting global para todas as rotas
app.use('/api/', generalLimiter);

// Rate limiting específico para autenticação
app.use('/api/auth/', authLimiter);

// ======================
// MIDDLEWARES PERSONALIZADOS
// ======================

// Middleware para extrair usuário do token (se existir)
app.use(setUser);

// ======================
// WEBSOCKET CONFIGURAÇÃO
// ======================

// Configurar WebSocket com opções robustas
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"]
      : "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e8 // 100MB para uploads grandes
});

// Log quando o servidor Socket.IO estiver pronto
io.engine.on("connection", (rawSocket) => {
  console.log("🔧 Socket.IO engine: Nova conexão raw detectada");
});

// Sistema de salas e usuários online
const usuariosOnline = new Map();
const salasAtivas = new Set();

// WebSocket Connection Handler
io.on("connection", (socket) => {
  console.log("=".repeat(50));
  console.log("🎉 NOVA CONEXÃO WEBSOCKET ESTABELECIDA!");
  console.log(`🔌 Socket ID: ${socket.id}`);
  console.log(`🌐 Origin: ${socket.handshake.headers.origin}`);
  console.log(`📨 User-Agent: ${socket.handshake.headers['user-agent']}`);
  console.log("=".repeat(50));
  
  // Rate limiting por socket (prevenir abuso)
  let messageCount = 0;
  const messageLimit = 100; // Máximo 100 mensagens por minuto
  const timeWindow = 60000; // 1 minuto
  
  setInterval(() => {
    messageCount = 0;
  }, timeWindow);
  
  // Enviar mensagem de boas-vindas
  socket.emit("conexao-estabelecida", {
    event: "conexao-estabelecida",
    message: "✅ Conectado ao Dengue Tracker!",
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    server: "Dengue Tracker API v2.0",
    security: {
      jwtEnabled: true,
      rateLimiting: true,
      validation: true
    },
    endpoints: {
      ping: "Envie {event: 'ping'}",
      usuario_entrou: "Envie {event: 'usuario-entrou', usuarioId: '...', nome: '...'}",
      ranking: "Envie {event: 'entrar-sala-ranking'}"
    }
  });

  // Evento: Ping para manter conexão
  socket.on("ping", () => {
    if (messageCount++ > messageLimit) {
      return socket.emit("rate-limit-exceeded", {
        event: "rate-limit-exceeded",
        message: "Limite de mensagens excedido. Aguarde 1 minuto."
      });
    }
    
    console.log(`🏓 Ping recebido de ${socket.id}`);
    socket.emit("pong", { 
      event: "pong",
      timestamp: new Date().toISOString(),
      message: "Pong do servidor Dengue Tracker!",
      receivedAt: new Date().toISOString()
    });
  });

  // Evento: Teste simples
  socket.on("hello", (data) => {
    if (messageCount++ > messageLimit) {
      return socket.emit("rate-limit-exceeded", {
        event: "rate-limit-exceeded",
        message: "Limite de mensagens excedido. Aguarde 1 minuto."
      });
    }
    
    console.log("👋 Hello recebido:", data);
    socket.emit("hello-response", { 
      event: "hello-response",
      message: "Olá do servidor Dengue Tracker!",
      yourData: data,
      timestamp: new Date().toISOString()
    });
  });

  // Evento: Usuário entra no app (COM VALIDAÇÃO)
  socket.on("usuario-entrou", (dadosUsuario) => {
    try {
      if (messageCount++ > messageLimit) {
        return socket.emit("rate-limit-exceeded", {
          event: "rate-limit-exceeded",
          message: "Limite de mensagens excedido. Aguarde 1 minuto."
        });
      }
      
      const { usuarioId, nome, token } = dadosUsuario;
      
      // VALIDAÇÃO: Dados obrigatórios
      if (!usuarioId || !nome) {
        return socket.emit("erro-validacao", { 
          event: "erro-validacao",
          message: "Dados incompletos. Precisa de usuarioId e nome.",
          code: "VALIDATION_ERROR"
        });
      }
      
      // VALIDAÇÃO: Verificar token JWT se fornecido
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dengue-tracker-secret');
          
          if (decoded.userId !== usuarioId) {
            return socket.emit("erro-autenticacao", {
              event: "erro-autenticacao",
              message: "Token inválido para este usuário",
              code: "AUTH_ERROR"
            });
          }
        } catch (jwtError) {
          return socket.emit("erro-autenticacao", {
            event: "erro-autenticacao",
            message: "Token JWT inválido ou expirado",
            code: "JWT_ERROR"
          });
        }
      }
      
      // Registrar usuário online
      usuariosOnline.set(usuarioId, {
        socketId: socket.id,
        nome: nome,
        conectadoEm: new Date(),
        ultimaAtividade: new Date(),
        token: token ? "valid" : "none"
      });

      // Entrar na sala do usuário
      socket.join(`usuario:${usuarioId}`);
      
      // Entrar na sala global
      socket.join("sala-global");
      
      console.log(`👤 ${nome} entrou no app (ID: ${usuarioId})`);
      console.log(`📊 Usuários online agora: ${usuariosOnline.size}`);
      
      // Atualizar atividade do usuário
      usuariosOnline.get(usuarioId).ultimaAtividade = new Date();
      
      // Notificar todos sobre usuários online
      io.to("sala-global").emit("usuarios-online-atualizados", {
        event: "usuarios-online-atualizados",
        success: true,
        totalOnline: usuariosOnline.size,
        usuarios: Array.from(usuariosOnline.values()).map(u => ({
          nome: u.nome,
          conectadoEm: u.conectadoEm,
          ultimaAtividade: u.ultimaAtividade
        })),
        timestamp: new Date().toISOString()
      });

      // Confirmar para o usuário
      socket.emit("usuario-autenticado", {
        event: "usuario-autenticado",
        success: true,
        message: `Bem-vindo, ${nome}!`,
        usuarioId: usuarioId,
        timestamp: new Date().toISOString(),
        salas: ["usuario:" + usuarioId, "sala-global"],
        security: {
          authenticated: !!token,
          role: token ? "user" : "guest"
        }
      });
      
    } catch (error) {
      console.error("Erro em usuario-entrou:", error);
      socket.emit("erro-interno", { 
        event: "erro-interno",
        message: "Erro interno do servidor",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: "INTERNAL_ERROR"
      });
    }
  });

  // Evento: Entrar na sala de ranking
  socket.on("entrar-sala-ranking", (dados) => {
    if (messageCount++ > messageLimit) {
      return socket.emit("rate-limit-exceeded", {
        event: "rate-limit-exceeded",
        message: "Limite de mensagens excedido. Aguarde 1 minuto."
      });
    }
    
    socket.join("sala-ranking");
    salasAtivas.add("sala-ranking");
    console.log(`📊 ${socket.id} entrou na sala de ranking`);
    
    // Enviar dados de ranking fake para teste
    const rankingFake = [
      { nome: "João Silva", pontos: 150, nivel: "caçador" },
      { nome: "Maria Santos", pontos: 120, nivel: "caçador" },
      { nome: "Pedro Oliveira", pontos: 90, nivel: "iniciante" }
    ];
    
    socket.emit("ranking-atualizado", {
      event: "ranking-atualizado",
      sala: "ranking",
      message: "Você entrou na sala de ranking",
      ranking: rankingFake,
      timestamp: new Date().toISOString()
    });
  });

  // Evento: Entrar na sala de admin (COM AUTENTICAÇÃO)
  socket.on("entrar-sala-admin", (dados) => {
    try {
      if (messageCount++ > messageLimit) {
        return socket.emit("rate-limit-exceeded", {
          event: "rate-limit-exceeded",
          message: "Limite de mensagens excedido. Aguarde 1 minuto."
        });
      }
      
      const { token } = dados;
      
      // VERIFICAÇÃO DE TOKEN JWT
      if (!token) {
        return socket.emit("erro-autorizacao", {
          event: "erro-autorizacao",
          message: "Token de administrador necessário",
          code: "AUTH_REQUIRED"
        });
      }
      
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dengue-tracker-secret');
      
      // VERIFICAÇÃO DE ROLE
      if (decoded.role !== 'admin') {
        return socket.emit("erro-autorizacao", {
          event: "erro-autorizacao",
          message: "Acesso negado. Somente administradores.",
          code: "FORBIDDEN"
        });
      }
      
      socket.join("sala-admin");
      salasAtivas.add("sala-admin");
      console.log(`🛡️ ${socket.id} entrou na sala admin (Usuário: ${decoded.name})`);
      
      socket.emit("sala-entrada-confirmada", {
        event: "sala-entrada-confirmada",
        sala: "admin",
        message: "Você entrou na sala admin",
        user: {
          name: decoded.name,
          email: decoded.email,
          role: decoded.role
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Erro em entrar-sala-admin:", error);
      socket.emit("erro-autenticacao", {
        event: "erro-autenticacao",
        message: "Falha na autenticação para sala admin",
        code: "AUTH_FAILED"
      });
    }
  });

  // Evento: Simular novo reporte (COM VALIDAÇÃO)
  socket.on("novo-reporte", (dadosReporte) => {
    try {
      if (messageCount++ > messageLimit) {
        return socket.emit("rate-limit-exceeded", {
          event: "rate-limit-exceeded",
          message: "Limite de mensagens excedido. Aguarde 1 minuto."
        });
      }
      
      console.log("📋 Novo reporte simulado:", dadosReporte);
      
      // VALIDAÇÃO BÁSICA DOS DADOS
      if (!dadosReporte.localizacao || !dadosReporte.localizacao.lat || !dadosReporte.localizacao.lng) {
        return socket.emit("erro-validacao", {
          event: "erro-validacao",
          message: "Localização é obrigatória",
          code: "LOCATION_REQUIRED"
        });
      }
      
      // VALIDAÇÃO DE COORDENADAS
      const { lat, lng } = dadosReporte.localizacao;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return socket.emit("erro-validacao", {
          event: "erro-validacao",
          message: "Coordenadas inválidas",
          code: "INVALID_COORDINATES"
        });
      }
      
      // Emitir para sala global
      io.to("sala-global").emit("reporte-criado", {
        event: "reporte-criado",
        success: true,
        reporte: dadosReporte,
        timestamp: new Date().toISOString(),
        message: "Novo foco de dengue reportado na sua área!",
        validation: {
          coordinatesValid: true,
          timestamp: new Date().toISOString()
        }
      });
      
      // Se tiver coordenadas, emitir para área específica
      if (dadosReporte.localizacao) {
        const { lat, lng } = dadosReporte.localizacao;
        const salaArea = `area:${lat.toFixed(2)}:${lng.toFixed(2)}`;
        io.to(salaArea).emit("reporte-na-area", {
          event: "reporte-na-area",
          reporte: dadosReporte,
          area: salaArea,
          timestamp: new Date().toISOString(),
          coordinates: { lat, lng }
        });
      }
      
    } catch (error) {
      console.error("Erro em novo-reporte:", error);
      socket.emit("erro-interno", {
        event: "erro-interno",
        message: "Erro ao processar reporte",
        code: "REPORT_ERROR"
      });
    }
  });

  // Evento: Ouvir reportes de uma área específica (COM VALIDAÇÃO)
  socket.on("ouvir-area", (dadosArea) => {
    try {
      if (messageCount++ > messageLimit) {
        return socket.emit("rate-limit-exceeded", {
          event: "rate-limit-exceeded",
          message: "Limite de mensagens excedido. Aguarde 1 minuto."
        });
      }
      
      const { lat, lng, raio } = dadosArea;
      
      // VALIDAÇÃO DE COORDENADAS
      if (lat === undefined || lng === undefined) {
        return socket.emit("erro-validacao", { 
          event: "erro-validacao",
          message: "Coordenadas (lat, lng) são obrigatórias",
          code: "COORDINATES_REQUIRED"
        });
      }
      
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return socket.emit("erro-validacao", { 
          event: "erro-validacao",
          message: "Coordenadas inválidas. Lat: -90 a 90, Lng: -180 a 180",
          code: "INVALID_COORDINATES"
        });
      }
      
      // VALIDAÇÃO DE RAIO
      const raioValidado = raio && raio > 0 && raio <= 100 ? raio : 10;
      
      const salaArea = `area:${lat.toFixed(2)}:${lng.toFixed(2)}`;
      socket.join(salaArea);
      salasAtivas.add(salaArea);
      
      console.log(`🗺️ ${socket.id} ouvindo área ${salaArea} (raio: ${raioValidado}km)`);
      
      socket.emit("area-configurada", {
        event: "area-configurada",
        sala: salaArea,
        lat: lat,
        lng: lng,
        raio: raioValidado,
        message: `🔔 Agora ouvindo reportes na área ${salaArea}`,
        timestamp: new Date().toISOString(),
        validation: {
          coordinatesValid: true,
          radiusValid: raioValidado === raio
        }
      });
      
    } catch (error) {
      console.error("Erro em ouvir-area:", error);
      socket.emit("erro-interno", { 
        event: "erro-interno",
        message: "Erro ao configurar área",
        code: "AREA_ERROR"
      });
    }
  });

  // Evento: Obter estatísticas
  socket.on("obter-estatisticas", () => {
    if (messageCount++ > messageLimit) {
      return socket.emit("rate-limit-exceeded", {
        event: "rate-limit-exceeded",
        message: "Limite de mensagens excedido. Aguarde 1 minuto."
      });
    }
    
    socket.emit("estatisticas-atualizadas", {
      event: "estatisticas-atualizadas",
      totalUsuarios: usuariosOnline.size,
      salasAtivas: Array.from(salasAtivas),
      timestamp: new Date().toISOString(),
      estatisticas: {
        usuariosOnline: usuariosOnline.size,
        conexoesAtivas: io.engine.clientsCount,
        memoria: process.memoryUsage(),
        uptime: process.uptime()
      },
      security: {
        rateLimiting: true,
        jwtEnabled: true,
        validationEnabled: true
      }
    });
  });

  // Evento: Disconnect
  socket.on("disconnect", (reason) => {
    console.log("=".repeat(40));
    console.log("❌ Cliente desconectado:", socket.id);
    console.log("📝 Motivo:", reason);
    console.log("=".repeat(40));
    
    // Remover usuário dos online
    for (const [usuarioId, dados] of usuariosOnline.entries()) {
      if (dados.socketId === socket.id) {
        usuariosOnline.delete(usuarioId);
        console.log(`👋 ${dados.nome} saiu do app`);
        
        // Remover de salas ativas
        salasAtivas.delete(`usuario:${usuarioId}`);
        
        // Notificar sobre mudança de usuários online
        io.to("sala-global").emit("usuarios-online-atualizados", {
          success: true,
          totalOnline: usuariosOnline.size,
          usuarios: Array.from(usuariosOnline.values()).map(u => ({
            nome: u.nome,
            conectadoEm: u.conectadoEm
          })),
          event: "usuarios-online-atualizados",
          timestamp: new Date().toISOString()
        });
        break;
      }
    }
    
    // Limpar salas vazias
    salasAtivas.forEach(sala => {
      const clientsInRoom = io.sockets.adapter.rooms.get(sala);
      if (!clientsInRoom || clientsInRoom.size === 0) {
        salasAtivas.delete(sala);
      }
    });
  });

  // Evento: Error handling
  socket.on("error", (error) => {
    console.error("💥 Erro no WebSocket:", error);
  });
});

// ======================
// CONEXÃO MONGODB
// ======================

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority'
};

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/dengue-tracker", mongoOptions)
  .then(() => console.log("✅ MongoDB conectado com sucesso!"))
  .catch(err => {
    console.log("❌ MongoDB erro:", err.message);
    // Tentar reconectar após 5 segundos
    setTimeout(() => {
      console.log("🔄 Tentando reconectar ao MongoDB...");
      mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    }, 5000);
  });

// Tornar io disponível globalmente
global.io = io;

// ======================
// ROTAS DA API
// ======================

// Static files (protegido)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Importar rotas
const userRoutes = require("./routes/userRoutes");
const reportRoutes = require("./routes/reportRoutes"); 
const gamificationRoutes = require("./routes/gamificationRoutes");
const authRoutes = require("./routes/authRoutes");

// Aplicar middlewares específicos para rotas
app.use("/api/users", userRoutes);
app.use("/api/reports", reportLimiter, reportRoutes); // Rate limiting específico para reports
app.use("/api/gamification", gamificationRoutes);
app.use("/api/auth", authRoutes);

// ======================
// ROTAS GERAIS
// ======================

// Health check com informações de segurança
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "online",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    websockets: io.engine?.clientsCount || 0,
    event: "health-check",
    environment: process.env.NODE_ENV || "development",
    security: {
      jwt: !!process.env.JWT_SECRET,
      cors: !!process.env.ALLOWED_ORIGINS,
      rateLimiting: true,
      helmet: true
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Rota para teste WebSocket
app.get("/teste-simples", (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Teste WebSocket Socket.IO</title>
    <meta charset="UTF-8">
    <script src="/socket.io/socket.io.js"></script>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      .status { padding: 10px; font-weight: bold; margin: 10px 0; }
      .connected { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
      .disconnected { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
      button { padding: 10px 15px; margin: 5px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; }
      button:hover { background: #2980b9; }
      button:disabled { background: #95a5a6; cursor: not-allowed; }
      #log { background: #f5f5f5; padding: 15px; margin-top: 20px; border-radius: 5px; height: 400px; overflow-y: auto; font-family: 'Courier New', monospace; }
      .log-entry { margin-bottom: 5px; padding: 5px; border-bottom: 1px solid #ddd; }
      .security-badge { 
        display: inline-block; 
        padding: 2px 8px; 
        margin: 2px; 
        border-radius: 3px; 
        font-size: 12px; 
        font-weight: bold; 
      }
      .badge-success { background: #d4edda; color: #155724; }
      .badge-warning { background: #fff3cd; color: #856404; }
      .badge-danger { background: #f8d7da; color: #721c24; }
    </style>
  </head>
  <body>
    <h1>🧪 Teste Socket.IO - Dengue Tracker</h1>
    <p>Security Features: 
      <span class="security-badge badge-success">JWT</span>
      <span class="security-badge badge-success">Rate Limiting</span>
      <span class="security-badge badge-success">Validation</span>
      <span class="security-badge badge-success">CORS</span>
    </p>
    
    <div class="status disconnected" id="status">⚫ DESCONECTADO</div>
    
    <div>
      <button onclick="connect()" id="btnConnect">🔗 Conectar</button>
      <button onclick="sendPing()" id="btnPing" disabled>🏓 Enviar Ping</button>
      <button onclick="testUser()" id="btnUser" disabled>👤 Testar Usuário</button>
      <button onclick="testReport()" id="btnReport" disabled>📋 Testar Reporte</button>
      <button onclick="testAdmin()" id="btnAdmin" disabled>🛡️ Testar Admin</button>
      <button onclick="disconnect()" id="btnDisconnect" disabled>❌ Desconectar</button>
    </div>
    
    <div>
      <h3>Token JWT de Teste (modifique no console):</h3>
      <textarea id="jwtToken" rows="4" cols="80" style="width: 100%; font-family: monospace; padding: 10px;">
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0XzEyMyIsIm5hbWUiOiJVc3VhcmlvIFRlc3RlIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE2OTg5MDE1MjYsImV4cCI6NDg1MjUwMTUyNn0.mVj9b5QvKQ7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q</textarea>
    </div>
    
    <div id="log"></div>

    <script>
      let socket = null;
      const log = document.getElementById('log');
      
      function addLog(message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = \`<strong>[\${time}]</strong> \${message}\`;
        
        if (type === 'success') logEntry.style.color = 'green';
        if (type === 'error') logEntry.style.color = 'red';
        if (type === 'warning') logEntry.style.color = 'orange';
        
        log.appendChild(logEntry);
        log.scrollTop = log.scrollHeight;
      }
      
      function updateUI(connected) {
        const statusDiv = document.getElementById('status');
        if (connected) {
          statusDiv.className = 'status connected';
          statusDiv.textContent = '✅ CONECTADO (Socket.IO)';
          document.getElementById('btnConnect').disabled = true;
          document.getElementById('btnPing').disabled = false;
          document.getElementById('btnUser').disabled = false;
          document.getElementById('btnReport').disabled = false;
          document.getElementById('btnAdmin').disabled = false;
          document.getElementById('btnDisconnect').disabled = false;
        } else {
          statusDiv.className = 'status disconnected';
          statusDiv.textContent = '⚫ DESCONECTADO';
          document.getElementById('btnConnect').disabled = false;
          document.getElementById('btnPing').disabled = true;
          document.getElementById('btnUser').disabled = true;
          document.getElementById('btnReport').disabled = true;
          document.getElementById('btnAdmin').disabled = true;
          document.getElementById('btnDisconnect').disabled = true;
        }
      }
      
      function connect() {
        if (socket && socket.connected) return;
        
        addLog('🔗 Tentando conectar via Socket.IO...');
        
        socket = io();
        
        socket.on('connect', () => {
          addLog('✅ Conectado com ID: ' + socket.id, 'success');
          updateUI(true);
        });
        
        socket.on('disconnect', (reason) => {
          addLog('❌ Desconectado: ' + reason, 'error');
          updateUI(false);
        });
        
        socket.on('connect_error', (error) => {
          addLog('💥 Erro de conexão: ' + error.message, 'error');
          updateUI(false);
        });

        // Eventos de segurança
        socket.on('rate-limit-exceeded', (data) => {
          addLog('⚠️ Rate Limit: ' + data.message, 'warning');
        });

        socket.on('erro-validacao', (data) => {
          addLog('❌ Erro Validação: ' + data.message, 'error');
        });

        socket.on('erro-autenticacao', (data) => {
          addLog('🔐 Erro Autenticação: ' + data.message, 'error');
        });

        // Eventos normais
        socket.on('pong', (data) => {
           addLog('🏓 Pong recebido: ' + data.message, 'success');
        });

        socket.on('usuario-autenticado', (data) => {
           addLog('👤 Autenticado: ' + data.message, 'success');
        });

        socket.on('reporte-criado', (data) => {
           addLog('📋 Reporte criado: ' + data.message, 'success');
        });
        
        // Debug: log de todos os eventos
        socket.onAny((event, ...args) => {
            console.log('📡 Evento:', event, args);
        });
      }
      
      function sendPing() {
        if (!socket) return;
        addLog('Enviando ping...');
        socket.emit('ping');
      }
      
      function testUser() {
        if (!socket) return;
        const userId = 'test_' + Date.now();
        const nome = 'Usuário Teste';
        const token = document.getElementById('jwtToken').value.trim();
        
        addLog('Enviando usuario-entrou com JWT...');
        socket.emit('usuario-entrou', { 
          usuarioId: userId, 
          nome: nome,
          token: token || null
        });
      }
      
      function testReport() {
        if (!socket) return;
        const dados = {
            localizacao: { lat: -23.55, lng: -46.63 },
            tipo: 'pneu',
            descricao: 'Teste via WebSocket',
            usuario: 'test_user'
        };
        addLog('Enviando novo-reporte...');
        socket.emit('novo-reporte', dados);
      }
      
      function testAdmin() {
        if (!socket) return;
        const token = document.getElementById('jwtToken').value.trim();
        
        if (!token) {
          addLog('⚠️ Insira um token JWT para testar admin', 'warning');
          return;
        }
        
        addLog('Tentando entrar na sala admin...');
        socket.emit('entrar-sala-admin', { token: token });
      }
      
      function disconnect() {
        if (socket) {
          socket.disconnect();
          addLog('Desconectando manualmente...');
        }
      }
      
      // Auto conectar
      setTimeout(connect, 1000);
    </script>
  </body>
  </html>
`;
  res.send(html);
});

// Rota básica da API
app.get("/", (req, res) => {
  res.json({ 
    success: true,
    message: "🚀 API Dengue Tracker funcionando!",
    version: "2.1.0",
    security: {
      jwt: "🔐 Sistema de autenticação JWT",
      bcrypt: "🔒 Hash de senhas com bcrypt",
      roles: "👮 Middleware de autorização por roles",
      rate_limiting: "⏱️ Rate limiting para prevenir abuso",
      validation: "✅ Validação de dados robusta",
      cors: "🌐 CORS configurado adequadamente"
    },
    websockets: "🔔 WebSockets ativos com validação!",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      reports: "/api/reports", 
      gamification: "/api/gamification",
      health: "/health",
      testeSimples: "/teste-simples"
    },
    environment: process.env.NODE_ENV || "development",
    event: "api-info",
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada",
    path: req.path,
    event: "not-found",
    suggestions: ["/", "/health", "/teste-simples", "/api/gamification/ranking"],
    timestamp: new Date().toISOString()
  });
});

// Error Handler Global
app.use((err, req, res, next) => {
  console.error("💥 Erro no servidor:", err);
  
  // Determinar tipo de erro
  const isValidationError = err.name === 'ValidationError' || err.isJoi;
  const isJwtError = err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError';
  const isRateLimitError = err.name === 'RateLimitError';
  
  const statusCode = isValidationError ? 400 : 
                    isJwtError ? 401 : 
                    isRateLimitError ? 429 : 
                    err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === "development" ? err.message : getErrorMessage(err),
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      type: err.name 
    }),
    event: "server-error",
    code: err.code || "INTERNAL_ERROR",
    timestamp: new Date().toISOString()
  });
});

// Função para mensagens de erro amigáveis em produção
function getErrorMessage(err) {
  if (err.name === 'ValidationError') return "Dados de entrada inválidos";
  if (err.name === 'JsonWebTokenError') return "Token de autenticação inválido";
  if (err.name === 'TokenExpiredError') return "Token de autenticação expirado";
  if (err.name === 'RateLimitError') return "Muitas requisições. Tente novamente mais tarde.";
  return "Erro interno do servidor";
}

// ======================
// INICIAR SERVIDOR
// ======================

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("=".repeat(60));
  console.log("🚀 SERVIDOR DENGUE TRACKER INICIADO!");
  console.log("=".repeat(60));
  console.log(`✅ Porta: ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🔗 Teste Simples: http://localhost:${PORT}/teste-simples`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Info: http://localhost:${PORT}/`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? "Atlas" : "Local"}`);
  console.log("=".repeat(60));
  console.log("🔒 RECURSOS DE SEGURANÇA ATIVADOS:");
  console.log("  • ✅ JWT Authentication");
  console.log("  • ✅ Password Hashing (bcrypt)");
  console.log("  • ✅ Role-based Authorization");
  console.log("  • ✅ Rate Limiting");
  console.log("  • ✅ Data Validation");
  console.log("  • ✅ CORS Configuration");
  console.log("=".repeat(60));
  console.log("🔔 WebSockets PRONTOS para conexões!");
  console.log("=".repeat(60));
});

module.exports = { io, server };