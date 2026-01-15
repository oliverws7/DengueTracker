const express = require("express");
const gamificationController = require("../controllers/gamificationController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const { validateQuery, schemas } = require("../middleware/validators");

const router = express.Router();

// ======================
// ROTAS PÚBLICAS
// ======================

// Ranking de usuários (público)
router.get("/ranking", 
    validateQuery(schemas.query.pagination), // Validação opcional de paginação
    gamificationController.getRanking
);

// Estatísticas globais (público)
router.get("/estatisticas", 
    gamificationController.getEstatisticasGlobais
);

// ======================
// ROTAS PROTEGIDAS (requer autenticação)
// ======================

// Perfil do usuário (requer autenticação)
router.get("/perfil", 
    authenticateToken,
    gamificationController.getPerfil
);

// Conquistas do usuário
router.get("/conquistas", 
    authenticateToken,
    gamificationController.verificarConquistas
);

// Recompensa diária
router.post("/recompensa-diaria", 
    authenticateToken,
    gamificationController.recompensaDiaria
);

// ======================
// ROTAS ADICIONAIS (melhorias)
// ======================

// Ranking por cidade/bairro (público com filtros opcionais)
router.get("/ranking/local", 
    validateQuery(schemas.query.filtrosReporte), // Reusa schema de filtros
    async (req, res) => {
        try {
            const { cidade, bairro } = req.query;
            let filtro = {};
            
            if (cidade) filtro.cidade = cidade;
            if (bairro) filtro.bairro = bairro;
            
            // Implementação básica - ajustar conforme seu modelo User
            const User = require("../models/User");
            const ranking = await User.find(filtro)
                .select("nome pontos nivel cidade bairro avatar")
                .sort({ pontos: -1 })
                .limit(20);
                
            res.json({
                success: true,
                ranking,
                filtros: { cidade, bairro }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Erro ao buscar ranking local",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Estatísticas pessoais (protegido)
router.get("/minhas-estatisticas", 
    authenticateToken,
    async (req, res) => {
        try {
            const User = require("../models/User");
            const Report = require("../models/Report");
            
            const usuario = await User.findById(req.user.id)
                .select("pontos nivel reportesRealizados focosEliminados conquistas");
                
            const estatisticasReportes = await Report.getEstatisticas(req.user.id);
            
            res.json({
                success: true,
                estatisticas: {
                    usuario: {
                        pontos: usuario.pontos,
                        nivel: usuario.nivel,
                        reportesRealizados: usuario.reportesRealizados,
                        focosEliminados: usuario.focosEliminados,
                        totalConquistas: usuario.conquistas?.length || 0
                    },
                    reportes: estatisticasReportes,
                    posicaoRanking: usuario.posicaoRanking || "Não disponível"
                }
            });
        } catch (error) {
            console.error("Erro ao buscar estatísticas pessoais:", error);
            res.status(500).json({
                success: false,
                message: "Erro ao buscar estatísticas pessoais",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Leaderboard semanal/mensal (público)
router.get("/leaderboard/:periodo", 
    validateQuery(schemas.query.pagination),
    async (req, res) => {
        try {
            const { periodo } = req.params; // 'semanal', 'mensal', 'total'
            const { pagina = 1, limite = 20 } = req.query;
            
            // Em uma implementação real, você teria uma coleção separada para pontuações por período
            // Esta é uma implementação simplificada usando os pontos totais
            const User = require("../models/User");
            const ranking = await User.find()
                .select("nome pontos nivel avatar")
                .sort({ pontos: -1 })
                .skip((pagina - 1) * limite)
                .limit(parseInt(limite));
                
            const total = await User.countDocuments();
            
            res.json({
                success: true,
                periodo,
                ranking,
                paginacao: {
                    pagina: parseInt(pagina),
                    limite: parseInt(limite),
                    total,
                    totalPaginas: Math.ceil(total / limite)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Erro ao buscar leaderboard",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Health check da gamificação
router.get("/health", 
    (req, res) => {
        res.json({
            success: true,
            service: "Gamification API",
            status: "operational",
            timestamp: new Date().toISOString(),
            endpoints: {
                ranking: "GET /api/gamification/ranking",
                estatisticas: "GET /api/gamification/estatisticas",
                perfil: "GET /api/gamification/perfil (autenticado)",
                conquistas: "GET /api/gamification/conquistas (autenticado)",
                recompensaDiaria: "POST /api/gamification/recompensa-diaria (autenticado)"
            }
        });
    }
);

module.exports = router;