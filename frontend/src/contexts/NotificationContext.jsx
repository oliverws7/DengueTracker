import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import webSocketService from '../services/websocket';

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const { user, token } = useAuth();

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.getAll();
      const sortedNotifications = response.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setNotifications(sortedNotifications);
      setUnreadCount(sortedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Configurar WebSocket
  useEffect(() => {
    if (user && token) {
      webSocketService.connect(token);

      const handleConnect = () => setConnectionStatus('connected');
      const handleDisconnect = () => setConnectionStatus('disconnected');
      const handleNewNotification = (notification) => {
        setNotifications(prev => {
          const updated = [notification, ...prev];
          return updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });
        
        if (!notification.read) {
          setUnreadCount(prev => prev + 1);
        }

        // Mostrar notificação no sistema do navegador
        if (Notification.permission === 'granted') {
          new Notification('Dengue Tracker - Nova Notificação', {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id,
          });
        }
      };

      // Registrar listeners
      const cleanupConnect = webSocketService.on('connect', handleConnect);
      const cleanupDisconnect = webSocketService.on('disconnect', handleDisconnect);
      const cleanupNewNotification = webSocketService.on('notification:new', handleNewNotification);

      // Entrar na sala do usuário
      webSocketService.joinRoom(`user:${user.id}`);

      return () => {
        cleanupConnect();
        cleanupDisconnect();
        cleanupNewNotification();
        webSocketService.leaveRoom(`user:${user.id}`);
      };
    }

    return () => {
      if (!user) {
        webSocketService.disconnect();
      }
    };
  }, [user, token]);

  // Solicitar permissão para notificações do navegador
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => prev - 1);
      
      // Notificar via WebSocket
      webSocketService.markNotificationRead(id);
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.read).map(n => notificationsAPI.markAsRead(n.id))
      );
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const sendNotification = async (notificationData) => {
    try {
      const response = await notificationsAPI.create(notificationData);
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      throw error;
    }
  };

  const subscribeToRoom = (room) => {
    webSocketService.joinRoom(room);
    return () => webSocketService.leaveRoom(room);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      connectionStatus,
      markAsRead,
      markAllAsRead,
      addNotification,
      sendNotification,
      refresh: fetchNotifications,
      subscribeToRoom,
      isConnected: webSocketService.isConnected,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};