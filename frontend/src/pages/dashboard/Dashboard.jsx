import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import useWebSocket from '../../hooks/useWebSocket';
import ConnectionStatus from '../../components/WebSocket/ConnectionStatus';
import RealTimeAlert from '../../components/Notifications/RealTimeAlert';
import NotificationBell from '../../components/Notifications/NotificationBell';
import DengueLineChart from '../../components/Charts/LineChart';
import DengueBarChart from '../../components/Charts/BarChart';
import InteractiveDengueMap from '../../components/Map/InteractiveMap';
import StatsCard from '../../components/StatsCard/StatsCard';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const location = useLocation();

  // Dados de exemplo para gráficos
  const [chartData, setChartData] = useState([
    { date: '2024-01-01', confirmed: 120, suspected: 45 },
    { date: '2024-01-08', confirmed: 180, suspected: 60 },
    { date: '2024-01-15', confirmed: 250, suspected: 85 },
    { date: '2024-01-22', confirmed: 320, suspected: 110 },
    { date: '2024-01-29', confirmed: 450, suspected: 140 },
    { date: '2024-02-05', confirmed: 620, suspected: 180 },
  ]);

  const [barChartData, setBarChartData] = useState([
    { city: 'São Paulo', cases: 450 },
    { city: 'Rio de Janeiro', cases: 320 },
    { city: 'Brasília', cases: 180 },
    { city: 'Salvador', cases: 120 },
    { city: 'Fortaleza', cases: 95 },
  ]);

  // Dados para o mapa interativo
  const [outbreaks, setOutbreaks] = useState([
    { city: 'São Paulo', cases: 450, coordinates: [-23.5505, -46.6333], lastUpdate: '2024-02-05' },
    { city: 'Rio de Janeiro', cases: 320, coordinates: [-22.9068, -43.1729], lastUpdate: '2024-02-05' },
    { city: 'Brasília', cases: 180, coordinates: [-15.7939, -47.8828], lastUpdate: '2024-02-05' },
    { city: 'Salvador', cases: 120, coordinates: [-12.9711, -38.5108], lastUpdate: '2024-02-04' },
    { city: 'Fortaleza', cases: 95, coordinates: [-3.7172, -38.5434], lastUpdate: '2024-02-04' },
    { city: 'Belo Horizonte', cases: 85, coordinates: [-19.9167, -43.9345], lastUpdate: '2024-02-03' },
  ]);

  const stats = [
    { 
      title: 'Total de Casos', 
      value: '1,247', 
      color: '#FF6B6B', 
      change: '+12%',
      icon: '📊',
      type: 'total'
    },
    { 
      title: 'Confirmados', 
      value: '892', 
      color: '#4ECDC4', 
      change: '+8%',
      icon: '✅',
      type: 'confirmed'
    },
    { 
      title: 'Suspeitos', 
      value: '355', 
      color: '#FFD166', 
      change: '+15%',
      icon: '⚠️',
      type: 'suspected'
    },
    { 
      title: 'Taxa de Incidência', 
      value: '45.2', 
      color: '#06D6A0', 
      change: '-3%',
      icon: '📈',
      type: 'incidence'
    },
  ];

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/dashboard/casos', icon: '📋', label: 'Casos' },
    { path: '/dashboard/mapa', icon: '🗺️', label: 'Mapa' },
    { path: '/dashboard/relatorios', icon: '📈', label: 'Relatórios' },
    { path: '/dashboard/alertas', icon: '⚠️', label: 'Alertas' },
    { path: '/dashboard/equipe', icon: '👥', label: 'Equipe' },
    { path: '/dashboard/configuracoes', icon: '⚙️', label: 'Configurações' },
  ];

  const recentCases = [
    { location: 'São Paulo', cases: 450, status: 'Alto', lastUpdate: 'há 2 dias' },
    { location: 'Rio de Janeiro', cases: 320, status: 'Médio', lastUpdate: 'há 1 dia' },
    { location: 'Brasília', cases: 180, status: 'Médio', lastUpdate: 'há 2 dias' },
    { location: 'Salvador', cases: 120, status: 'Baixo', lastUpdate: 'há 3 dias' },
    { location: 'Fortaleza', cases: 95, status: 'Baixo', lastUpdate: 'há 4 dias' },
  ];

  const quickActions = [
    { 
      icon: '📊', 
      label: 'Gerar Relatório',
      action: () => handleGenerateReport()
    },
    { 
      icon: '📍', 
      label: 'Adicionar Foco',
      action: () => handleAddOutbreak()
    },
    { 
      icon: '📱', 
      label: 'Enviar Alerta',
      action: () => handleSendAlert()
    },
    { 
      icon: '📤', 
      label: 'Exportar Dados',
      action: () => handleExportData()
    },
    { 
      icon: '👥', 
      label: 'Gerenciar Equipe',
      action: () => handleManageTeam()
    },
    { 
      icon: theme === 'light' ? '🌙' : '☀️', 
      label: theme === 'light' ? 'Modo Escuro' : 'Modo Claro',
      action: () => toggleTheme()
    },
  ];

  // WebSocket para atualizações em tempo real
  useWebSocket('stats:updated', (newStats) => {
    console.log('Estatísticas atualizadas via WebSocket:', newStats);
    // Aqui você pode atualizar o estado das estatísticas
  });

  useWebSocket('case:created', (newCase) => {
    console.log('Novo caso via WebSocket:', newCase);
    // Atualizar lista de casos
  });

  useWebSocket('outbreak:alert', (alert) => {
    console.log('Alerta de surto via WebSocket:', alert);
    // O RealTimeAlert já lida com isso automaticamente
  });

  useEffect(() => {
    // Simular carregamento de dados
    const timer = setTimeout(() => {
      setDataLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Handlers para ações
  const handleGenerateReport = async () => {
    try {
      await exportToPDF('dashboard-content', 'relatorio-dengue.pdf');
      console.log('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    }
  };

  const handleExportData = () => {
    try {
      exportToExcel(recentCases, 'dados-dengue.xlsx');
      console.log('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  };

  const handleAddOutbreak = () => {
    console.log('Adicionar novo foco');
    // Navegar para página de adicionar foco
  };

  const handleSendAlert = () => {
    console.log('Enviar alerta');
    // Abrir modal de envio de alerta
  };

  const handleManageTeam = () => {
    console.log('Gerenciar equipe');
    // Navegar para página de gerenciamento de equipe
  };

  const handleRefreshData = () => {
    setDataLoaded(false);
    setTimeout(() => {
      setDataLoaded(true);
      console.log('Dados atualizados!');
    }, 1000);
  };

  const handleViewCaseDetails = (location) => {
    console.log(`Ver detalhes de ${location}`);
    // Navegar para detalhes do caso
  };

  return (
    <div className="dashboard" id="dashboard-content">
      {/* Alertas em tempo real */}
      <RealTimeAlert />
      
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🦟</span>
            {sidebarOpen && <span>Dengue Tracker</span>}
          </div>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          {sidebarOpen && (
            <div className="user-details">
              <h4>{user?.name || 'Usuário'}</h4>
              <p>{user?.role || 'Administrador'}</p>
              <ConnectionStatus />
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="system-info">
              <div className="info-item">
                <span className="info-label">Usuários online:</span>
                <span className="info-value">24</span>
              </div>
              <div className="info-item">
                <span className="info-label">Atualizado:</span>
                <span className="info-value">agora</span>
              </div>
            </div>
          )}
          <button onClick={logout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="dashboard-header">
          <div className="header-left">
            <button 
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <h1 className="dashboard-title">Dashboard de Monitoramento</h1>
            <div className="last-update">
              <span className="update-indicator"></span>
              <span>Última atualização: agora</span>
            </div>
          </div>
          
          <div className="header-right">
            <div className="header-actions">
              <button 
                className="header-btn refresh-btn"
                onClick={handleRefreshData}
                title="Atualizar dados"
              >
                🔄
              </button>
              
              <NotificationBell />
              
              <div className="user-menu">
                <div className="user-greeting">
                  <span>Olá, <strong>{user?.name?.split(' ')[0] || 'Usuário'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              color={stat.color}
              change={stat.change}
              icon={stat.icon}
              type={stat.type}
            />
          ))}
        </div>

        {/* Gráficos e Mapa */}
        <div className="dashboard-grid">
          <div className="chart-section">
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="section-title">Evolução de Casos (Últimas 6 semanas)</h2>
                <div className="chart-actions">
                  <button className="chart-action-btn">📊 Ver detalhes</button>
                </div>
              </div>
              {dataLoaded ? (
                <DengueLineChart data={chartData} />
              ) : (
                <div className="chart-loading">Carregando gráfico...</div>
              )}
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h2 className="section-title">Distribuição por Cidade</h2>
                <div className="chart-actions">
                  <button className="chart-action-btn">📍 Filtrar por região</button>
                </div>
              </div>
              {dataLoaded ? (
                <DengueBarChart data={barChartData} />
              ) : (
                <div className="chart-loading">Carregando gráfico...</div>
              )}
            </div>
          </div>

          <div className="map-section">
            <div className="map-card">
              <div className="map-header">
                <h2 className="section-title">Mapa Interativo de Focos</h2>
                <div className="map-actions">
                  <button 
                    className="map-action-btn"
                    onClick={() => window.location.href = '/dashboard/mapa'}
                  >
                    🗺️ Mapa completo
                  </button>
                </div>
              </div>
              {dataLoaded ? (
                <InteractiveDengueMap outbreaks={outbreaks} />
              ) : (
                <div className="map-loading">Carregando mapa...</div>
              )}
            </div>
          </div>
        </div>

        {/* Casos Recentes e Ações Rápidas */}
        <div className="bottom-grid">
          <div className="cases-section">
            <div className="cases-card">
              <div className="cases-header">
                <h2 className="section-title">Casos Recentes por Cidade</h2>
                <button 
                  className="export-btn"
                  onClick={handleExportData}
                >
                  📤 Exportar
                </button>
              </div>
              <div className="cases-table">
                <table>
                  <thead>
                    <tr>
                      <th>Cidade</th>
                      <th>Casos</th>
                      <th>Status</th>
                      <th>Última atualização</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCases.map((caseItem, index) => (
                      <tr key={index}>
                        <td className="city-cell">
                          <div className="city-info">
                            <span className="city-name">{caseItem.location}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`case-count ${caseItem.cases > 300 ? 'high' : caseItem.cases > 150 ? 'medium' : 'low'}`}>
                            {caseItem.cases}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${caseItem.status.toLowerCase()}`}>
                            {caseItem.status}
                          </span>
                        </td>
                        <td>{caseItem.lastUpdate}</td>
                        <td>
                          <button 
                            className="action-btn small"
                            onClick={() => handleViewCaseDetails(caseItem.location)}
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="actions-section">
            <div className="actions-card">
              <h2 className="section-title">Ações Rápidas</h2>
              <div className="actions-grid">
                {quickActions.map((action, index) => (
                  <button 
                    key={index} 
                    className="action-btn"
                    onClick={action.action}
                    title={action.label}
                  >
                    <span className="action-icon">{action.icon}</span>
                    <span className="action-label">{action.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="system-stats">
                <h3>Status do Sistema</h3>
                <div className="stats-list">
                  <div className="stat-item">
                    <span className="stat-label">Conexão WebSocket:</span>
                    <span className="stat-value connected">● Ativa</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Notificações:</span>
                    <span className="stat-value">{unreadCount} não lidas</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Tema:</span>
                    <span className="stat-value">{theme === 'light' ? 'Claro' : 'Escuro'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Dados:</span>
                    <span className="stat-value">{dataLoaded ? 'Atualizados' : 'Carregando...'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;