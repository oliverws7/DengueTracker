const User = require("../models/User");

const gamificationController = {
  // RANKING - SEMPRE FUNCIONA
  async getRanking(req, res) {
    try {
      const ranking = await User.find()
        .select("nome pontos nivel")
        .sort({ pontos: -1 })
        .limit(20);
      res.json({ success: true, ranking });
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar ranking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ESTATÍSTICAS - SEMPRE FUNCIONA
  async getEstatisticasGlobais(req, res) {
    try {
      const totalUsuarios = await User.countDocuments();
      const totalPontos = await User.aggregate([
        { $group: { _id: null, total: { $sum: "$pontos" } } }
      ]);
      
      res.json({
        success: true,
        estatisticas: {
          totalUsuarios,
          totalPontos: totalPontos[0]?.total || 0,
          atualizadoEm: new Date()
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar estatísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // PERFIL - SIMPLES (AJUSTADO para req.user)
  async getPerfil(req, res) {
    try {
      // Verifica se o usuário está autenticado
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
      }
      
      const usuario = await User.findById(req.user.id).select("nome pontos nivel");
      
      if (!usuario) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuário não encontrado' 
        });
      }
      
      res.json({ 
        success: true, 
        perfil: usuario 
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar perfil',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // CONQUISTAS - SIMPLES
  async verificarConquistas(req, res) {
    try {
      // Verifica se o usuário está autenticado
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
      }
      
      // Busca conquistas reais do usuário (exemplo)
      const usuario = await User.findById(req.user.id).select("conquistas");
      
      res.json({ 
        success: true, 
        conquistas: usuario?.conquistas || [
          { nome: "Primeiro Reporte", desbloqueada: true },
          { nome: "Reporter Ativo", desbloqueada: false },
          { nome: "Mestre da Dengue", desbloqueada: false }
        ]
      });
    } catch (error) {
      console.error('Erro ao verificar conquistas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao verificar conquistas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // RECOMPENSA DIÁRIA - SIMPLES
  async recompensaDiaria(req, res) {
    try {
      // Verifica se o usuário está autenticado
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
      }
      
      // Adiciona pontos ao usuário
      const usuario = await User.findById(req.user.id);
      if (usuario) {
        usuario.pontos = (usuario.pontos || 0) + 10;
        usuario.ultimaRecompensa = new Date();
        await usuario.save();
      }
      
      res.json({ 
        success: true, 
        message: "+10 pontos pela recompensa diária!",
        pontos: 10,
        totalPontos: usuario?.pontos || 0
      });
    } catch (error) {
      console.error('Erro ao processar recompensa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar recompensa',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = gamificationController;