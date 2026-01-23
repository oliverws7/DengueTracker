const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

/**
 * @route GET /api/reports/public
 * @desc Obter relatórios públicos (sem autenticação)
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    // Parâmetros de paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtros básicos (apenas dados públicos)
    const filter = {
      status: 'confirmado', // Apenas relatórios confirmados
      isPublic: true
    };

    // Filtros opcionais
    if (req.query.tipo) filter.tipo = req.query.tipo;
    if (req.query.bairro) filter.localizacao = { $regex: req.query.bairro, $options: 'i' };
    
    // Data mínima (últimos 30 dias por padrão)
    const days = parseInt(req.query.days) || 30;
    filter.createdAt = {
      $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    };

    // Buscar relatórios
    const reports = await Report.find(filter)
      .select('-__v -internalNotes -updatedBy -isPublic') // Excluir campos sensíveis
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total
    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      count: reports.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      data: reports.map(report => ({
        ...report,
        // Garantir que dados sensíveis não sejam expostos
        reportadoPor: report.reportadoPor ? {
          _id: report.reportadoPor._id,
          nome: report.reportadoPor.nome
        } : undefined
      }))
    });
  } catch (error) {
    console.error('Erro em public reports:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar relatórios públicos',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/reports/public/stats
 * @desc Estatísticas públicas de dengue
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Agregação para estatísticas
    const stats = await Report.aggregate([
      {
        $match: {
          status: 'confirmado',
          isPublic: true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            tipo: '$tipo',
            status: '$status'
          },
          count: { $sum: 1 },
          ultimo: { $max: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$_id.tipo',
          total: { $sum: '$count' },
          ultimoRelatorio: { $max: '$ultimo' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Contagem total
    const totalReports = await Report.countDocuments({
      status: 'confirmado',
      isPublic: true,
      createdAt: { $gte: startDate }
    });

    // Contagem por bairro (top 10)
    const bairros = await Report.aggregate([
      {
        $match: {
          status: 'confirmado',
          isPublic: true,
          createdAt: { $gte: startDate },
          'localizacao.bairro': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$localizacao.bairro',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        periodo: {
          inicio: startDate,
          dias: days
        },
        totalRelatorios: totalReports,
        porTipo: stats,
        bairrosMaisAfetados: bairros,
        atualizacao: new Date()
      }
    });
  } catch (error) {
    console.error('Erro em stats públicos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar estatísticas públicas'
    });
  }
});

/**
 * @route GET /api/reports/public/map
 * @desc Dados para mapa de calor (geolocalização)
 * @access Public
 */
router.get('/map', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const mapData = await Report.find({
      status: 'confirmado',
      isPublic: true,
      createdAt: { $gte: startDate },
      'localizacao.coordenadas': { $exists: true }
    })
    .select('localizacao.coordenadas tipo createdAt')
    .limit(500) // Limitar para performance
    .lean();

    res.json({
      success: true,
      count: mapData.length,
      data: mapData.map(item => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: item.localizacao.coordenadas
        },
        properties: {
          tipo: item.tipo,
          data: item.createdAt
        }
      })),
      metadata: {
        periodo: days + ' dias',
        atualizacao: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar dados do mapa'
    });
  }
});

module.exports = router;