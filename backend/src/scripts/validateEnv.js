const requiredEnvVars = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'NODE_ENV'
];

function validateEnv() {
  console.log('🔍 Verificando integridade do ambiente...');
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ ERRO: Variáveis obrigatórias ausentes no .env:', missing);
    process.exit(1);
  }

  // Verifica se a string do Atlas está no formato correto
  if (!process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    console.warn('⚠️ Alerta: MONGODB_URI não parece ser uma conexão Atlas (Srv).');
  }

  console.log('✅ Ambiente validado.');
  return true;
}

module.exports = validateEnv;