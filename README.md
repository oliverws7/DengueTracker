
---

# 🦟 DengueTracker

> **Sistema Inteligente de Monitoramento e Combate à Dengue**

O **DengueTracker** é uma plataforma full-stack de monitoramento inteligente que utiliza **gamificação** e **dados em tempo real** para engajar a população e otimizar ações de saúde pública. O sistema integra geolocalização, análise preditiva e relatórios automáticos para uma gestão eficiente de focos do *Aedes aegypti*.

---

## 🏗️ Arquitetura do Sistema

O projeto segue uma estrutura modular para facilitar a escalabilidade e manutenção:

```bash
DENGUE-TRACKER/
├── 🌐 backend/          # API REST (Node.js + Express + MongoDB)
│   ├── src/             # Core da aplicação
│   ├── migrations/      # Versionamento de dados
│   └── tests/           # Testes automatizados (Jest)
├── 💻 frontend/         # Interface SPA (React 19 + Vite)
│   ├── src/             # Componentes, Contextos e Hooks
│   └── public/          # Assets estáticos
└── 📄 README.md         # Documentação central

```

---

## 🚀 Funcionalidades Principais

### 📊 Dashboard Inteligente

* **Estatísticas em Tempo Real**: Monitoramento de casos confirmados e suspeitos.
* **Mapas Interativos**: Visualização georreferenciada com *heatmaps* via Leaflet.
* **Gráficos Dinâmicos**: Evolução temporal e distribuição regional com Recharts.

### 🎮 Gamificação (Engajamento)

* **Rewards**: Ganho de pontos e badges ao reportar focos verificados.
* **Social**: Rankings comunitários e missões diárias de prevenção.

### 🔔 Comunicação em Tempo Real

* **WebSockets**: Atualizações instantâneas de surtos locais via Socket.io.
* **Alertas Push**: Notificações críticas diretamente no navegador.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| --- | --- |
| **Frontend** | React 19, Vite, React Router 7, Recharts, Leaflet, CSS Modules |
| **Backend** | Node.js, Express, Mongoose, Socket.io, JWT |
| **Banco de Dados** | MongoDB (NoSQL) |
| **DevOps/Testes** | Docker, Jest, Supertest, Vite |

---

## 🚦 Começando

### **Pré-requisitos**

* Node.js 18+ / MongoDB 6.0+ / NPM ou Yarn

### **Instalação Rápida**

1. **Clone o projeto:**
```bash
git clone https://github.com/oliverws7/DengueTracker.git
cd DengueTracker

```


2. **Configuração do Backend:**
```bash
cd backend
npm install
cp .env.example .env  # Configure suas chaves
npm run dev

```


3. **Configuração do Frontend:**
```bash
cd ../frontend
npm install
npm run dev

```



---

## 📡 API Reference (v3.0)

### Endpoints Principais

* `POST /api/auth/login` - Autenticação de usuários.
* `GET /api/cases/stats` - Retorna dados consolidados para o dashboard.
* `POST /api/cases/report` - Registra um novo foco de dengue.
* `GET /api/gamification/leaderboard` - Ranking de usuários.

> [!TIP]
> A documentação completa da API está disponível via **Swagger** em `http://localhost:5000/api-docs` quando o servidor está rodando.

---

## 🎨 Sistema de Temas

O sistema conta com suporte nativo a **Light e Dark Mode** através da Context API, respeitando a preferência do sistema do usuário ou seleção manual.

---

## 📈 Roadmap de Evolução

* [x] Dashboard básico e Mapas.
* [x] Sistema de autenticação e permissões.
* [ ] **v2.0**: Aplicativo Mobile com React Native.
* [ ] **v2.1**: Machine Learning para predição de surtos.
* [ ] **v3.0**: Integração com dispositivos IoT para armadilhas inteligentes.

---

## 🤝 Contribuição

Contribuições são o que fazem a comunidade open source um lugar incrível para aprender e criar!

1. Faça um **Fork** do projeto.
2. Crie uma **Branch** para sua feature (`git checkout -b feature/IncrivelFeature`).
3. Faça o **Commit** de suas alterações (`git commit -m 'Add: Minha nova feature'`).
4. Execute o **Push** para a Branch (`git push origin feature/IncrivelFeature`).
5. Abra um **Pull Request**.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja `LICENSE` para mais informações.

---

**Desenvolvido por [Mateus Nunes **](https://github.com/oliverws7/DengueTracker) 🚀

---

