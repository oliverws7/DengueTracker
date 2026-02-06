import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket conectado:', this.socket.id);
      this.reconnectAttempts = 0;
      this.emitEvent('connect', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket desconectado:', reason);
      this.emitEvent('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erro de conexão WebSocket:', error);
      this.emitEvent('connect_error', { error });
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`Tentativa de reconexão ${attempt}/${this.maxReconnectAttempts}`);
      this.reconnectAttempts = attempt;
      this.emitEvent('reconnect_attempt', { attempt });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Falha na reconexão WebSocket');
      this.emitEvent('reconnect_failed');
    });

    // Eventos customizados do backend
    this.socket.on('notification:new', (notification) => {
      console.log('Nova notificação recebida:', notification);
      this.emitEvent('notification:new', notification);
    });

    this.socket.on('case:created', (data) => {
      console.log('Novo caso criado:', data);
      this.emitEvent('case:created', data);
    });

    this.socket.on('case:updated', (data) => {
      console.log('Caso atualizado:', data);
      this.emitEvent('case:updated', data);
    });

    this.socket.on('outbreak:alert', (alert) => {
      console.log('Alerta de surto:', alert);
      this.emitEvent('outbreak:alert', alert);
    });

    this.socket.on('stats:updated', (stats) => {
      console.log('Estatísticas atualizadas:', stats);
      this.emitEvent('stats:updated', stats);
    });
  }

  // Métodos para emitir eventos
  joinRoom(room) {
    if (this.socket?.connected) {
      this.socket.emit('room:join', room);
    }
  }

  leaveRoom(room) {
    if (this.socket?.connected) {
      this.socket.emit('room:leave', room);
    }
  }

  markNotificationRead(notificationId) {
    if (this.socket?.connected) {
      this.socket.emit('notification:read', notificationId);
    }
  }

  sendTypingIndicator(room, isTyping) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { room, isTyping });
    }
  }

  // Sistema de listeners
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emitEvent(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no listener do evento ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocketId() {
    return this.socket?.id;
  }
}

// Singleton
const webSocketService = new WebSocketService();
export default webSocketService;