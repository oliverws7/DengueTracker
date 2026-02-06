import { useState, useEffect } from 'react';
import useWebSocket from '../../hooks/useWebSocket';
import './RealTimeAlert.css';

const RealTimeAlert = () => {
  const [alerts, setAlerts] = useState([]);
  const [visible, setVisible] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);

  const { isConnected } = useWebSocket('outbreak:alert', (alert) => {
    setAlerts(prev => [alert, ...prev.slice(0, 4)]);
    setCurrentAlert(alert);
    setVisible(true);
    
    // Auto-ocultar após 8 segundos
    setTimeout(() => {
      setVisible(false);
    }, 8000);
  });

  useEffect(() => {
    if (!visible && alerts.length > 0) {
      // Mostrar próximo alerta na fila
      const nextAlert = alerts[0];
      setCurrentAlert(nextAlert);
      setVisible(true);
      setAlerts(prev => prev.slice(1));
      
      setTimeout(() => {
        setVisible(false);
      }, 8000);
    }
  }, [visible, alerts]);

  const handleClose = () => {
    setVisible(false);
  };

  const handleViewDetails = () => {
    if (currentAlert?.caseId) {
      window.location.href = `/dashboard/casos/${currentAlert.caseId}`;
    }
  };

  const getAlertIcon = (severity) => {
    switch(severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🔔';
      case 'low': return 'ℹ️';
      default: return '📢';
    }
  };

  const getAlertClass = (severity) => {
    switch(severity) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'info';
    }
  };

  if (!currentAlert || !visible) return null;

  return (
    <div className={`real-time-alert ${getAlertClass(currentAlert.severity)} ${visible ? 'visible' : ''}`}>
      <div className="alert-header">
        <div className="alert-icon">
          {getAlertIcon(currentAlert.severity)}
        </div>
        <div className="alert-title">
          <strong>{currentAlert.title}</strong>
          <span className="alert-time">
            {new Date(currentAlert.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        <button className="alert-close" onClick={handleClose}>×</button>
      </div>
      
      <div className="alert-body">
        <p>{currentAlert.message}</p>
        
        {currentAlert.details && (
          <div className="alert-details">
            <small>{currentAlert.details}</small>
          </div>
        )}
      </div>
      
      <div className="alert-footer">
        <button className="alert-action-btn" onClick={handleViewDetails}>
          Ver detalhes
        </button>
        {isConnected && (
          <span className="connection-indicator" title="Conexão em tempo real ativa">
            🔄 Ao vivo
          </span>
        )}
      </div>
    </div>
  );
};

export default RealTimeAlert;