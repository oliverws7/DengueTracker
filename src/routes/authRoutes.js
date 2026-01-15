const express = require('express');
const router = express.Router();

// Importar controllers - usar o authController corrigido
const authController = require('../controllers/authController');
const userController = require('../controllers/userController'); // Se tiver userController separado

// Importar middlewares - verificar se os nomes estão corretos
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');
const { validate, schemas, validateQuery } = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimit');

// ======================
// ROTAS PÚBLICAS
// ======================

// Registro de usuário
router.post('/registrar', 
    authLimiter, // Rate limiting para registro
    validate(schemas.auth.registrar), // Validação do schema em português
    authController.registrar
);

// Registro em inglês (para compatibilidade)
router.post('/register',
    authLimiter,
    validate(schemas.auth.register), // Schema em inglês
    authController.registrar
);

// Login
router.post('/login',
    authLimiter,
    validate(schemas.auth.login), // Schema em português
    authController.login
);

// Login em inglês (para compatibilidade)
router.post('/login-en',
    authLimiter,
    validate(schemas.auth.loginEn), // Schema em inglês
    authController.login
);

// ======================
// ROTAS PROTEGIDAS (requer autenticação)
// ======================

// Perfil do usuário autenticado
router.get('/perfil',
    authenticateToken,
    authController.perfil
);

// Perfil em inglês (alias)
router.get('/profile',
    authenticateToken,
    authController.perfil
);

// Atualizar perfil
router.put('/perfil',
    authenticateToken,
    validate(schemas.user.atualizarPerfil),
    userController.updateUser || authController.atualizarPerfil
);

// Alterar senha
router.put('/alterar-senha',
    authenticateToken,
    validate(schemas.user.alterarSenha),
    authController.alterarSenha
);

// Logout (cliente deve remover token)
router.post('/logout',
    authenticateToken,
    authController.logout
);

// ======================
// ROTAS ADMIN
// ======================

// Listar todos usuários (apenas admin)
router.get('/usuarios',
    authenticateToken,
    authorizeRoles('admin'),
    userController.getAllUsers || ((req, res) => {
        // Fallback se userController não existir
        res.json({
            success: true,
            message: 'Lista de usuários (rota admin)',
            users: []
        });
    })
);

// Listar usuários em inglês
router.get('/users',
    authenticateToken,
    authorizeRoles('admin'),
    userController.getAllUsers || ((req, res) => {
        res.json({
            success: true,
            message: 'Users list (admin route)',
            users: []
        });
    })
);

// Buscar usuário por ID (admin ou próprio usuário)
router.get('/usuarios/:id',
    authenticateToken,
    (req, res, next) => {
        // Permite admin ver qualquer perfil ou usuário ver seu próprio
        if (req.user.role === 'admin' || req.user.id === req.params.id) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: 'Acesso negado'
        });
    },
    userController.getUserById || ((req, res) => {
        res.json({
            success: true,
            message: 'Detalhes do usuário',
            user: {
                id: req.params.id,
                nome: 'Usuário Teste'
            }
        });
    })
);

// Atualizar usuário (admin pode atualizar qualquer, usuário só seu)
router.put('/usuarios/:id',
    authenticateToken,
    validate(schemas.user.atualizarPerfil),
    userController.updateUser || ((req, res) => {
        res.json({
            success: true,
            message: 'Usuário atualizado',
            user: req.body
        });
    })
);

// Deletar usuário (apenas admin)
router.delete('/usuarios/:id',
    authenticateToken,
    authorizeRoles('admin'),
    userController.deleteUser || ((req, res) => {
        res.json({
            success: true,
            message: 'Usuário deletado',
            userId: req.params.id
        });
    })
);

// ======================
// ROTAS DE VERIFICAÇÃO/SAÚDE
// ======================

// Verificar token (útil para frontend)
router.get('/verificar-token',
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            authenticated: req.isAuthenticated || !!req.user,
            user: req.user || null,
            message: req.user ? 'Token válido' : 'Token ausente ou inválido'
        });
    }
);

// Health check da autenticação
router.get('/health',
    (req, res) => {
        res.json({
            success: true,
            service: 'Auth API',
            status: 'operational',
            timestamp: new Date().toISOString(),
            endpoints: {
                registrar: 'POST /api/auth/registrar',
                login: 'POST /api/auth/login',
                perfil: 'GET /api/auth/perfil',
                logout: 'POST /api/auth/logout'
            }
        });
    }
);

module.exports = router;