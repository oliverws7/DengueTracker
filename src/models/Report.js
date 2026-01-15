const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório']
  },
  localizacao: {
    lat: {
      type: Number,
      required: [true, 'Latitude é obrigatória'],
      min: [-90, 'Latitude mínima é -90'],
      max: [90, 'Latitude máxima é 90']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude é obrigatória'],
      min: [-180, 'Longitude mínima é -180'],
      max: [180, 'Longitude máxima é 180']
    }
  },
  endereco: {
    type: String,
    required: [true, 'Endereço é obrigatório'],
    trim: true,
    maxlength: [255, 'Endereço muito longo (máx. 255 caracteres)']
  },
  bairro: {
    type: String,
    trim: true,
    maxlength: [100, 'Bairro muito longo (máx. 100 caracteres)']
  },
  cidade: {
    type: String,
    trim: true,
    maxlength: [100, 'Cidade muito longa (máx. 100 caracteres)']
  },
  descricao: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição muito longa (máx. 500 caracteres)']
  },
  tipoCriadouro: {
    type: String,
    required: [true, 'Tipo de criadouro é obrigatório'],
    enum: {
      values: [
        'agua-parada',
        'pneu', 
        'vaso-planta',
        'lixo',
        'garrafa',
        'piscina',
        'caixa-dagua',
        'calha',
        'outro'
      ],
      message: 'Tipo de criadouro inválido: {VALUE}'
    }
  },
  sintomas: [{
    type: String,
    enum: [
      'febre',
      'dor-cabeca',
      'dor-muscular',
      'dor-articular',
      'manchas-pele',
      'vomito',
      'diarreia'
    ]
  }],
  foto: {
    type: String, // URL da foto
    validate: {
      validator: function(v) {
        // Validação básica de URL (opcional)
        if (!v) return true;
        return /^(http|https):\/\/[^ "]+$/.test(v);
      },
      message: 'URL da foto inválida'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pendente', 'confirmado', 'investigando', 'eliminado'],
      message: 'Status inválido: {VALUE}'
    },
    default: 'pendente'
  },
  nivelRisco: {
    type: String,
    enum: {
      values: ['baixo', 'medio', 'alto'],
      message: 'Nível de risco inválido: {VALUE}'
    },
    default: 'medio'
  },
  pontosGanhos: {
    type: Number,
    default: 0
  },
  observacoesAgente: {
    type: String,
    trim: true,
    maxlength: [1000, 'Observações muito longas (máx. 1000 caracteres)']
  },
  dataVerificacao: {
    type: Date
  },
  agenteResponsavel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para endereço completo
reportSchema.virtual('enderecoCompleto').get(function() {
  return `${this.endereco}${this.bairro ? ', ' + this.bairro : ''}${this.cidade ? ', ' + this.cidade : ''}`;
});

// Virtual para idade do reporte (em dias)
reportSchema.virtual('idadeDias').get(function() {
  if (!this.createdAt) return 0;
  const diffTime = Math.abs(new Date() - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para prioridade (baseada em status e risco)
reportSchema.virtual('prioridade').get(function() {
  if (this.status === 'pendente' && this.nivelRisco === 'alto') return 'urgente';
  if (this.status === 'pendente' && this.nivelRisco === 'medio') return 'alta';
  if (this.status === 'pendente') return 'normal';
  if (this.status === 'investigando') return 'em-andamento';
  return 'concluida';
});

// Índices para melhor performance
reportSchema.index({ usuario: 1, createdAt: -1 }); // Para "meus reportes"
reportSchema.index({ status: 1, createdAt: -1 }); // Para filtros por status
reportSchema.index({ tipoCriadouro: 1 }); // Para estatísticas
reportSchema.index({ cidade: 1, bairro: 1 }); // Para filtros geográficos

// Método estático para estatísticas
reportSchema.statics.getEstatisticas = async function(usuarioId = null) {
  const filter = usuarioId ? { usuario: usuarioId } : {};
  
  const estatisticas = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pendentes: { 
          $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] }
        },
        confirmados: { 
          $sum: { $cond: [{ $eq: ['$status', 'confirmado'] }, 1, 0] }
        },
        eliminados: { 
          $sum: { $cond: [{ $eq: ['$status', 'eliminado'] }, 1, 0] }
        },
        pontosTotais: { $sum: '$pontosGanhos' }
      }
    }
  ]);
  
  return estatisticas[0] || { total: 0, pendentes: 0, confirmados: 0, eliminados: 0, pontosTotais: 0 };
};

// Método estático para relatórios por tipo
reportSchema.statics.getPorTipoCriadouro = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$tipoCriadouro',
        total: { $sum: 1 },
        pendentes: { 
          $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] }
        }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

// Middleware pré-save para validação adicional
reportSchema.pre('save', function(next) {
  // Garantir que os valores de latitude/longitude estão dentro dos limites
  if (this.localizacao) {
    this.localizacao.lat = Math.max(-90, Math.min(90, this.localizacao.lat));
    this.localizacao.lng = Math.max(-180, Math.min(180, this.localizacao.lng));
  }
  
  // Se for eliminado, registrar data de verificação
  if (this.status === 'eliminado' && !this.dataVerificacao) {
    this.dataVerificacao = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Report', reportSchema);