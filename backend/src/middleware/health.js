// src/middlewares/health.js
const healthCheck = (req, res) => {
    const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'DengueTracker API',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        database: 'unknown' // Vamos melhorar isso depois
    };

    // Verifica conexão com MongoDB (se estiver configurado)
    // try {
    //     const dbStatus = mongoose.connection.readyState;
    //     healthData.database = dbStatus === 1 ? 'connected' : 'disconnected';
    //     healthData.status = dbStatus === 1 ? 'healthy' : 'degraded';
    // } catch (error) {
    //     healthData.database = 'error';
    //     healthData.status = 'degraded';
    // }

    res.status(healthData.status === 'healthy' ? 200 : 503).json(healthData);
};

module.exports = healthCheck;