const express = require('express');
const router = express.Router();

// Rotas para integrações externas (com API Key)

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalReports: 0,
      activeCases: 0,
      lastUpdate: new Date()
    },
    message: 'Estatísticas para integração externa'
  });
});

router.get('/reports', (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  
  res.json({
    success: true,
    data: [],
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: 0
    }
  });
});

module.exports = router;