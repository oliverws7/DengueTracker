import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('dengue-tracker-token');
    const userData = localStorage.getItem('dengue-tracker-user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Simulação de login
    if (email && password) {
      const userData = { 
        email, 
        name: 'Administrador',
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=159895&color=fff'
      };
      
      setUser(userData);
      localStorage.setItem('dengue-tracker-token', 'fake-jwt-token');
      localStorage.setItem('dengue-tracker-user', JSON.stringify(userData));
      navigate('/dashboard');
      return { success: true };
    } else {
      throw new Error('Por favor, preencha todos os campos');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dengue-tracker-token');
    localStorage.removeItem('dengue-tracker-user');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};