import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a5f7a 0%, #159895 100%)',
        color: 'white'
      }}>
        <div>Carregando...</div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;