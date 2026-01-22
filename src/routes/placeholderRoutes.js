const express = require('express');
const router = express.Router();

// Rota placeholder genérica
router.all('*', (req, res) => {
  res.status(200).json({
    success: true,
    message: `Rota ${req.path} - Em desenvolvimento`,
    method: req.method,
    available: true,
    inDevelopment: true
  });
});

module.exports = router;