import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const stats = [
    { title: 'Total de Casos', value: '1,247', color: '#FF6B6B', change: '+12%' },
    { title: 'Confirmados', value: '892', color: '#4ECDC4', change: '+8%' },
    { title: 'Suspeitos', value: '355', color: '#FFD166', change: '+15%' },
    { title: 'Taxa de Incidência', value: '45.2', color: '#06D6A0', change: '-3%' },
  ];

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/dashboard/casos', icon: '📋', label: 'Casos' },
    { path: '/dashboard/mapa', icon: '🗺️', label: 'Mapa' },
    { path: '/dashboard/relatorios', icon: '📈', label: 'Relatórios' },
    { path: '/dashboard/alertas', icon: '⚠️', label: 'Alertas' },
    { path: '/dashboard/equipe', icon: '👥', label: 'Equipe' },
  ];

  const recentCases = [
    { location: 'São Paulo', cases: 450 },
    { location: 'Rio de Janeiro', cases: 320 },
    { location: 'Brasília', cases: 180 },
    { location: 'Salvador', cases: 120 },
    { location: 'Fortaleza', cases: 95 },
  ];

  const quickActions = [
    { icon: '📊', label: 'Gerar Relatório' },
    { icon: '📍', label: 'Adicionar Foco' },
    { icon: '📱', label: 'Enviar Alerta' },
    { icon: '👥', label: 'Gerenciar Equipe' },
  ];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span>🦟</span>
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
              <p>Administrador</p>
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

        <button onClick={logout} className="logout-btn">
          <span className="nav-icon">🚪</span>
          {sidebarOpen && <span>Sair</span>}
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard de Monitoramento</h1>
          <div className="header-actions">
            <button 
              className="notification-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <button className="notification-btn">
              🔔
              <span className="notification-badge">3</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="stat-card"
              style={{ borderTopColor: stat.color }}
            >
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">{stat.value}</div>
              <div style={{ 
                color: stat.change.startsWith('+') ? '#06D6A0' : '#FF6B6B',
                fontSize: '14px',
                marginTop: '5px'
              }}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Map and Cases */}
        <div className="dashboard-grid">
          <div className="map-container">
            <h2 className="section-title">Mapa de Casos por Região</h2>
            <div className="map-placeholder">
              <div>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗺️</div>
                <p>Mapa interativo dos casos de dengue</p>
                <button style={{
                  marginTop: '15px',
                  padding: '10px 20px',
                  background: '#159895',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}>
                  Visualizar Mapa Completo
                </button>
              </div>
            </div>
          </div>

          <div className="cases-container">
            <h2 className="section-title">Casos Recentes</h2>
            <div className="cases-list">
              {recentCases.map((caseItem, index) => (
                <div key={index} className="case-item">
                  <div>
                    <div className="case-location">{caseItem.location}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Última atualização: há 2 dias
                    </div>
                  </div>
                  <div>
                    <div className="case-count">{caseItem.cases} casos</div>
                    <button className="view-btn">→</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2 className="section-title">Ações Rápidas</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <button key={index} className="action-btn">
                <span className="action-icon">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;