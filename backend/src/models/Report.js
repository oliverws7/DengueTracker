const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário é obrigatório'],
    index: true
  },
  localizacao: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordenadas são obrigatórias'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Coordenadas inválidas. Use [longitude, latitude]'
      }
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
    maxlength: 100,
    index: true 
  },
  cidade: { 
    type: String, 
    trim: true, 
    maxlength: 100,
    index: true 
  },
  descricao: { 
    type: String, 
    trim: true, 
    maxlength: 500 
  },
  tipoCriadouro: {
    type: String,
    required: [true, 'Tipo de criadouro é obrigatório'],
    enum: {
      values: ['agua-parada', 'pneu', 'vaso-planta', 'lixo', 'garrafa', 'piscina', 'caixa-dagua', 'calha', 'outro'],
      message: 'Tipo de criadouro inválido: {VALUE}'
    },
    index: true
  },
  sintomas: [{
    type: String,
    enum: ['febre', 'dor-cabeca', 'dor-muscular', 'dor-articular', 'manchas-pele', 'vomito', 'diarreia']
  }],
  
  // ======================
  // SISTEMA DE IMAGENS ATUALIZADO
  // ======================
  imagens: [{
    url: {
      type: String,
      required: [true, 'URL da imagem é obrigatória'],
      validate: {
        validator: function(v) {
          return /^\/uploads\/images\/[a-zA-Z0-9-]+\.(jpg|jpeg|png|gif|webp)$/.test(v);
        },
        message: 'URL de imagem inválida'
      }
    },
    filename: {
      type: String,
      required: [true, 'Nome do arquivo é obrigatório'],
      match: [/^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp)$/, 'Nome de arquivo inválido']
    },
    originalName: {
      type: String,
      required: [true, 'Nome original é obrigatório'],
      maxlength: [255, 'Nome muito longo']
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuário que fez upload é obrigatório']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      maxlength: 500,
      default: ''
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    size: {
      type: Number,
      min: [1024, 'Imagem muito pequena (mín. 1KB)'],
      max: [5242880, 'Imagem muito grande (máx. 5MB)']
    },
    mimeType: {
      type: String,
      enum: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },
    dimensions: {
      width: { type: Number, min: 100, max: 5000 },
      height: { type: Number, min: 100, max: 5000 }
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Campo legado para compatibilidade (pode ser removido depois)
  foto: { 
    type: String,
    get: function(v) {
      // Se tiver imagens, retorna a primeira, senão retorna o valor antigo
      return this.imagens && this.imagens.length > 0 ? this.imagens[0].url : v;
    }
  },
  
  status: {
    type: String,
    enum: ['pendente', 'confirmado', 'investigando', 'eliminado'],
    default: 'pendente',
    index: true
  },
  nivelRisco: {
    type: String,
    enum: ['baixo', 'medio', 'alto'],
    default: 'medio',
    index: true
  },
  pontosGanhos: { 
    type: Number, 
    default: 0,
    min: [0, 'Pontos não podem ser negativos']
  },
  observacoesAgente: { 
    type: String, 
    trim: true, 
    maxlength: 1000 
  },
  dataVerificacao: { 
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v <= new Date();
      },
      message: 'Data de verificação não pode ser no futuro'
    }
  },
  agenteResponsavel: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Novos campos para melhor organização
  titulo: {
    type: String,
    trim: true,
    maxlength: 200,
    default: function() {
      return `Relatório de ${this.tipoCriadouro} em ${this.bairro || this.cidade}`;
    }
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  categoria: {
    type: String,
    enum: ['residencial', 'comercial', 'publico', 'terreno-baldio', 'outro'],
    default: 'residencial'
  },
  prioridadeManual: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  dataOcorrencia: {
    type: Date,
    default: Date.now
  },
  dataResolucao: Date,
  motivoEliminacao: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remover campos sensíveis ao enviar para o cliente
      delete ret.__v;
      delete ret.observacoesAgente;
      delete ret.motivoEliminacao;
      delete ret.agenteResponsavel;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// ======================
// ÍNDICES OTIMIZADOS
// ======================
reportSchema.index({ "localizacao": "2dsphere" });
reportSchema.index({ usuario: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ cidade: 1, bairro: 1 });
reportSchema.index({ tipoCriadouro: 1, status: 1 });
reportSchema.index({ nivelRisco: 1, createdAt: -1 });
reportSchema.index({ isPublic: 1, status: 1 });
reportSchema.index({ createdAt: -1 }); // Para queries recentes
reportSchema.index({ 
  cidade: 1, 
  bairro: 1, 
  tipoCriadouro: 1,
  status: 1 
}); // Índice composto para estatísticas

// ======================
// VIRTUAIS (GETTERS)
// ======================
reportSchema.virtual('enderecoCompleto').get(function() {
  const parts = [this.endereco];
  if (this.bairro) parts.push(this.bairro);
  if (this.cidade) parts.push(this.cidade);
  return parts.join(', ');
});

reportSchema.virtual('prioridade').get(function() {
  if (this.status === 'pendente') {
    if (this.nivelRisco === 'alto') return 1; // urgente
    if (this.nivelRisco === 'medio') return 2; // alta
    return 3; // normal
  }
  return 4; // resolvido/baixa
});

reportSchema.virtual('tempoDecorrido').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24)); // dias
});

reportSchema.virtual('temImagens').get(function() {
  return this.imagens && this.imagens.length > 0;
});

reportSchema.virtual('primeiraImagem').get(function() {
  return this.imagens && this.imagens.length > 0 ? this.imagens[0].url : null;
});

