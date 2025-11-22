require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);

// Configurar WebSocket com opções robustas
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8081", "http://localhost:19006"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware básico
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Sistema de salas e usuários online
const usuariosOnline = new Map();
const salasAtivas = new Set();

// WebSocket Connection Handler
io.on("connection", (socket) => {
  console.log("🔌 Novo cliente conectado:", socket.id);

  // Evento: Usuário entra no app
  socket.on("usuario-entrou", (dadosUsuario) => {
    const { usuarioId, nome } = dadosUsuario;
    
    // Registrar usuário online
    usuariosOnline.set(usuarioId, {
      socketId: socket.id,
      nome: nome,
      conectadoEm: new Date()
    });

    // Entrar na sala do usuário
    socket.join(`usuario:${usuarioId}`);
    
    // Entrar na sala global
    socket.join("sala-global");
    
    console.log(`👤 ${nome} entrou no app (${usuarioId})`);
    
    // Notificar todos sobre usuários online
    io.to("sala-global").emit("usuarios-online-atualizados", {
      totalOnline: usuariosOnline.size,
      usuarios: Array.from(usuariosOnline.values()).map(u => ({
        nome: u.nome,
        conectadoEm: u.conectadoEm
      }))
    });
  });

  // Evento: Entrar na sala de ranking
  socket.on("entrar-sala-ranking", () => {
    socket.join("sala-ranking");
    console.log(`📊 ${socket.id} entrou na sala de ranking`);
  });

  // Evento: Entrar na sala de admin
  socket.on("entrar-sala-admin", () => {
    socket.join("sala-admin");
    console.log(`🛡️ ${socket.id} entrou na sala admin`);
  });

  // Evento: Ouvir reportes de uma área específica
  socket.on("ouvir-area", (dadosArea) => {
    const { lat, lng, raio } = dadosArea;
    const salaArea = `area:${lat.toFixed(2)}:${lng.toFixed(2)}`;
    socket.join(salaArea);
    console.log(`🗺️ ${socket.id} ouvindo área ${salaArea}`);
  });

  // Evento: Disconnect
  socket.on("disconnect", (reason) => {
    console.log("❌ Cliente desconectado:", socket.id, "Motivo:", reason);
    
    // Remover usuário dos online
    for (const [usuarioId, dados] of usuariosOnline.entries()) {
      if (dados.socketId === socket.id) {
        usuariosOnline.delete(usuarioId);
        console.log(`👋 ${dados.nome} saiu do app`);
        
        // Notificar sobre mudança de usuários online
        io.to("sala-global").emit("usuarios-online-atualizados", {
          totalOnline: usuariosOnline.size,
          usuarios: Array.from(usuariosOnline.values()).map(u => ({
            nome: u.nome,
            conectadoEm: u.conectadoEm
          }))
        });
        break;
      }
    }
  });

  // Evento: Error handling
  socket.on("error", (error) => {
    console.error("💥 Erro no WebSocket:", error);
  });
});

// Conectar MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/dengue-tracker")
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.log("❌ MongoDB erro:", err));

// ⚠️ IMPORTANTE: Tornar io disponível globalmente
global.io = io;

// Importar e usar rotas
const userRoutes = require("./routes/userRoutes");
const reportRoutes = require("./routes/reportRoutes"); 
const gamificationRoutes = require("./routes/gamificationRoutes");

app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/gamification", gamificationRoutes);

// Rota para teste WebSocket
app.get("/websocket-test", (req, res) => {
  res.sendFile(path.join(__dirname, "../tests-websocket.html"));
});

// Rota básica
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 API Dengue Tracker funcionando!",
    websockets: "🔔 WebSockets ativos!",
    endpoints: {
      users: "/api/users",
      reports: "/api/reports", 
      gamification: "/api/gamification"
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("✅ Servidor rodando na porta " + PORT);
  console.log("🔔 WebSockets habilitados e funcionando!");
  console.log("🌐 Teste WebSocket: http://localhost:5000/websocket-test");
});

module.exports = { io, server };
