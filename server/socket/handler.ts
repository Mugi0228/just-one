import type { Server } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events.js';
import { registerHostHandlers, hostSessionMap } from './host-handlers.js';
import { registerPlayerHandlers, playerSessionMap } from './player-handlers.js';
import {
  getSession,
  removePlayer,
  deleteSession,
  updatePlayerConnection,
} from '../game/session-manager.js';
import { hostDisconnectTimers, HOST_DISCONNECT_TIMEOUT_MS } from './disconnect-timers.js';

type AppServer = Server<ClientEvents, ServerEvents>;

/**
 * Socket.io の接続・切断ハンドラーを登録する。
 */
export const registerSocketHandlers = (io: AppServer): void => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ホスト系ハンドラー登録
    registerHostHandlers(io, socket);

    // プレイヤー系ハンドラー登録
    registerPlayerHandlers(io, socket);

    // 切断時の処理
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // ホストの切断処理
      const hostSession = hostSessionMap.get(socket.id);
      if (hostSession) {
        const session = getSession(hostSession);
        if (session) {
          const hostPlayer = session.players[0];
          if (hostPlayer) {
            updatePlayerConnection(hostSession, hostPlayer.id, false);
          }

          // 再接続猶予タイマーを開始（60秒後にルーム削除）
          const timer = setTimeout(() => {
            const currentSession = getSession(hostSession);
            if (currentSession) {
              const host = currentSession.players[0];
              if (host && !host.isConnected) {
                io.to(hostSession).emit('error', {
                  code: 'HOST_DISCONNECTED',
                  message: 'ホストが切断しました。ルームは終了します。',
                });
                deleteSession(hostSession);
              }
            }
            hostDisconnectTimers.delete(hostSession);
          }, HOST_DISCONNECT_TIMEOUT_MS);

          hostDisconnectTimers.set(hostSession, timer);
        }
        hostSessionMap.delete(socket.id);
        playerSessionMap.delete(socket.id);
        return;
      }

      // プレイヤーの切断処理
      const playerMapping = playerSessionMap.get(socket.id);
      if (playerMapping) {
        const { sessionCode, playerId } = playerMapping;
        const session = getSession(sessionCode);

        if (session) {
          if (session.phase === 'LOBBY') {
            // ロビーでは完全に削除
            const updated = removePlayer(sessionCode, playerId);
            if (updated) {
              io.to(sessionCode).emit('session:player-left', {
                playerId,
                players: updated.players,
              });
            }
          } else {
            // ゲーム中は切断状態をマーク（再接続可能）
            updatePlayerConnection(sessionCode, playerId, false);
          }
        }

        playerSessionMap.delete(socket.id);
      }
    });
  });
};

