const express = require("express");
const gamificationController = require("../controllers/gamificationController");
const { verificarToken } = require("../middleware/auth");

const router = express.Router();

// Rotas públicas
router.get("/ranking", gamificationController.getRanking);
router.get("/estatisticas", gamificationController.getEstatisticasGlobais);

// Rotas protegidas
router.get("/perfil", verificarToken, gamificationController.getPerfil);
router.get("/conquistas", verificarToken, gamificationController.verificarConquistas);
router.post("/recompensa-diaria", verificarToken, gamificationController.recompensaDiaria);

module.exports = router;
