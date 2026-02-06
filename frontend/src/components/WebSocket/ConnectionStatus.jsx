import { useNotifications } from '../../contexts/NotificationContext';
import './ConnectionStatus.css';

const ConnectionStatus = () => {
  const { connectionStatus, isConnected } = useNotifications();

  const getStatusConfig = () => {
    switch(connectionStatus) {
      case 'connected':
        return {
          icon: '🟢',
          text: 'Conectado',
          color: '#06D6A0',
          tooltip: 'Conexão WebSocket ativa',
        };
      case 'connecting':
        return {
          icon: '🟡',
          text: 'Conectando...',
          color: '#FFD166',
          tooltip: 'Estabelecendo conexão',
        };
      case 'disconnected':
        return {
          icon: '🔴',
          text: 'Desconectado',
          color: '#FF6B6B',
          tooltip: 'Sem conexão em tempo real',
        };
      default:
        return {
          icon: '⚪',
          text: 'Desconhecido',
          color: '#999',
          tooltip: 'Status desconhecido',
        };
    }
  };

  const status = getStatusConfig();

  return (
    <div 
      className="connection-status"
      title={status.tooltip}
      style={{ '--status-color': status.color }}
    >
      <span className="status-icon">{status.icon}</span>
      <span className="status-text">{status.text}</span>
      <div className="status-pulse" />
    </div>
  );
};

export default ConnectionStatus;