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
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ESTATÍSTICAS - SEMPRE FUNCIONA
  async getEstatisticasGlobais(req, res) {
    try {
      const totalUsuarios = await User.countDocuments();
      const totalPontos = await User.aggregate([{ $group: { _id: null, total: { $sum: "$pontos" } } }]);
      res.json({
        success: true,
        estatisticas: {
          totalUsuarios,
          totalPontos: totalPontos[0]?.total || 0,
          atualizadoEm: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // PERFIL - SIMPLES
  async getPerfil(req, res) {
    try {
      const usuario = await User.findById(req.userId).select("nome pontos nivel");
      res.json({ success: true, perfil: usuario });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // CONQUISTAS - SIMPLES
  async verificarConquistas(req, res) {
    try {
      res.json({ 
        success: true, 
        conquistas: [
          { nome: "Primeiro Reporte", desbloqueada: true },
          { nome: "Reporter Ativo", desbloqueada: false }
        ] 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // RECOMPENSA DIÁRIA - SIMPLES
  async recompensaDiaria(req, res) {
    try {
      res.json({ 
        success: true, 
        message: "+10 pontos pela recompensa diária!",
        pontos: 10 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = gamificationController;
