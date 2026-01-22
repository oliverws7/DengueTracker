const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  senha: { type: String, required: true, select: false },
  nivel: { 
    type: String, 
    enum: ['iniciante', 'cacador', 'mestre', 'lenda', 'admin'], 
    default: 'iniciante' 
  },
  pontos: { type: Number, default: 0 },
  experiencia: { type: Number, default: 0 },
  reportesRealizados: { type: Number, default: 0 },
  focosEliminados: { type: Number, default: 0 },
  conquistas: [{
    nome: String,
    desbloqueadaEm: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('senha')) {
    this.senha = await bcrypt.hash(this.senha, 10);
  }
  if (this.isModified('pontos')) {
    if (this.pontos >= 1000) this.nivel = 'lenda';
    else if (this.pontos >= 500) this.nivel = 'mestre';
    else if (this.pontos >= 100) this.nivel = 'cacador';
  }
  next();
});

userSchema.methods.adicionarPontos = function(qtd) {
  this.pontos += qtd;
  this.experiencia += qtd;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);