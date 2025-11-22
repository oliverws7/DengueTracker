const express = require('express');
const { cadastrar, login, getPerfil } = require('../controllers/userController');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

// Rota pública - Cadastro
router.post('/cadastrar', cadastrar);

// Rota pública - Login
router.post('/login', login);

// Rota protegida - Perfil do usuário
router.get('/perfil', verificarToken, getPerfil);

module.exports = router;