const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true,
        minlength: [3, 'Nome deve ter pelo menos 3 caracteres'],
        maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    senha: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        minlength: [8, 'Senha deve ter pelo menos 8 caracteres'],
        select: false // Não retorna senha em queries por padrão
    },
    nivel: {
        type: String,
        enum: ['iniciante', 'cacador', 'mestre', 'lenda', 'admin'],
        default: 'iniciante'
    },
    pontos: {
        type: Number,
        default: 0,
        min: [0, 'Pontos não podem ser negativos']
    },
    experiencia: {
        type: Number,
        default: 0,
        min: [0, 'Experiência não pode ser negativa']
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'agente', 'moderador'],
        default: 'user'
    },
    localizacao: {
        lat: {
            type: Number,
            min: [-90, 'Latitude mínima é -90'],
            max: [90, 'Latitude máxima é 90']
        },
        lng: {
            type: Number,
            min: [-180, 'Longitude mínima é -180'],
            max: [180, 'Longitude máxima é 180']
        }
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
    // Gamificação
    reportesRealizados: {
        type: Number,
        default: 0
    },
    focosEliminados: {
        type: Number,
        default: 0
    },
    conquistas: [{
        nome: String,
        descricao: String,
        desbloqueadaEm: {
            type: Date,
            default: Date.now
        },
        pontosConquista: Number
    }],
    // Recompensas e atividades
    ultimaRecompensa: Date,
    streakDiario: {
        type: Number,
        default: 0
    },
    // Status
    ativo: {
        type: Boolean,
        default: true
    },
    verificado: {
        type: Boolean,
        default: false
    },
    dataCriacao: {
        type: Date,
        default: Date.now
    },
    ultimoLogin: Date,
    avatar: {
        type: String, // URL do avatar
        default: 'https://api.dicebear.com/7.x/avataaars/svg?seed={nome}'
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.senha;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.senha;
            delete ret.__v;
            return ret;
        }
    }
});

// Virtual para próximo nível
userSchema.virtual('proximoNivel').get(function() {
    const niveis = {
        'iniciante': { min: 0, next: 'cacador', pontosParaProximo: 100 },
        'cacador': { min: 100, next: 'mestre', pontosParaProximo: 500 },
        'mestre': { min: 500, next: 'lenda', pontosParaProximo: 1000 },
        'lenda': { min: 1000, next: null, pontosParaProximo: null }
    };
    
    const nivelAtual = niveis[this.nivel];
    if (!nivelAtual) return null;
    
    return {
        nome: nivelAtual.next,
        pontosRestantes: nivelAtual.pontosParaProximo ? 
            Math.max(0, nivelAtual.pontosParaProximo - this.pontos) : 0,
        progresso: nivelAtual.pontosParaProximo ? 
            Math.min(100, Math.round((this.pontos / nivelAtual.pontosParaProximo) * 100)) : 100
    };
});

// Virtual para ranking
userSchema.virtual('posicaoRanking').get(async function() {
    const totalUsers = await mongoose.model('User').countDocuments({ pontos: { $gt: this.pontos } });
    return totalUsers + 1;
});

// Hash da senha antes de salvar
userSchema.pre('save', async function(next) {
    if (!this.isModified('senha')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.senha = await bcrypt.hash(this.senha, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Atualizar timestamp antes de salvar
userSchema.pre('save', function(next) {
    if (this.isModified('pontos') || this.isModified('experiencia')) {
        this.nivel = this.calcularNivel();
    }
    next();
});

// Método para comparar senhas
userSchema.methods.compararSenha = async function(senhaDigitada) {
    return await bcrypt.compare(senhaDigitada, this.senha);
};

// Método para calcular nível baseado em pontos
userSchema.methods.calcularNivel = function() {
    const pontos = this.pontos || 0;
    
    if (pontos >= 1000) return 'lenda';
    if (pontos >= 500) return 'mestre';
    if (pontos >= 100) return 'cacador';
    return 'iniciante';
};

// Método para adicionar pontos
userSchema.methods.adicionarPontos = function(quantidade, motivo) {
    const pontosAntigos = this.pontos;
    this.pontos += quantidade;
    this.experiencia += quantidade;
    this.nivel = this.calcularNivel();
    
    // Verificar conquistas automáticas
    this.verificarConquistas();
    
    return {
        pontosAntigos,
        pontosNovos: this.pontos,
        diferenca: quantidade,
        nivel: this.nivel,
        motivo
    };
};

// Método para verificar conquistas
userSchema.methods.verificarConquistas = function() {
    const conquistasPadrao = [
        { nome: 'Primeiro Reporte', pontosNecessarios: 1, descricao: 'Realizou o primeiro reporte' },
        { nome: 'Caçador Novato', pontosNecessarios: 50, descricao: 'Atingiu 50 pontos' },
        { nome: 'Mestre da Dengue', pontosNecessarios: 200, descricao: 'Atingiu 200 pontos' },
        { nome: 'Lenda Viva', pontosNecessarios: 500, descricao: 'Atingiu 500 pontos' },
        { nome: 'Eliminador de Focos', focosEliminados: 10, descricao: 'Eliminou 10 focos' },
        { nome: 'Reporter Ativo', reportesRealizados: 20, descricao: 'Realizou 20 reportes' }
    ];
    
    conquistasPadrao.forEach(conquista => {
        const jaTem = this.conquistas?.some(c => c.nome === conquista.nome);
        
        if (!jaTem) {
            if (conquista.pontosNecessarios && this.pontos >= conquista.pontosNecessarios) {
                this.conquistas.push({
                    nome: conquista.nome,
                    descricao: conquista.descricao,
                    desbloqueadaEm: new Date(),
                    pontosConquista: 10
                });
            } else if (conquista.focosEliminados && this.focosEliminados >= conquista.focosEliminados) {
                this.conquistas.push({
                    nome: conquista.nome,
                    descricao: conquista.descricao,
                    desbloqueadaEm: new Date(),
                    pontosConquista: 15
                });
            } else if (conquista.reportesRealizados && this.reportesRealizados >= conquista.reportesRealizados) {
                this.conquistas.push({
                    nome: conquista.nome,
                    descricao: conquista.descricao,
                    desbloqueadaEm: new Date(),
                    pontosConquista: 20
                });
            }
        }
    });
};

// Método estático para buscar ranking
userSchema.statics.getRanking = async function(limit = 20) {
    return await this.find()
        .select('nome pontos nivel avatar reportesRealizados focosEliminados')
        .sort({ pontos: -1, experiencia: -1 })
        .limit(limit);
};

// Método estático para estatísticas globais
userSchema.statics.getEstatisticasGlobais = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalUsuarios: { $sum: 1 },
                totalPontos: { $sum: '$pontos' },
                totalReportes: { $sum: '$reportesRealizados' },
                totalFocosEliminados: { $sum: '$focosEliminados' },
                mediaPontos: { $avg: '$pontos' }
            }
        }
    ]);
    
    return stats[0] || {
        totalUsuarios: 0,
        totalPontos: 0,
        totalReportes: 0,
        totalFocosEliminados: 0,
        mediaPontos: 0
    };
};

// Índices para performance
userSchema.index({ pontos: -1 }); // Para ranking
userSchema.index({ email: 1 }, { unique: true }); // Para busca por email
userSchema.index({ nivel: 1 }); // Para filtros por nível
userSchema.index({ 'localizacao.lat': 1, 'localizacao.lng': 1 }); // Para busca geográfica

module.exports = mongoose.model('User', userSchema);