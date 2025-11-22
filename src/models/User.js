const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  pontos: { type: Number, default: 0 },
  nivel: { type: String, default: "Iniciante" },
  experiencia: { type: Number, default: 0 },
  conquistas: [{
    id: String,
    nome: String,
    descricao: String,
    icone: String,
    desbloqueadoEm: { type: Date, default: Date.now }
  }],
  reportesRealizados: { type: Number, default: 0 },
  focosEliminados: { type: Number, default: 0 },
  streakDias: { type: Number, default: 0 },
  ultimoLogin: { type: Date, default: Date.now },
  badges: [String],
  isAdmin: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Calcular nível baseado na experiência
userSchema.methods.calcularNivel = function() {
  const niveis = [
    { nome: "Iniciante", exp: 0 },
    { nome: "Explorador", exp: 100 },
    { nome: "Caçador", exp: 300 },
    { nome: "Especialista", exp: 600 },
    { nome: "Mestre", exp: 1000 },
    { nome: "Lenda", exp: 2000 }
  ];

  for (let i = niveis.length - 1; i >= 0; i--) {
    if (this.experiencia >= niveis[i].exp) {
      return niveis[i].nome;
    }
  }
  return "Iniciante";
};

module.exports = mongoose.model("User", userSchema);
