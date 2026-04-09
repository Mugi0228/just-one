import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@shared/types/events';

export type TypedSocket = Socket<ServerEvents, ClientEvents>;

const URL =
  import.meta.env.MODE === 'production'
    ? window.location.origin
    : 'http://localhost:3001';

export const socket: TypedSocket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
});
