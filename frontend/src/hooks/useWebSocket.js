import { useEffect, useRef, useState } from 'react';
import webSocketService from '../services/websocket';

const useWebSocket = (event, callback, dependencies = []) => {
  const callbackRef = useRef(callback);
  const [isConnected, setIsConnected] = useState(webSocketService.isConnected());

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const cleanupConnect = webSocketService.on('connect', handleConnect);
    const cleanupDisconnect = webSocketService.on('disconnect', handleDisconnect);

    if (event) {
      const cleanupEvent = webSocketService.on(event, (data) => {
        callbackRef.current(data);
      });

      return () => {
        cleanupConnect();
        cleanupDisconnect();
        cleanupEvent();
      };
    }

    return () => {
      cleanupConnect();
      cleanupDisconnect();
    };
  }, [event, ...dependencies]);

  const emit = (eventName, data) => {
    if (webSocketService.isConnected()) {
      webSocketService.socket.emit(eventName, data);
    }
  };

  return {
    isConnected,
    emit,
    socketId: webSocketService.getSocketId(),
    joinRoom: webSocketService.joinRoom,
    leaveRoom: webSocketService.leaveRoom,
  };
};

export default useWebSocket;