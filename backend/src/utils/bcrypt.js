const bcrypt = require('bcrypt');

const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || 10;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

// Hash de senha
exports.hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Senha inválida');
  }
  
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error('Erro ao gerar hash da senha:', error);
    throw new Error('Erro ao processar senha');
  }
};

// Comparar senha
exports.comparePassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword) {
    return false;
  }
  
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Erro ao comparar senhas:', error);
    return false;
  }
};

// Validar força da senha
exports.validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Senha é obrigatória',
      score: 0,
      suggestions: []
    };
  }
  
  // Verificar comprimento
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      message: `Senha muito curta. Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
      score: 1,
      suggestions: ['Use pelo menos 8 caracteres']
    };
  }
  
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      isValid: false,
      message: `Senha muito longa. Máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
      score: 1,
      suggestions: ['Use no máximo 128 caracteres']
    };
  }
  
  // Verificar força com critérios
  const checks = {
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecial: /[@$!%*?&]/.test(password),
    hasMinLength: password.length >= PASSWORD_MIN_LENGTH
  };
  
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const score = Math.floor((passedChecks / Object.keys(checks).length) * 100);
  
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const isValid = strongPasswordRegex.test(password);
  
  // Gerar sugestões baseadas nos checks que falharam
  const suggestions = [];
  if (!checks.hasLowercase) suggestions.push('Adicione letras minúsculas');
  if (!checks.hasUppercase) suggestions.push('Adicione letras maiúsculas');
  if (!checks.hasNumbers) suggestions.push('Adicione números');
  if (!checks.hasSpecial) suggestions.push('Adicione caracteres especiais (@$!%*?&)');
  
  return {
    isValid,
    message: isValid 
      ? 'Senha forte ✓' 
      : 'Senha fraca. ' + suggestions.join(', '),
    score,
    suggestions: suggestions.length > 0 ? suggestions : ['Senha forte!'],
    checks
  };
};

// Gerar senha aleatória segura
exports.generateSecurePassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '@$!%*?&';
  
  const allChars = lowercase + uppercase + numbers + special;
  
  // Garantir que tenha pelo menos um de cada tipo
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Completar com caracteres aleatórios
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Embaralhar a senha
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  
  return password;
};

// Verificar se senha está em lista de senhas comuns
exports.isCommonPassword = async (password) => {
  // Em produção, você poderia verificar contra uma lista de senhas comuns
  // Esta é uma implementação simplificada
  const commonPasswords = [
    'password', '123456', '12345678', '123456789', '1234567890',
    'senha', 'password123', 'qwerty', 'abc123', '111111',
    '123123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
};

// Função para validar senha com todas as verificações
exports.validatePasswordComprehensive = async (password) => {
  const strength = exports.validatePasswordStrength(password);
  const isCommon = await exports.isCommonPassword(password);
  
  return {
    ...strength,
    isCommonPassword: isCommon,
    overallValid: strength.isValid && !isCommon,
    finalMessage: isCommon 
      ? 'Senha muito comum. Escolha uma senha mais única.'
      : strength.message
  };
};

// Função para criar hash com tempo constante (proteção contra timing attacks)
exports.hashPasswordSecure = async (password) => {
  // Usar tempo constante para prevenir timing attacks
  const start = Date.now();
  const hash = await exports.hashPassword(password);
  const end = Date.now();
  
  // Garantir tempo mínimo de processamento
  const minTime = 100; // 100ms mínimo
  const elapsed = end - start;
  
  if (elapsed < minTime) {
    // Adicionar delay artificial se necessário
    await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
  }
  
  return hash;
};

// Função para verificar similaridade com dados do usuário
exports.isSimilarToUserData = (password, userData) => {
  if (!userData || !password) return false;
  
  const userInfo = [
    userData.nome,
    userData.email?.split('@')[0], // parte local do email
    userData.email,
    'dengue',
    'tracker',
    '2024',
    '2023'
  ].filter(Boolean);
  
  const passwordLower = password.toLowerCase();
  
  return userInfo.some(info => {
    if (!info) return false;
    const infoLower = info.toLowerCase();
    return passwordLower.includes(infoLower) || infoLower.includes(passwordLower);
  });
};