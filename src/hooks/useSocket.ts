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

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.disconnect();
      connected.current = false;
    };
  }, []);

  return socket;
}
