const conquistasConfig = {
  "primeiro-passo": {
    nome: "Primeiro Passo",
    descricao: "Faça seu primeiro reporte",
    icone: "🎯",
    pontos: 10,
    condicao: (user) => user.reportesRealizados >= 1
  },
  "reporter-ativo": {
    nome: "Reporter Ativo", 
    descricao: "Realize 5 reportes",
    icone: "📝",
    pontos: 25,
    condicao: (user) => user.reportesRealizados >= 5
  },
  "cacador-focos": {
    nome: "Caçador de Focos",
    descricao: "Realize 10 reportes",
    icone: "🔍",
    pontos: 50,
    condicao: (user) => user.reportesRealizados >= 10
  },
  "especialista-dengue": {
    nome: "Especialista em Dengue",
    descricao: "Alcance 500 pontos",
    icone: "🎓",
    pontos: 100,
    condicao: (user) => user.pontos >= 500
  },
  "lenda-comunidade": {
    nome: "Lenda da Comunidade",
    descricao: "Alcance 1000 pontos",
    icone: "🏆",
    pontos: 200,
    condicao: (user) => user.pontos >= 1000
  },
  "streak-7dias": {
    nome: "Dedicado",
    descricao: "Login por 7 dias consecutivos",
    icone: "🔥",
    pontos: 30,
    condicao: (user) => user.streakDias >= 7
  },
  "eliminador-focos": {
    nome: "Eliminador de Focos",
    descricao: "Ajude a eliminar 5 focos",
    icone: "✅",
    pontos: 40,
    condicao: (user) => user.focosEliminados >= 5
  }
};

module.exports = conquistasConfig;
