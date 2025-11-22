const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // ← ADICIONE ESTA LINHA!

// Gerar token JWT
const gerarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Cadastrar usuário - VERSÃO SIMPLIFICADA
exports.cadastrar = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    console.log('📝 Tentando cadastrar:', { nome, email });

    // Verificar se usuário já existe
    const usuarioExiste = await User.findOne({ email });
    if (usuarioExiste) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já cadastrado com este email'
      });
    }

    // Criar usuário DIRETO sem hooks complexos
    const usuario = new User({
      nome,
      email,
      senha: await bcrypt.hash(senha, 12) // Criptografa manualmente
    });

    await usuario.save();

    // Gerar token
    const token = gerarToken(usuario._id);

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        pontos: usuario.pontos
      }
    });

  } catch (error) {
    console.log('❌ Erro detalhado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cadastrar usuário',
      error: error.message
    });
  }
};


// Login do usuário
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Verificar se usuário existe e senha está correta
    const usuario = await User.findOne({ email }).select('+senha');
    if (!usuario || !(await usuario.verificarSenha(senha))) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Gerar token
    const token = gerarToken(usuario._id);

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        pontos: usuario.pontos
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message
    });
  }
};

// Buscar perfil do usuário
exports.getPerfil = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuarioId);
    
    res.json({
      success: true,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        pontos: usuario.pontos,
        localizacao: usuario.localizacao
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil',
      error: error.message
    });
  }
};