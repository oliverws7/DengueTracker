const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// GET /api/reports/public - Relatórios públicos (sem autenticação)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, tipo } = req.query;
    const skip = (page - 1) * limit;
    
    // Filtros básicos
    const filter = { 
      status: 'confirmado', // Apenas relatórios confirmados são públicos
      isPublic: true 
    };
    
    if (status) filter.status = status;
    if (tipo) filter.tipo = tipo;
    
    // Buscar relatórios
    const reports = await Report.find(filter)
      .select('-__v -updatedAt -internalNotes') // Excluir campos sensíveis
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Report.countDocuments(filter);
    
    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar relatórios públicos'
    });
  }
});

// GET /api/reports/public/stats - Estatísticas públicas
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const stats = await Report.aggregate([
      {
        $match: {
          status: 'confirmado',
          isPublic: true,
          createdAt: { $gte: lastWeek }
        }
      },
      {
        $group: {
          _id: '$tipo',
          count: { $sum: 1 },
          latest: { $max: '$createdAt' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: stats,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar estatísticas'
    });
  }
});

module.exports = router;