// ======================
// MÉTODOS DE INSTÂNCIA
// ======================
reportSchema.methods.adicionarImagem = function(imagemData, usuarioId) {
  this.imagens.push({
    ...imagemData,
    uploadedBy: usuarioId,
    uploadedAt: new Date()
  });
  return this.save();
};

reportSchema.methods.removerImagem = function(filename) {
  this.imagens = this.imagens.filter(img => img.filename !== filename);
  return this.save();
};

reportSchema.methods.verificarImagem = function(filename, usuarioId) {
  const imagem = this.imagens.find(img => img.filename === filename);
  if (imagem) {
    imagem.isVerified = true;
    imagem.verifiedBy = usuarioId;
    imagem.verifiedAt = new Date();
    return this.save();
  }
  throw new Error('Imagem não encontrada');
};

reportSchema.methods.calcularPontos = function() {
  let pontos = 10; // Base
  
  // Bônus por tipo de criadouro
  const bonusTipo = {
    'agua-parada': 5,
    'pneu': 8,
    'vaso-planta': 3,
    'lixo': 6,
    'garrafa': 4,
    'piscina': 10,
    'caixa-dagua': 12,
    'calha': 7,
    'outro': 2
  };
  
  pontos += bonusTipo[this.tipoCriadouro] || 0;
  
  // Bônus por imagens
  if (this.temImagens) {
    pontos += this.imagens.length * 2;
  }
  
  // Bônus por detalhamento
  if (this.descricao && this.descricao.length > 100) {
    pontos += 5;
  }
  
  this.pontosGanhos = pontos;
  return pontos;
};

// ======================
// MÉTODOS ESTÁTICOS
// ======================
reportSchema.statics.getEstatisticas = async function(usuarioId = null, filtros = {}) {
  const match = usuarioId ? { usuario: mongoose.Types.ObjectId(usuarioId), ...filtros } : filtros;
  
  const stats = await this.aggregate([
    { $match: match },
    { $group: {
        _id: null,
        total: { $sum: 1 },
        pendentes: { $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] } },
        confirmados: { $sum: { $cond: [{ $eq: ['$status', 'confirmado'] }, 1, 0] } },
        eliminados: { $sum: { $cond: [{ $eq: ['$status', 'eliminado'] }, 1, 0] } },
        pontosTotais: { $sum: '$pontosGanhos' },
        comImagens: { $sum: { $cond: [{ $gt: [{ $size: '$imagens' }, 0] }, 1, 0] } },
        altoRisco: { $sum: { $cond: [{ $eq: ['$nivelRisco', 'alto'] }, 1, 0] } }
    }},
    { $project: {
        total: 1,
        pendentes: 1,
        confirmados: 1,
        eliminados: 1,
        pontosTotais: 1,
        comImagens: 1,
        altoRisco: 1,
        percentualImagens: { $multiply: [{ $divide: ['$comImagens', '$total'] }, 100] },
        percentualAltoRisco: { $multiply: [{ $divide: ['$altoRisco', '$total'] }, 100] }
    }}
  ]);
  
  return stats[0] || { 
    total: 0, 
    pendentes: 0, 
    confirmados: 0, 
    eliminados: 0, 
    pontosTotais: 0, 
    comImagens: 0,
    altoRisco: 0,
    percentualImagens: 0,
    percentualAltoRisco: 0
  };
};

reportSchema.statics.getRelatoriosPorLocalizacao = async function(latitude, longitude, raioKm = 5, limite = 50) {
  return await this.find({
    localizacao: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: raioKm * 1000 // converter para metros
      }
    },
    status: { $in: ['pendente', 'confirmado'] },
    isPublic: true
  })
  .select('localizacao endereco bairro tipoCriadouro status nivelRisco createdAt imagens')
  .limit(limite)
  .lean();
};

reportSchema.statics.getEstatisticasPorPeriodo = async function(inicio, fim, agruparPor = 'dia') {
  let groupStage;
  
  switch (agruparPor) {
    case 'hora':
      groupStage = {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" }
          }
        }
      };
      break;
    case 'dia':
    default:
      groupStage = {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          }
        }
      };
  }
  
  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: new Date(inicio),
          $lte: new Date(fim)
        }
      }
    },
    groupStage,
    {
      $group: {
        _id: "$_id",
        total: { $sum: 1 },
        confirmados: { $sum: { $cond: [{ $eq: ["$status", "confirmado"] }, 1, 0] } },
        pontos: { $sum: "$pontosGanhos" }
      }
    },
    { $sort: { "_id": 1 } }
  ];
  
  return await this.aggregate(pipeline);
};

// ======================
// MIDDLEWARES (HOOKS)
// ======================
reportSchema.pre('save', function(next) {
  // Calcular pontos automaticamente se for um novo relatório
  if (this.isNew) {
    this.calcularPontos();
  }
  
  // Gerar tags automáticas
  if (!this.tags || this.tags.length === 0) {
    this.tags = [this.tipoCriadouro, this.cidade];
    if (this.nivelRisco === 'alto') this.tags.push('urgente');
    if (this.temImagens) this.tags.push('com-imagens');
  }
  
  next();
});

reportSchema.pre('find', function() {
  this.where({ isPublic: true });
});

reportSchema.pre('findOne', function() {
  this.where({ isPublic: true });
});

// ======================
// VALIDAÇÕES PERSONALIZADAS
// ======================
reportSchema.path('imagens').validate(function(imagens) {
  // Limitar a 10 imagens por relatório
  return imagens.length <= 10;
}, 'Limite de 10 imagens por relatório excedido');

reportSchema.path('sintomas').validate(function(sintomas) {
  // Limitar a 7 sintomas
  return sintomas.length <= 7;
}, 'Limite de 7 sintomas excedido');

module.exports = mongoose.model('Report', reportSchema);