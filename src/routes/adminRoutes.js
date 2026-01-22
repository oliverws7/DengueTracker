const express = require('express');
const router = express.Router();

// Middleware que verifica se o usuário é admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado. Apenas administradores.',
      code: 'ADMIN_ONLY'
    });
  }
  next();
};

// Dashboard admin
router.get('/dashboard', isAdmin, (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Dashboard administrativo - Em desenvolvimento',
      user: req.user,
      stats: {
        totalUsers: 0,
        totalReports: 0,
        pendingReports: 0
      }
    }
  });
});

// Gerenciamento de usuários
router.get('/users', isAdmin, (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Lista de usuários - Em desenvolvimento'
  });
});

// Gerenciamento de relatórios
router.get('/reports', isAdmin, (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Gerenciamento de relatórios - Em desenvolvimento'
  });
});

module.exports = router;