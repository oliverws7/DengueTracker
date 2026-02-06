const cors = require('cors');

// Tenta pegar do .env, senão usa os padrões de desenvolvimento
let allowedOrigins;
if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
} else {
    allowedOrigins = [
        'http://localhost:5173',    // VITE/FRONTEND
        'http://localhost:3000',    // Create React App  
        'http://localhost:5000',    // Backend/testes
        'http://127.0.0.1:5173',    // Frontend por IP
        'http://127.0.0.1:5000'     // Backend por IP
    ];
}

console.log('🌐 CORS Configurado - Origens permitidas:', allowedOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        // Permite requests sem origin
        if (!origin) {
            console.log('🔓 Request sem origin, permitindo...');
            return callback(null, true);
        }
        
        console.log('📡 Origem recebida:', origin);
        
        // Se a lista contém '*' literalmente, permite tudo
        if (allowedOrigins.includes('*')) {
            console.log('🌟 Curinga * ativo - permitindo qualquer origem');
            return callback(null, true);
        }
        
        // Verifica se a origem está na lista
        if (allowedOrigins.includes(origin)) {
            console.log('✅ CORS permitido para:', origin);
            return callback(null, true);
        } else {
            console.error('🚫 CORS bloqueado:', origin);
            console.error('💡 Origens permitidas:', allowedOrigins);
            return callback(new Error('A política de CORS não permite acesso desta origem.'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);