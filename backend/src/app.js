// src/app.js
const express = require('express');
const corsMiddleware = require('./middlewares/cors');
const healthCheck = require('./middlewares/health');

const app = express();

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);

// Rota de health check (pública, sem autenticação)
app.get('/health', healthCheck);

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'DengueTracker API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api: '/api'
        }
    });
});

// Futuras rotas da API
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/reports', require('./routes/reports'));
// app.use('/api/users', require('./routes/users'));

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Middleware de erro global
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    
    // Erro de CORS
    if (err.message.includes('CORS')) {
        return res.status(403).json({
            error: 'CORS policy violation',
            message: 'Origin not allowed'
        });
    }
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

module.exports = app;