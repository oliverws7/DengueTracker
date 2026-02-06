import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('admin@denguetracker.com');
    setPassword('admin123');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">🦟</div>
          <h1>Dengue Tracker</h1>
          <p className="subtitle">Sistema de Monitoramento de Casos de Dengue</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          
          <div className="demo-section">
            <p>Use credenciais de demonstração:</p>
            <button 
              type="button" 
              className="demo-button"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              admin@denguetracker.com / admin123
            </button>
          </div>
        </form>
        
        <div className="login-footer">
          <p>© 2024 Dengue Tracker - Saúde Pública</p>
          <p className="version">Versão 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;