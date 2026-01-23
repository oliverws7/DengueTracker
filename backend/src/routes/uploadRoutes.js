const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Middlewares
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { 
  uploadSingle, 
  uploadMultiple, 
  validateImage, 
  compressImage,
  deleteFile,
  config 
} = require('../middleware/upload');

// Model
const Report = require('../models/Report');

/**
 * @route   POST /api/upload/image
 * @desc    Upload de uma única imagem
 * @access  Private
 */
router.post('/image', 
  authenticateToken,
  uploadSingle('image'),
  validateImage,
  compressImage,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Nenhuma imagem recebida'
        });
      }

      const { originalname, mimetype, size, filename, path: filePath, url } = req.file;

      // Se houver um reportId, vincular a imagem ao relatório
      let report = null;
      if (req.body.reportId) {
        report = await Report.findById(req.body.reportId);
        
        if (report) {
          // Verificar se o usuário tem permissão
          if (report.reportadoPor.toString() !== req.userId && req.user.role !== 'admin') {
            // Deletar a imagem enviada
            await deleteFile(url);
            
            return res.status(403).json({
              success: false,
              error: 'Sem permissão para adicionar imagem a este relatório'
            });
          }

          // Adicionar imagem ao relatório
          report.imagens.push({
            url: url,
            filename: filename,
            originalName: originalname,
            uploadedBy: req.userId,
            uploadedAt: new Date()
          });

          await report.save();
        }
      }

      res.status(201).json({
        success: true,
        message: 'Imagem enviada com sucesso',
        data: {
          id: uuidv4(),
          filename: filename,
          originalName: originalname,
          mimeType: mimetype,
          size: size,
          url: url,
          uploadedAt: new Date(),
          reportLinked: !!report,
          reportId: report?._id,
          metadata: {
            dimensions: null, // Você pode adicionar sharp para obter dimensões
            colorSpace: null
          }
        }
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      
      // Tentar deletar o arquivo em caso de erro
      if (req.file && req.file.url) {
        try {
          await deleteFile(req.file.url);
        } catch (deleteError) {
          console.error('Erro ao deletar arquivo:', deleteError);
        }
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno no servidor durante o upload',
        code: 'UPLOAD_SERVER_ERROR'
      });
    }
  }
);

/**
 * @route   POST /api/upload/images
 * @desc    Upload de múltiplas imagens
 * @access  Private
 */
router.post('/images',
  authenticateToken,
  uploadMultiple('images', 10),
  validateImage,
  compressImage,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhuma imagem recebida'
        });
      }

      // Processar cada imagem
      const uploadedImages = await Promise.all(req.files.map(async (file) => {
        const { originalname, mimetype, size, filename, url } = file;

        return {
          id: uuidv4(),
          filename: filename,
          originalName: originalname,
          mimeType: mimetype,
          size: size,
          url: url,
          uploadedAt: new Date(),
          uploadedBy: req.userId
        };
      }));

      // Vincular a um relatório se especificado
      let report = null;
      if (req.body.reportId) {
        report = await Report.findById(req.body.reportId);
        
        if (report) {
          // Verificar permissão
          if (report.reportadoPor.toString() !== req.userId && req.user.role !== 'admin') {
            // Deletar todas as imagens enviadas
            await Promise.all(uploadedImages.map(img => deleteFile(img.url)));
            
            return res.status(403).json({
              success: false,
              error: 'Sem permissão para adicionar imagens a este relatório'
            });
          }

          // Adicionar imagens ao relatório
          uploadedImages.forEach(img => {
            report.imagens.push({
              url: img.url,
              filename: img.filename,
              originalName: img.originalName,
              uploadedBy: req.userId,
              uploadedAt: new Date()
            });
          });

          await report.save();
        }
      }

      res.status(201).json({
        success: true,
        message: `${uploadedImages.length} imagem(ns) enviada(s) com sucesso`,
        data: {
          count: uploadedImages.length,
          images: uploadedImages,
          reportLinked: !!report,
          reportId: report?._id
        }
      });

    } catch (error) {
      console.error('Erro no upload múltiplo:', error);
      
      // Deletar todos os arquivos em caso de erro
      if (req.files && req.files.length > 0) {
        await Promise.all(req.files.map(file => 
          deleteFile(file.url).catch(err => console.error('Erro ao deletar:', err))
        ));
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno no servidor durante o upload',
        code: 'UPLOAD_SERVER_ERROR'
      });
    }
  }
);

/**
 * @route   DELETE /api/upload/:filename
 * @desc    Deletar uma imagem
 * @access  Private
 */
router.delete('/:filename',
  authenticateToken,
  async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Verificar se a imagem existe
      const imagePath = path.join(config.uploadDir, filename);
      
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({
          success: false,
          error: 'Imagem não encontrada'
        });
      }

      // Verificar se a imagem está vinculada a algum relatório
      const reportsWithImage = await Report.find({
        'imagens.filename': filename
      });

      // Se estiver vinculada, verificar permissões
      if (reportsWithImage.length > 0) {
        const canDelete = reportsWithImage.every(report => {
          return report.reportadoPor.toString() === req.userId || req.user.role === 'admin';
        });

        if (!canDelete) {
          return res.status(403).json({
            success: false,
            error: 'Sem permissão para deletar esta imagem'
          });
        }

        // Remover imagem dos relatórios
        await Promise.all(reportsWithImage.map(async (report) => {
          report.imagens = report.imagens.filter(img => img.filename !== filename);
          await report.save();
        }));
      }

      // Deletar arquivo físico
      await deleteFile(`/images/${filename}`);

      res.json({
        success: true,
        message: 'Imagem deletada com sucesso',
        data: {
          filename: filename,
          deletedFromReports: reportsWithImage.length
        }
      });

    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao deletar imagem'
      });
    }
  }
);

/**
 * @route   GET /api/upload/list
 * @desc    Listar imagens do usuário
 * @access  Private
 */
router.get('/list',
  authenticateToken,
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      // Buscar relatórios com imagens do usuário
      const reports = await Report.find({
        'imagens.uploadedBy': req.userId
      })
      .select('imagens titulo createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

      // Extrair e formatar imagens
      const images = [];
      reports.forEach(report => {
        report.imagens
          .filter(img => img.uploadedBy.toString() === req.userId)
          .forEach(img => {
            images.push({
              ...img,
              reportId: report._id,
              reportTitle: report.titulo,
              reportDate: report.createdAt
            });
          });
      });

      // Contar total
      const totalQuery = await Report.aggregate([
        { $match: { 'imagens.uploadedBy': mongoose.Types.ObjectId(req.userId) } },
        { $project: { count: { $size: { $filter: { input: '$imagens', as: 'img', cond: { $eq: ['$$img.uploadedBy', mongoose.Types.ObjectId(req.userId)] } } } } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]);

      const total = totalQuery.length > 0 ? totalQuery[0].total : 0;

      res.json({
        success: true,
        data: {
          images: images,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erro ao listar imagens:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar imagens'
      });
    }
  }
);

/**
 * @route   GET /api/upload/config
 * @desc    Obter configurações de upload
 * @access  Public
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      allowedTypes: Object.keys(config.allowedMimeTypes),
      maxFileSize: config.maxFileSize,
      maxFileSizeMB: config.maxFileSize / 1024 / 1024,
      maxFilesPerUpload: 10,
      uploadDir: config.uploadDir
    }
  });
});

module.exports = router;