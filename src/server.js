require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");
const helmet = require("helmet");
const cron = require("node-cron");

// Importação de Scripts e Utilitários de Infraestrutura
const realizarBackup = require("./scripts/backup");
const validateEnv = require("./scripts/validateEnv");

const app = express();
const server = http.createServer(app);

// Validação inicial do ambiente
if (typeof validateEnv === 'function') validateEnv();

// ======================
// CONFIGURAÇÕES DE SEGURANÇA
// ======================
const { generalLimiter, authLimiter, reportLimiter } = require("./middleware/rateLimit");
const { setUser } = require("./middleware/auth");

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"];
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Não permitido por CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
};

app.use(helmet(process.env.NODE_ENV === 'production' ? {} : { contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use(setUser);

// ======================
// BACKUP AUTOMÁTICO (NOVO)
// ======================
// Agenda o backup para rodar todos os dias às 03:00 AM
cron.schedule('0 3 * * *', () => {
  console.log('📅 [SISTEMA] Iniciando rotina de backup diário...');
  if (typeof realizarBackup === 'function') realizarBackup();
});

// ======================
// WEBSOCKET CONFIGURAÇÃO
// ======================
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  transports: ['websocket', 'polling']
});

// Importar lógica de Socket (Sugestão: mover a lógica abaixo para src/sockets/index.js no futuro)
const usuariosOnline = new Map();
io.on("connection", (socket) => {
  // ... (Sua lógica de socket existente permanece aqui)
  console.log(`🔌 Socket ID: ${socket.id} conectado`);
  
  socket.on("usuario-entrou", (dados) => {
    // Mantém sua lógica de autenticação via socket
    usuariosOnline.set(dados.usuarioId, { socketId: socket.id, nome: dados.nome });
    socket.join("sala-global");
    socket.emit("usuario-autenticado", { success: true, message: `Bem-vindo, ${dados.nome}!` });
  });

  socket.on("disconnect", () => {
    // Limpeza de usuários online
    for (let [uid, u] of usuariosOnline) {
      if (u.socketId === socket.id) { usuariosOnline.delete(uid); break; }
    }
  });
});

// Tornar io disponível globalmente
global.io = io;

// ======================
// CONEXÃO MONGODB & ÍNDICES
// ======================
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/denguetracker", mongoOptions)
  .then(() => {
    console.log("✅ MongoDB conectado com sucesso!");
    // Aqui os índices definidos nos Models (Report.index / User.index) são criados automaticamente
  })
  .catch(err => console.error("❌ Erro MongoDB:", err));

// ======================
// ROTAS DA API
// ======================
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/reports", reportLimiter, require("./routes/reportRoutes")); 
app.use("/api/gamification", require("./routes/gamificationRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));

// Health check detalhado
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    db: mongoose.connection.readyState === 1 ? "connected" : "error",
    clients: io.engine.clientsCount,
    uptime: process.uptime()
  });
});

// ======================
// INICIAR SERVIDOR
// ======================
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ======================================================
  🚀 SERVIDOR DENGUE TRACKER v2.1 INICIADO
  ======================================================
  🔗 URL: http://localhost:${PORT}
  🔒 Segurança: Helmet, CORS, RateLimit Ativos
  💾 Backup: Agendado para as 03:00 AM
  📈 DB: Índices de Performance Geoespaciais Ativos
  ======================================================
  `);
});

module.exports = { io, server };