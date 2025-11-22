const express = require('express');
const {
    criarReporte,
    listarMeusReportes,
    listarReportes,
    atualizarStatus
} = require('../controllers/reportController');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

router.post('/criar', verificarToken, criarReporte);
router.get('/meus', verificarToken, listarMeusReportes);
router.get('/', verificarToken, listarReportes);
router.put('/status', verificarToken, atualizarStatus);

module.exports = router;