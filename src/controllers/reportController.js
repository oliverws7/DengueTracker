const Report = require("../models/Report");
const User = require("../models/User");

const reportController = {
  async criarReporte(req, res) {
    try {
      const { localizacao, endereco, tipoCriadouro, descricao, foto } = req.body;
      const usuarioId = req.userId;

      // Criar reporte
      const novoReporte = new Report({
        usuario: usuarioId,
        localizacao,
        endereco,
        tipoCriadouro,
        descricao,
        foto,
        status: "pendente"
      });

      await novoReporte.save();
      await novoReporte.populate("usuario", "nome nivel pontos");

      // 🎮 SISTEMA DE GAMIFICAÇÃO - RECOMPENSAS
      const usuario = await User.findById(usuarioId);
      
      const pontosBase = 15;
      usuario.pontos += pontosBase;
      usuario.experiencia += pontosBase;
      usuario.reportesRealizados += 1;
      
      const bonusCriadouro = {
        "agua-parada": 5,
        "pneu": 10,
        "vaso-planta": 3,
        "lixo": 7
      };
      
      const bonus = bonusCriadouro[tipoCriadouro] || 0;
      usuario.pontos += bonus;
      usuario.experiencia += bonus;
      
      usuario.nivel = usuario.calcularNivel();
      await usuario.save();

      // 🔔 WEBSOCKET: NOTIFICAÇÃO DE NOVO REPORTE
      if (global.io) {
        // Notificar sala global
        global.io.to("sala-global").emit("novo-reporte", {
          tipo: "NOVO_REPORTE",
          mensagem: "🎯 Novo foco de dengue reportado!",
          reporte: {
            id: novoReporte._id,
            endereco: novoReporte.endereco,
            tipoCriadouro: novoReporte.tipoCriadouro,
            usuario: novoReporte.usuario.nome,
            nivelUsuario: novoReporte.usuario.nivel
          },
          localizacao: novoReporte.localizacao,
          timestamp: new Date()
        });

        // Notificar sala de admin
        global.io.to("sala-admin").emit("alerta-admin", {
          tipo: "ALERTA_ADMIN",
          prioridade: "media",
          mensagem: `Novo reporte em ${endereco}`,
          reporteId: novoReporte._id,
          usuario: novoReporte.usuario.nome,
          timestamp: new Date()
        });

        // Notificar sala de ranking sobre pontos atualizados
        global.io.to("sala-ranking").emit("pontos-atualizados", {
          usuarioId: usuarioId,
          usuario: usuario.nome,
          pontosAntigos: usuario.pontos - pontosBase - bonus,
          pontosNovos: usuario.pontos,
          diferenca: pontosBase + bonus,
          nivel: usuario.nivel
        });

        // Notificar área específica se aplicável
        const salaArea = `area:${localizacao.lat.toFixed(2)}:${localizacao.lng.toFixed(2)}`;
        global.io.to(salaArea).emit("reporte-na-area", {
          mensagem: "⚠️ Novo foco reportado na sua área!",
          endereco: endereco,
          distancia: "próximo",
          timestamp: new Date()
        });
      }

      res.status(201).json({
        success: true,
        message: `Reporte criado com sucesso! +${pontosBase + bonus} pontos`,
        reporte: novoReporte,
        pontosGanhos: pontosBase + bonus,
        nivelAtual: usuario.nivel,
        notificacao: "Eventos WebSocket enviados"
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao criar reporte",
        error: error.message
      });
    }
  },

  async listarReportes(req, res) {
    try {
      const reportes = await Report.find()
        .populate("usuario", "nome nivel")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: reportes.length,
        reportes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao listar reportes",
        error: error.message
      });
    }
  },

  async listarMeusReportes(req, res) {
    try {
      const usuarioId = req.userId;
      const reportes = await Report.find({ usuario: usuarioId })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: reportes.length,
        reportes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao listar seus reportes",
        error: error.message
      });
    }
  },

  async atualizarStatus(req, res) {
    try {
      const { reporteId, status } = req.body;
      
      const reporte = await Report.findByIdAndUpdate(
        reporteId,
        { status },
        { new: true }
      ).populate("usuario", "nome email");

      if (!reporte) {
        return res.status(404).json({
          success: false,
          message: "Reporte não encontrado"
        });
      }

      // 🎮 RECOMPENSA POR FOCO ELIMINADO
      if (status === "eliminado" && reporte.usuario) {
        const usuario = await User.findById(reporte.usuario._id);
        usuario.focosEliminados += 1;
        usuario.pontos += 20;
        usuario.experiencia += 20;
        usuario.nivel = usuario.calcularNivel();
        await usuario.save();

        // 🔔 WEBSOCKET: NOTIFICAÇÃO DE FOCO ELIMINADO
        if (global.io) {
          global.io.to(`usuario:${reporte.usuario._id}`).emit("foco-eliminado", {
            tipo: "FOCO_ELIMINADO",
            mensagem: "✅ Seu reporte foi resolvido! Foco eliminado!",
            reporteId: reporte._id,
            endereco: reporte.endereco,
            pontosGanhos: 20,
            timestamp: new Date()
          });

          global.io.to("sala-ranking").emit("ranking-atualizado", {
            usuario: usuario.nome,
            pontos: usuario.pontos,
            nivel: usuario.nivel,
            acao: "foco_eliminado"
          });
        }
      }

      res.json({
        success: true,
        message: "Status atualizado com sucesso",
        reporte
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao atualizar status",
        error: error.message
      });
    }
  }
};

module.exports = reportController;
