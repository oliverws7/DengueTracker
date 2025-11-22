const jwt = require('jsonwebtoken');

exports.verificarToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Acesso negado. Token não fornecido.' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu-segredo-aqui');
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token inválido.' 
        });
    }
};