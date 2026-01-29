import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [backendStatus, setBackendStatus] = useState('Tentando conectar...');

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/auth/health')
      .then(res => {
        setBackendStatus(`Conectado! Status: ${res.data.status}`);
      })
      .catch(err => {
        setBackendStatus('Erro ao conectar com o backend');
        console.error(err);
      });
  }, []);

  return (
    <BrowserRouter>
      <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1>🦟 DengueTracker Frontend</h1>

        <div
          style={{
            margin: '20px auto',
            padding: '20px',
            border: '2px solid',
            width: '320px',
            borderColor: backendStatus.includes('Conectado') ? 'green' : 'red',
          }}
        >
          {backendStatus}
        </div>

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
