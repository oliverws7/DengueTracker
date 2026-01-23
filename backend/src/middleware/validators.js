const Joi = require('joi');
// Verificar se bcrypt.js tem validatePasswordStrength, senão criar fallback
let validatePasswordStrength;
try {
  const bcryptUtils = require('../utils/bcrypt');
  validatePasswordStrength = bcryptUtils.validatePasswordStrength;
} catch (error) {
  // Fallback se o arquivo não existir
  validatePasswordStrength = (password) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return {
      isValid: strongPasswordRegex.test(password),
      message: strongPasswordRegex.test(password) 
        ? 'Senha válida'
        : 'A senha deve conter: letra maiúscula, minúscula, número e caractere especial'
    };
  };
}

// Middleware de validação genérico
exports.validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '')
      }));
      
      return res.status(400).json({ 
        success: false,
        error: 'Validação falhou', 
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }

    req.body = value;
    next();
  };
};

// Schemas de validação específicos (compatibilidade com seu sistema)
exports.schemas = {
  // Autenticação (em português para compatibilidade)
  auth: {
    // Schema para registro em português
    registrar: Joi.object({
      nome: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
          'string.min': 'Nome deve ter pelo menos 3 caracteres',
          'string.max': 'Nome deve ter no máximo 100 caracteres',
          'any.required': 'Nome é obrigatório'
        }),
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Email inválido',
          'any.required': 'Email é obrigatório'
        }),
      senha: Joi.string()
        .min(8)
        .required()
        .custom((value, helpers) => {
          const validation = validatePasswordStrength(value);
          if (!validation.isValid) {
            return helpers.error('any.invalid', { message: validation.message });
          }
          return value;
        })
        .messages({
          'string.min': 'Senha deve ter pelo menos 8 caracteres',
          'any.required': 'Senha é obrigatória',
          'any.invalid': 'A senha deve conter: letra maiúscula, minúscula, número e caractere especial'
        }),
      role: Joi.string()
        .valid('user', 'admin', 'moderator')
        .default('user')
        .messages({
          'any.only': 'Role deve ser user, admin ou moderator'
        })
    }),

    // Schema para registro em inglês (compatibilidade)
    register: Joi.object({
      name: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
          'string.min': 'Nome deve ter pelo menos 3 caracteres',
          'string.max': 'Nome deve ter no máximo 100 caracteres',
          'any.required': 'Nome é obrigatório'
        }),
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Email inválido',
          'any.required': 'Email é obrigatório'
        }),
      password: Joi.string()
        .min(8)
        .required()
        .custom((value, helpers) => {
          const validation = validatePasswordStrength(value);
          if (!validation.isValid) {
            return helpers.error('any.invalid', { message: validation.message });
          }
          return value;
        })
        .messages({
          'string.min': 'Senha deve ter pelo menos 8 caracteres',
          'any.required': 'Senha é obrigatória',
          'any.invalid': 'A senha deve conter: letra maiúscula, minúscula, número e caractere especial'
        }),
      role: Joi.string()
        .valid('user', 'admin', 'moderator')
        .default('user')
        .messages({
          'any.only': 'Role deve ser user, admin ou moderator'
        })
    }),

    // Login em português
    login: Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Email inválido',
          'any.required': 'Email é obrigatório'
        }),
      senha: Joi.string()
        .required()
        .messages({
          'any.required': 'Senha é obrigatória'
        })
    }),

    // Login em inglês (compatibilidade)
    loginEn: Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Email inválido',
          'any.required': 'Email é obrigatório'
        }),
      password: Joi.string()
        .required()
        .messages({
          'any.required': 'Senha é obrigatória'
        })
    })
  },

  // Relatórios de dengue (ajustado para seu modelo)
  report: {
    criarReporte: Joi.object({
      localizacao: Joi.object({
        lat: Joi.number()
          .min(-90)
          .max(90)
          .required()
          .messages({
            'number.min': 'Latitude deve ser entre -90 e 90',
            'number.max': 'Latitude deve ser entre -90 e 90',
            'any.required': 'Latitude é obrigatória'
          }),
        lng: Joi.number()
          .min(-180)
          .max(180)
          .required()
          .messages({
            'number.min': 'Longitude deve ser entre -180 e 180',
            'number.max': 'Longitude deve ser entre -180 e 180',
            'any.required': 'Longitude é obrigatória'
          })
      }).required(),
      
      endereco: Joi.string()
        .max(255)
        .required()
        .messages({
          'string.max': 'Endereço deve ter no máximo 255 caracteres',
          'any.required': 'Endereço é obrigatório'
        }),
      
      tipoCriadouro: Joi.string()
        .valid('agua-parada', 'pneu', 'vaso-planta', 'lixo', 'outro')
        .required()
        .messages({
          'any.only': 'Tipo de criadouro deve ser: agua-parada, pneu, vaso-planta, lixo ou outro',
          'any.required': 'Tipo de criadouro é obrigatório'
        }),
      
      descricao: Joi.string()
        .max(500)
        .optional()
        .allow('')
        .messages({
          'string.max': 'Descrição deve ter no máximo 500 caracteres'
        }),
      
      foto: Joi.string()
        .uri()
        .optional()
        .messages({
          'string.uri': 'URL da foto inválida'
        }),
      
      status: Joi.string()
        .valid('pendente', 'confirmado', 'investigando', 'eliminado')
        .default('pendente')
        .messages({
          'any.only': 'Status deve ser pendente, confirmado, investigando ou eliminado'
        })
    }),

    // Schema em inglês para compatibilidade
    create: Joi.object({
      location: Joi.object({
        latitude: Joi.number()
          .min(-90)
          .max(90)
          .required(),
        longitude: Joi.number()
          .min(-180)
          .max(180)
          .required()
      }).required(),
      address: Joi.string()
        .max(255)
        .required(),
      tipoCriadouro: Joi.string()
        .valid('agua-parada', 'pneu', 'vaso-planta', 'lixo', 'outro')
        .required(),
      description: Joi.string()
        .max(500)
        .optional(),
      photo: Joi.string()
        .uri()
        .optional(),
      status: Joi.string()
        .valid('pending', 'confirmed', 'investigating', 'eliminated')
        .default('pending')
    }),

    atualizarStatus: Joi.object({
      reporteId: Joi.string()
        .required()
        .messages({
          'any.required': 'ID do reporte é obrigatório'
        }),
      status: Joi.string()
        .valid('pendente', 'confirmado', 'investigando', 'eliminado')
        .required()
        .messages({
          'any.only': 'Status deve ser pendente, confirmado, investigando ou eliminado',
          'any.required': 'Status é obrigatório'
        })
    })
  },

  // Usuários
  user: {
    atualizarPerfil: Joi.object({
      nome: Joi.string()
        .min(3)
        .max(100)
        .optional()
        .messages({
          'string.min': 'Nome deve ter pelo menos 3 caracteres',
          'string.max': 'Nome deve ter no máximo 100 caracteres'
        }),
      
      email: Joi.string()
        .email()
        .optional()
        .messages({
          'string.email': 'Email inválido'
        }),
      
      localizacao: Joi.object({
        lat: Joi.number()
          .min(-90)
          .max(90)
          .optional(),
        lng: Joi.number()
          .min(-180)
          .max(180)
          .optional()
      }).optional()
    }),

    alterarSenha: Joi.object({
      senhaAtual: Joi.string()
        .required()
        .messages({
          'any.required': 'Senha atual é obrigatória'
        }),
      
      novaSenha: Joi.string()
        .min(8)
        .required()
        .custom((value, helpers) => {
          const validation = validatePasswordStrength(value);
          if (!validation.isValid) {
            return helpers.error('any.invalid', { message: validation.message });
          }
          return value;
        })
        .messages({
          'string.min': 'Nova senha deve ter pelo menos 8 caracteres',
          'any.required': 'Nova senha é obrigatória',
          'any.invalid': 'A nova senha deve conter: letra maiúscula, minúscula, número e caractere especial'
        })
    })
  },

  // Filtros e queries
  query: {
    pagination: Joi.object({
      pagina: Joi.number()
        .min(1)
        .default(1)
        .messages({
          'number.min': 'Página deve ser maior ou igual a 1'
        }),
      
      limite: Joi.number()
        .min(1)
        .max(100)
        .default(10)
        .messages({
          'number.min': 'Limite deve ser maior ou igual a 1',
          'number.max': 'Limite máximo é 100'
        }),
      
      ordenarPor: Joi.string()
        .optional(),
      
      ordem: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
        .messages({
          'any.only': 'Ordem deve ser asc ou desc'
        })
    }),

    filtrosReporte: Joi.object({
      status: Joi.string()
        .valid('pendente', 'confirmado', 'investigando', 'eliminado')
        .optional(),
      
      tipoCriadouro: Joi.string()
        .valid('agua-parada', 'pneu', 'vaso-planta', 'lixo', 'outro')
        .optional(),
      
      dataInicio: Joi.date()
        .iso()
        .optional(),
      
      dataFim: Joi.date()
        .iso()
        .optional(),
      
      cidade: Joi.string()
        .optional(),
      
      bairro: Joi.string()
        .optional()
    })
  }
};

// Middleware para validar query parameters
exports.validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '')
      }));
      
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros de consulta inválidos', 
        details: errors,
        code: 'QUERY_VALIDATION_ERROR'
      });
    }

    req.query = value;
    next();
  };
};

// Middleware para validar parâmetros de URL
exports.validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '')
      }));
      
      return res.status(400).json({ 
        success: false,
        error: 'Parâmetros de URL inválidos', 
        details: errors,
        code: 'PARAMS_VALIDATION_ERROR'
      });
    }

    req.params = value;
    next();
  };
};

// Schema para validação de IDs MongoDB
exports.idSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('ID inválido');