import { useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';

export function useSocket() {
  const connected = useRef(false);

  useEffect(() => {
    if (!connected.current) {
      socket.connect();
      connected.current = true;
    }

    function handleConnect() {
      // On (re)connect, attempt to rejoin if we have a stored token
      const token = localStorage.getItem('just-one-token');
      if (token) {
        socket.emit('player:rejoin', { sessionToken: token });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && !socket.connected) {
        socket.connect();
      }
    }

    socket.on('connect', handleConnect);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off('connect', handleConnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Do NOT call socket.disconnect() — preserves connection across re-renders
      // and allows auto-reconnect after background/foreground transitions.
    };
  }, []);

  return socket;
}
