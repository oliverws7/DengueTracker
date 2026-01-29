import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [backendStatus, setBackendStatus] = useState('Tentando conectar...');

  useEffect(() => {
  axios.get('http://localhost:5000/api/auth/health')
    .then(res => {
      setBackendStatus(`Conectado! Status: ${res.data.status}`);
    })
    .catch(err => {
      setBackendStatus('Erro ao conectar com o backend');
      console.error(err);
    });
}, []);


  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🦟 DengueTracker Frontend</h1>
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        border: '2px solid',
        borderColor: backendStatus.includes('Conectado') ? 'green' : 'red' 
      }}>
        {backendStatus}
      </div>
      <p>Se você vê esta mensagem, seu React está funcionando.</p>
    </div>
  );
}

export default App;