const express = require('express');
const userController = require('../controllers/userController'); // Agora é um controller completo
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');
const { validate, schemas, validateQuery, validateParams } = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// ======================
// ROTAS PÚBLICAS
// ======================

// Cadastro de usuário
router.post('/cadastrar',
    authLimiter,
    validate(schemas.auth.registrar),
    userController.cadastrar
);

// Cadastro em inglês (alias)
router.post('/register',
    authLimiter,
    validate(schemas.auth.register),
    userController.cadastrar
);

// Login
router.post('/login',
    authLimiter,
    validate(schemas.auth.login),
    userController.login
);

// Login em inglês (alias)
router.post('/login-en',
    authLimiter,
    validate(schemas.auth.loginEn),
    userController.login
);

// Verificação de email disponível (público)
router.get('/verificar-email/:email',
    async (req, res) => {
        try {
            const User = require('../models/User');
            const usuario = await User.findOne({ email: req.params.email.toLowerCase() });
            
            res.json({
                success: true,
                disponivel: !usuario,
                mensagem: usuario ? 'Email já em uso' : 'Email disponível'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Erro ao verificar email'
            });
        }
    }
);

// ======================
// ROTAS PROTEGIDAS (usuário autenticado)
// ======================

// Perfil do usuário autenticado
router.get('/perfil',
    authenticateToken,
    userController.getPerfil
);

// Perfil em inglês (alias)
router.get('/profile',
    authenticateToken,
    userController.getPerfil
);

// Atualizar perfil (próprio usuário)
router.put('/perfil',
    authenticateToken,
    validate(schemas.user.atualizarPerfil),
    userController.updateUser
);

// Alterar senha
router.put('/alterar-senha',
    authenticateToken,
    validate(schemas.user.alterarSenha),
    async (req, res) => {
        try {
            // Esta função pode estar no userController ou authController
            // Verificar qual controller tem a função alterarSenha
            if (userController.alterarSenha) {
                return userController.alterarSenha(req, res);
            }
            
            // Fallback se não estiver no userController
            const User = require('../models/User');
            const { senhaAtual, novaSenha } = req.body;
            
            const usuario = await User.findById(req.user.id).select('+senha');
            
            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }
            
            const senhaValida = await usuario.compararSenha(senhaAtual);
            if (!senhaValida) {
                return res.status(401).json({
                    success: false,
                    message: 'Senha atual incorreta'
                });
            }
            
            usuario.senha = novaSenha;
            await usuario.save();
            
            res.json({
                success: true,
                message: 'Senha alterada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao alterar senha'
            });
        }
    }
);

// Upload de avatar (simplificado)
router.post('/avatar',
    authenticateToken,
    async (req, res) => {
        try {
            // Em produção, usar multer para upload real
            const { avatarUrl } = req.body;
            
            if (!avatarUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'URL do avatar é obrigatória'
                });
            }
            
            const User = require('../models/User');
            const usuario = await User.findByIdAndUpdate(
                req.user.id,
                { avatar: avatarUrl },
                { new: true }
            ).select('-senha -__v');
            
            res.json({
                success: true,
                message: 'Avatar atualizado com sucesso',
                usuario
            });
        } catch (error) {
            console.error('Erro ao atualizar avatar:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar avatar'
            });
        }
    }
);

// ======================
// ROTAS ADMIN
// ======================

// Listar todos usuários (apenas admin)
router.get('/',
    authenticateToken,
    authorizeRoles('admin'),
    validateQuery(schemas.query.pagination),
    userController.getAllUsers
);

// Buscar usuário por ID (admin pode buscar qualquer, usuário só seu próprio)
router.get('/:id',
    authenticateToken,
    validateParams({ id: schemas.idSchema }),
    (req, res, next) => {
        // Admin pode ver qualquer perfil, usuário comum só o próprio
        if (req.user.role === 'admin' || req.user.id === req.params.id) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: 'Acesso negado. Você só pode visualizar seu próprio perfil.'
        });
    },
    userController.getUserById
);

// Atualizar usuário (admin pode atualizar qualquer, usuário só seu próprio)
router.put('/:id',
    authenticateToken,
    validateParams({ id: schemas.idSchema }),
    validate(schemas.user.atualizarPerfil),
    (req, res, next) => {
        // Admin pode atualizar qualquer usuário, usuário comum só seu próprio
        if (req.user.role === 'admin' || req.user.id === req.params.id) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: 'Acesso negado. Você só pode atualizar seu próprio perfil.'
        });
    },
    userController.updateUser
);

// Deletar usuário (apenas admin)
router.delete('/:id',
    authenticateToken,
    authorizeRoles('admin'),
    validateParams({ id: schemas.idSchema }),
    userController.deleteUser
);

// Ativar/desativar usuário (apenas admin)
router.put('/:id/status',
    authenticateToken,
    authorizeRoles('admin'),
    validateParams({ id: schemas.idSchema }),
    async (req, res) => {
        try {
            const { ativo } = req.body;
            
            if (ativo === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Campo "ativo" é obrigatório'
                });
            }
            
            const User = require('../models/User');
            const usuario = await User.findByIdAndUpdate(
                req.params.id,
                { ativo },
                { new: true }
            ).select('-senha -__v');
            
            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }
            
            res.json({
                success: true,
                message: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`,
                usuario
            });
        } catch (error) {
            console.error('Erro ao alterar status do usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao alterar status do usuário'
            });
        }
    }
);

// ======================
// ROTAS DE ESTATÍSTICAS E RELATÓRIOS
// ======================

// Estatísticas de usuários (admin)
router.get('/estatisticas/usuarios',
    authenticateToken,
    authorizeRoles('admin'),
    async (req, res) => {
        try {
            const User = require('../models/User');
            
            const [totalPorNivel, totalPorRole, crescimento] = await Promise.all([
                User.aggregate([
                    { $group: { _id: '$nivel', total: { $sum: 1 } } }
                ]),
                User.aggregate([
                    { $group: { _id: '$role', total: { $sum: 1 } } }
                ]),
                User.aggregate([
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                            total: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } },
                    { $limit: 12 }
                ])
            ]);
            
            const totalUsuarios = await User.countDocuments();
            const usuariosAtivos = await User.countDocuments({ ativo: true });
            
            res.json({
                success: true,
                estatisticas: {
                    totalUsuarios,
                    usuariosAtivos,
                    inativos: totalUsuarios - usuariosAtivos,
                    porNivel: totalPorNivel,
                    porRole: totalPorRole,
                    crescimentoMensal: crescimento
                }
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar estatísticas'
            });
        }
    }
);

// ======================
// HEALTH CHECK
// ======================

router.get('/health',
    (req, res) => {
        res.json({
            success: true,
            service: 'Users API',
            status: 'operational',
            timestamp: new Date().toISOString(),
            endpoints: {
                cadastrar: 'POST /api/users/cadastrar',
                login: 'POST /api/users/login',
                perfil: 'GET /api/users/perfil (autenticado)',
                listar: 'GET /api/users (admin)',
                verificarEmail: 'GET /api/users/verificar-email/:email'
            }
        });
    }
);

module.exports = router;