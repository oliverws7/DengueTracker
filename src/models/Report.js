const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  localizacao: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordenadas são obrigatórias']
    }
  },
  endereco: {
    type: String,
    required: [true, 'Endereço é obrigatório'],
    trim: true,
    maxlength: [255, 'Endereço muito longo (máx. 255 caracteres)']
  },
  bairro: { type: String, trim: true, maxlength: 100 },
  cidade: { type: String, trim: true, maxlength: 100 },
  descricao: { type: String, trim: true, maxlength: 500 },
  tipoCriadouro: {
    type: String,
    required: [true, 'Tipo de criadouro é obrigatório'],
    enum: {
      values: ['agua-parada', 'pneu', 'vaso-planta', 'lixo', 'garrafa', 'piscina', 'caixa-dagua', 'calha', 'outro'],
      message: 'Tipo de criadouro inválido: {VALUE}'
    }
  },
  sintomas: [{
    type: String,
    enum: ['febre', 'dor-cabeca', 'dor-muscular', 'dor-articular', 'manchas-pele', 'vomito', 'diarreia']
  }],
  foto: { type: String },
  status: {
    type: String,
    enum: ['pendente', 'confirmado', 'investigando', 'eliminado'],
    default: 'pendente'
  },
  nivelRisco: {
    type: String,
    enum: ['baixo', 'medio', 'alto'],
    default: 'medio'
  },
  pontosGanhos: { type: Number, default: 0 },
  observacoesAgente: { type: String, trim: true, maxlength: 1000 },
  dataVerificacao: { type: Date },
  agenteResponsavel: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- ÍNDICES ---
reportSchema.index({ "localizacao": "2dsphere" });
reportSchema.index({ usuario: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ cidade: 1, bairro: 1 });

// --- VIRTUAIS ---
reportSchema.virtual('enderecoCompleto').get(function() {
  return `${this.endereco}${this.bairro ? ', ' + this.bairro : ''}${this.cidade ? ', ' + this.cidade : ''}`;
});

reportSchema.virtual('prioridade').get(function() {
  if (this.status === 'pendente' && this.nivelRisco === 'alto') return 'urgente';
  if (this.status === 'pendente') return 'alta';
  return 'normal';
});

// --- MÉTODOS ESTÁTICOS ---
reportSchema.statics.getEstatisticas = async function(usuarioId = null) {
  const filter = usuarioId ? { usuario: usuarioId } : {};
  const stats = await this.aggregate([
    { $match: filter },
    { $group: {
        _id: null,
        total: { $sum: 1 },
        pendentes: { $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] } },
        pontosTotais: { $sum: '$pontosGanhos' }
    }}
  ]);
  return stats[0] || { total: 0, pendentes: 0, pontosTotais: 0 };
};

module.exports = mongoose.model('Report', reportSchema);