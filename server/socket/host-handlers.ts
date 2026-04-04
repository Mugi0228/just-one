import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events.js';
import { GAME_CONFIG } from '@shared/constants/game-config.js';
import {
  createSession,
  getSession,
  updateSession,
  addBot,
  removeBot,
  registerPlayerSocket,
  createSessionToken,
} from '../game/session-manager.js';
import { assignTeams } from '../game/team-assigner.js';
import {
  startRound,
  proceedToNextRound,
  initializeGameScores,
  pauseTimer,
  resumeTimer,
  revealResult,
  overrideResult,
  resetGameToLobby,
} from '../game/game-engine.js';
import { validatePlayerName } from '../utils/validation.js';
import { playerSessionMap } from './player-handlers.js';

type AppSocket = Socket<ClientEvents, ServerEvents>;
type AppServer = Server<ClientEvents, ServerEvents>;

/**
 * ソケットIDとルームコードのマッピング（ホスト用）。
 * handler.ts から共有するため export する。
 */
export const hostSessionMap = new Map<string, string>();

/**
 * ホスト系イベントハンドラーを登録する。
 */
export const registerHostHandlers = (
  io: AppServer,
  socket: AppSocket,
): void => {
  // ----------------------------------------------------------------
  // host:create-session
  // ----------------------------------------------------------------
  socket.on('host:create-session', ({ hostName, progressionMode, totalRounds }) => {
    const validation = validatePlayerName(hostName);
    if (!validation.valid) {
      socket.emit('error', {
        code: 'INVALID_NAME',
        message: validation.error ?? '無効な名前です',
      });
      return;
    }

    const clampedRounds = Math.min(20, Math.max(1, Math.floor(totalRounds ?? 7)));
    const session = createSession(socket.id, validation.sanitized, progressionMode, clampedRounds);
    const hostPlayer = session.players[0];

    hostSessionMap.set(socket.id, session.code);

    // ホストのソケット→プレイヤーマッピングも登録（ホストもプレイヤーとして機能する）
    playerSessionMap.set(socket.id, {
      sessionCode: session.code,
      playerId: hostPlayer.id,
    });

    // プレイヤーID → ソケットID のマッピングを登録（ホストのIDはnanoidのため）
    registerPlayerSocket(hostPlayer.id, socket.id);

    // ホストをルームに参加
    socket.join(session.code);

    // ルームトークン作成
    const sessionToken = createSessionToken(session.code, hostPlayer.id);

    // ホストにルーム作成完了を通知（playerId付き）
    socket.emit('session:created', {
      sessionCode: session.code,
      playerId: hostPlayer.id,
      sessionToken,
    });

    // ホストがプレイヤーリストに表示されるよう通知
    io.to(session.code).emit('session:player-joined', {
      player: hostPlayer,
      players: session.players,
    });
  });

  // ----------------------------------------------------------------
  // host:move-player
  // ----------------------------------------------------------------
  socket.on('host:move-player', ({ playerId, toTeamId }) => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    const session = getSession(sessionCode);
    if (!session || session.phase !== 'TEAM_ASSIGNMENT') {
      socket.emit('error', {
        code: 'INVALID_PHASE',
        message: 'チーム編成フェーズでのみメンバー移動できます',
      });
      return;
    }

    // プレイヤーの現在のチームを探す
    const fromTeam = session.teams.find((t) => t.memberIds.includes(playerId));
    if (!fromTeam) return;
    if (fromTeam.id === toTeamId) return; // 同じチーム内なら何もしない

    // 移動元チームが1人になる場合は拒否
    if (fromTeam.memberIds.length <= 1) {
      socket.emit('error', {
        code: 'TEAM_TOO_SMALL',
        message: 'チームには最低1人必要です',
      });
      return;
    }

    const updated = updateSession(sessionCode, (s) => ({
      ...s,
      teams: s.teams.map((t) => {
        if (t.id === fromTeam.id) {
          return { ...t, memberIds: t.memberIds.filter((id) => id !== playerId) };
        }
        if (t.id === toTeamId) {
          return { ...t, memberIds: [...t.memberIds, playerId] };
        }
        return t;
      }),
    }));

    if (updated) {
      io.to(sessionCode).emit('session:teams-assigned', { teams: updated.teams });
    }
  });

  // ----------------------------------------------------------------
  // host:add-bot
  // ----------------------------------------------------------------
  socket.on('host:add-bot', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    const session = getSession(sessionCode);
    if (!session || session.phase !== 'LOBBY') {
      socket.emit('error', {
        code: 'INVALID_PHASE',
        message: 'ロビーでのみボットを追加できます',
      });
      return;
    }

    if (session.players.filter((p) => p.isBot).length >= GAME_CONFIG.MAX_BOTS) {
      socket.emit('error', {
        code: 'MAX_BOTS',
        message: 'ボットの上限に達しています',
      });
      return;
    }

    const updated = addBot(sessionCode);
    if (!updated) return;

    const addedBot = updated.players[updated.players.length - 1];

    io.to(sessionCode).emit('session:player-joined', {
      player: addedBot,
      players: updated.players,
    });
  });

  // ----------------------------------------------------------------
  // host:remove-bot
  // ----------------------------------------------------------------
  socket.on('host:remove-bot', ({ botId }) => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    const session = getSession(sessionCode);
    if (!session || session.phase !== 'LOBBY') {
      socket.emit('error', {
        code: 'INVALID_PHASE',
        message: 'ロビーでのみボットを削除できます',
      });
      return;
    }

    const updated = removeBot(sessionCode, botId);
    if (!updated) return;

    io.to(sessionCode).emit('session:player-left', {
      playerId: botId,
      players: updated.players,
    });
  });

  // ----------------------------------------------------------------
  // host:start-team-shuffle
  // ----------------------------------------------------------------
  socket.on('host:start-team-shuffle', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    const session = getSession(sessionCode);
    if (!session) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    if (session.phase !== 'LOBBY') {
      socket.emit('error', {
        code: 'INVALID_PHASE',
        message: '現在のフェーズではチームシャッフルできません',
      });
      return;
    }

    if (session.players.length < GAME_CONFIG.MIN_PLAYERS) {
      socket.emit('error', {
        code: 'NOT_ENOUGH_PLAYERS',
        message: `最低${GAME_CONFIG.MIN_PLAYERS}人必要です（現在${session.players.length}人）`,
      });
      return;
    }

    // チーム数を人数に応じて動的に計算（1チーム最低3人）
    const playerIds = session.players.map((p) => p.id);
    const teamCount = Math.max(
      1,
      Math.min(
        GAME_CONFIG.MAX_TEAM_COUNT,
        Math.floor(playerIds.length / GAME_CONFIG.MIN_TEAM_SIZE),
      ),
    );
    const teams = assignTeams(playerIds, teamCount);

    const updated = updateSession(sessionCode, (s) => ({
      ...s,
      teams,
      phase: 'TEAM_ASSIGNMENT' as const,
    }));

    if (updated) {
      io.to(sessionCode).emit('session:teams-assigned', { teams });
      io.to(sessionCode).emit('game:phase-change', {
        phase: 'TEAM_ASSIGNMENT',
        timeRemaining: 0,
      });
    }
  });

  // ----------------------------------------------------------------
  // host:back-to-lobby
  // ----------------------------------------------------------------
  socket.on('host:back-to-lobby', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) return;

    const session = getSession(sessionCode);
    if (!session || session.phase !== 'TEAM_ASSIGNMENT') return;

    const updated = updateSession(sessionCode, (s) => ({
      ...s,
      phase: 'LOBBY' as const,
      teams: [],
    }));

    if (updated) {
      io.to(sessionCode).emit('game:phase-change', { phase: 'LOBBY', timeRemaining: 0 });
    }
  });

  // ----------------------------------------------------------------
  // host:confirm-teams
  // ----------------------------------------------------------------
  socket.on('host:confirm-teams', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    const session = getSession(sessionCode);
    if (!session || session.phase !== 'TEAM_ASSIGNMENT') {
      socket.emit('error', {
        code: 'INVALID_PHASE',
        message: 'チーム確定できるフェーズではありません',
      });
      return;
    }

    initializeGameScores(sessionCode);
    startRound(io, sessionCode);
  });

  // ----------------------------------------------------------------
  // host:start-game
  // ----------------------------------------------------------------
  socket.on('host:start-game', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    const session = getSession(sessionCode);
    if (!session || session.phase !== 'TEAM_ASSIGNMENT') {
      socket.emit('error', {
        code: 'INVALID_PHASE',
        message: 'ゲーム開始できるフェーズではありません',
      });
      return;
    }

    startRound(io, sessionCode);
  });

  // ----------------------------------------------------------------
  // host:next-round
  // ----------------------------------------------------------------
  socket.on('host:next-round', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    const session = getSession(sessionCode);
    if (!session || session.phase !== 'ROUND_RESULT') {
      socket.emit('error', {
        code: 'INVALID_PHASE',
        message: '次のラウンドへ進めるフェーズではありません',
      });
      return;
    }

    proceedToNextRound(io, sessionCode);
  });

  // ----------------------------------------------------------------
  // host:override-result
  // ----------------------------------------------------------------
  socket.on('host:override-result', ({ teamId, isCorrect }) => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    overrideResult(io, sessionCode, teamId, isCorrect);
  });

  // ----------------------------------------------------------------
  // host:play-again
  // ----------------------------------------------------------------
  socket.on('host:play-again', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    resetGameToLobby(io, sessionCode);
  });

  // ----------------------------------------------------------------
  // host:reveal-result
  // ----------------------------------------------------------------
  socket.on('host:reveal-result', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    revealResult(io, sessionCode);
  });

  // ----------------------------------------------------------------
  // host:pause
  // ----------------------------------------------------------------
  socket.on('host:pause', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    pauseTimer(sessionCode);
  });

  // ----------------------------------------------------------------
  // host:resume
  // ----------------------------------------------------------------
  socket.on('host:resume', () => {
    const sessionCode = hostSessionMap.get(socket.id);
    if (!sessionCode) {
      socket.emit('error', {
        code: 'NO_SESSION',
        message: 'ルームが見つかりません',
      });
      return;
    }

    resumeTimer(io, sessionCode);
  });
};
