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
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Localização é obrigatória']
    }
  },
  endereco: {
    type: String,
    required: [true, 'Endereço é obrigatório'],
    trim: true
  },
  descricao: {
    type: String,
    trim: true
  },
  tipoCriadouro: {
    type: String,
    required: [true, 'Tipo de criadouro é obrigatório'],
    enum: [
      'vaso_planta',
      'pneu',
      'garrafa',
      'lixo',
      'piscina',
      'caixa_dagua',
      'calha',
      'outro'
    ]
  },
  foto: {
    type: String // URL da foto
  },
  status: {
    type: String,
    enum: ['pendente', 'verificado', 'resolvido'],
    default: 'pendente'
  },
  nivelRisco: {
    type: String,
    enum: ['baixo', 'medio', 'alto'],
    default: 'medio'
  }
}, {
  timestamps: true
});

// Índice para buscas por localização
reportSchema.index({ localizacao: '2dsphere' });

module.exports = mongoose.model('Report', reportSchema);