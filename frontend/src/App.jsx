import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/dashboard/Dashboard';
import Login from './pages/login/Login';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard/*"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;