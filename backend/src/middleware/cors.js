// src/middlewares/cors.js
const cors = require('cors');

const corsOptions = {
    origin: function (origin, callback) {
        // Em desenvolvimento, permita localhost e seu frontend
        const allowedOrigins = [
            'http://localhost:3000',    // React frontend comum
            'http://localhost:5173',    // Vite frontend comum
            'http://localhost:8080',    // Outro frontend
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
        ];
        
        // Permitir requisições sem origin (como Postman)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);