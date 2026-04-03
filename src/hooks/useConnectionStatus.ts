import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(
    socket.connected ? 'connected' : 'disconnected',
  );

  useEffect(() => {
    function onConnect() {
      setStatus('connected');
    }

    function onDisconnect() {
      setStatus('disconnected');
    }

    function onReconnectAttempt() {
      setStatus('reconnecting');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
    };
  }, []);

  return status;
}
