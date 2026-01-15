const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');
const { validate, schemas, validateQuery, validateParams } = require('../middleware/validators');
const { reportLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// ======================
// ROTAS PÚBLICAS (somente leitura)
// ======================

// Listar reportes públicos (com filtros)
router.get('/publicos',
    optionalAuth, // Autenticação opcional para personalização
    validateQuery(schemas.query.filtrosReporte),
    validateQuery(schemas.query.pagination),
    async (req, res) => {
        try {
            const Report = require('../models/Report');
            const { pagina = 1, limite = 10, status, tipoCriadouro, cidade, bairro } = req.query;
            
            const filtro = { 
                status: { $in: ['confirmado', 'eliminado'] } // Apenas reportes verificados publicamente
            };
            
            // Aplicar filtros adicionais
            if (status) filtro.status = status;
            if (tipoCriadouro) filtro.tipoCriadouro = tipoCriadouro;
            if (cidade) filtro.cidade = cidade;
            if (bairro) filtro.bairro = bairro;
            
            const reportes = await Report.find(filtro)
                .populate('usuario', 'nome nivel avatar')
                .sort({ createdAt: -1 })
                .skip((pagina - 1) * limite)
                .limit(parseInt(limite));
                
            const total = await Report.countDocuments(filtro);
            
            res.json({
                success: true,
                reportes,
                paginacao: {
                    pagina: parseInt(pagina),
                    limite: parseInt(limite),
                    total,
                    totalPaginas: Math.ceil(total / limite)
                },
                filtros: req.query
            });
        } catch (error) {
            console.error('Erro ao listar reportes públicos:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao listar reportes públicos'
            });
        }
    }
);

// Mapa de calor (dados agregados para mapa)
router.get('/mapa-calor',
    async (req, res) => {
        try {
            const Report = require('../models/Report');
            const { cidade, dias = 30 } = req.query;
            
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - parseInt(dias));
            
            const filtro = { 
                createdAt: { $gte: dataLimite },
                status: 'confirmado'
            };
            if (cidade) filtro.cidade = cidade;
            
            const pontos = await Report.find(filtro)
                .select('localizacao.lat localizacao.lng tipoCriadouro nivelRisco createdAt')
                .limit(1000); // Limitar para performance
                
            res.json({
                success: true,
                pontos: pontos.map(p => ({
                    lat: p.localizacao.lat,
                    lng: p.localizacao.lng,
                    tipo: p.tipoCriadouro,
                    risco: p.nivelRisco,
                    data: p.createdAt
                })),
                total: pontos.length,
                periodoDias: dias
            });
        } catch (error) {
            console.error('Erro ao gerar mapa de calor:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar mapa de calor'
            });
        }
    }
);

// ======================
// ROTAS PROTEGIDAS (usuários autenticados)
// ======================

// Criar reporte
router.post('/criar',
    authenticateToken,
    reportLimiter, // Rate limiting para criação de reportes
    validate(schemas.report.criarReporte),
    reportController.criarReporte
);

// Criar reporte (alias em inglês)
router.post('/create',
    authenticateToken,
    reportLimiter,
    validate(schemas.report.create),
    reportController.criarReporte
);

// Meus reportes
router.get('/meus',
    authenticateToken,
    validateQuery(schemas.query.pagination),
    reportController.listarMeusReportes
);

// Detalhes de um reporte específico
router.get('/:id',
    authenticateToken,
    validateParams({ id: schemas.idSchema }), // Valida se ID é válido
    async (req, res) => {
        try {
            const Report = require('../models/Report');
            const reporte = await Report.findById(req.params.id)
                .populate('usuario', 'nome nivel avatar')
                .populate('agenteResponsavel', 'nome role');
                
            if (!reporte) {
                return res.status(404).json({
                    success: false,
                    message: 'Reporte não encontrado'
                });
            }
            
            // Verificar permissões: usuário pode ver seu próprio reporte, admin pode ver todos
            if (req.user.role !== 'admin' && reporte.usuario._id.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado. Você só pode visualizar seus próprios reportes.'
                });
            }
            
            res.json({
                success: true,
                reporte
            });
        } catch (error) {
            console.error('Erro ao buscar reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar reporte'
            });
        }
    }
);

// ======================
// ROTAS ADMIN/AGENTE
// ======================

// Listar todos reportes (admin/agente)
router.get('/',
    authenticateToken,
    authorizeRoles('admin', 'agente'),
    validateQuery(schemas.query.filtrosReporte),
    validateQuery(schemas.query.pagination),
    reportController.listarReportes
);

// Atualizar status (admin/agente)
router.put('/status',
    authenticateToken,
    authorizeRoles('admin', 'agente'),
    validate(schemas.report.atualizarStatus),
    reportController.atualizarStatus
);

// Atualizar reporte completo (admin/agente)
router.put('/:id',
    authenticateToken,
    authorizeRoles('admin', 'agente'),
    validateParams({ id: schemas.idSchema }),
    async (req, res) => {
        try {
            const Report = require('../models/Report');
            const { observacoesAgente, nivelRisco, agenteResponsavel } = req.body;
            
            const atualizacao = {};
            if (observacoesAgente !== undefined) atualizacao.observacoesAgente = observacoesAgente;
            if (nivelRisco !== undefined) atualizacao.nivelRisco = nivelRisco;
            if (agenteResponsavel !== undefined) atualizacao.agenteResponsavel = agenteResponsavel;
            
            const reporte = await Report.findByIdAndUpdate(
                req.params.id,
                atualizacao,
                { new: true, runValidators: true }
            ).populate('usuario agenteResponsavel', 'nome email role');
            
            if (!reporte) {
                return res.status(404).json({
                    success: false,
                    message: 'Reporte não encontrado'
                });
            }
            
            res.json({
                success: true,
                message: 'Reporte atualizado com sucesso',
                reporte
            });
        } catch (error) {
            console.error('Erro ao atualizar reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar reporte'
            });
        }
    }
);

// Estatísticas (admin/agente)
router.get('/estatisticas/avancadas',
    authenticateToken,
    authorizeRoles('admin', 'agente'),
    async (req, res) => {
        try {
            const Report = require('../models/Report');
            
            const [porTipo, porStatus, porCidade, porMes] = await Promise.all([
                Report.getPorTipoCriadouro(),
                Report.aggregate([
                    { $group: { _id: '$status', total: { $sum: 1 } } }
                ]),
                Report.aggregate([
                    { $group: { _id: '$cidade', total: { $sum: 1 } } },
                    { $sort: { total: -1 } },
                    { $limit: 10 }
                ]),
                Report.aggregate([
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
            
            res.json({
                success: true,
                estatisticas: {
                    porTipoCriadouro: porTipo,
                    porStatus: porStatus,
                    topCidades: porCidade,
                    evolucaoMensal: porMes
                }
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas avançadas:', error);
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
            service: 'Reports API',
            status: 'operational',
            timestamp: new Date().toISOString(),
            endpoints: {
                publicos: 'GET /api/reports/publicos',
                mapaCalor: 'GET /api/reports/mapa-calor',
                criar: 'POST /api/reports/criar (autenticado)',
                meus: 'GET /api/reports/meus (autenticado)',
                todos: 'GET /api/reports (admin/agente)',
                atualizarStatus: 'PUT /api/reports/status (admin/agente)'
            }
        });
    }
);

module.exports = router;