const missoesConfig = {
  diarias: [
    {
      id: "login-diario",
      nome: "Check-in Diário",
      descricao: "Faça login no app hoje",
      icone: "📱",
      pontos: 10,
      tipo: "automatica",
      categoria: "engagement"
    },
    {
      id: "reporte-3-focos",
      nome: "Caçador de Focos",
      descricao: "Reporte 3 focos de dengue hoje",
      icone: "🎯",
      pontos: 30,
      tipo: "progresso",
      meta: 3,
      categoria: "acao"
    },
    {
      id: "verificar-ranking",
      nome: "Competitivo",
      descricao: "Verifique o ranking hoje",
      icone: "🏆",
      pontos: 5,
      tipo: "automatica",
      categoria: "engagement"
    }
  ],
  semanais: [
    {
      id: "especialista-semana",
      nome: "Especialista da Semana",
      descricao: "Alcance 100 pontos esta semana",
      icone: "⭐",
      pontos: 100,
      tipo: "progresso",
      meta: 100,
      categoria: "progresso"
    },
    {
      id: "comunidade-ativa",
      nome: "Herói da Comunidade",
      descricao: "Reporte 10 focos esta semana",
      icone: "👥",
      pontos: 150,
      tipo: "progresso",
      meta: 10,
      categoria: "acao"
    },
    {
      id: "conquistas-semana",
      nome: "Colecionador",
      descricao: "Desbloqueie 3 conquistas esta semana",
      icone: "🎖️",
      pontos: 120,
      tipo: "progresso", 
      meta: 3,
      categoria: "conquistas"
    }
  ]
};

module.exports = missoesConfig;
