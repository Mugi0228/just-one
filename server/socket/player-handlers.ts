import type { Server, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events.js';
import {
  getSession,
  addPlayer,
  registerPlayerSocket,
  lookupToken,
  createSessionToken,
  updatePlayerConnection,
  updateSession,
} from '../game/session-manager.js';
import { submitHint, submitAnswer, getTimerRemaining, buildFinalResults } from '../game/game-engine.js';
import { validatePlayerName, validateHint, validateAnswer } from '../utils/validation.js';
import { nanoid } from 'nanoid';
import { hostSessionMap } from './host-handlers.js';
import { cancelHostDisconnectTimer } from './disconnect-timers.js';

type AppSocket = Socket<ClientEvents, ServerEvents>;
type AppServer = Server<ClientEvents, ServerEvents>;

/**
 * ソケットIDとルーム情報のマッピング（プレイヤー用）。
 * handler.ts から共有するため export する。
 */
export const playerSessionMap = new Map<
  string,
  { sessionCode: string; playerId: string }
>();

/**
 * プレイヤー系イベントハンドラーを登録する。
 */
export const registerPlayerHandlers = (
  io: AppServer,
  socket: AppSocket,
): void => {
  // ----------------------------------------------------------------
  // player:join
  // ----------------------------------------------------------------
  socket.on('player:join', ({ playerName, sessionCode }) => {
    // ホストが既にプレイヤーとして登録済みの場合はスキップ
    const existingMapping = playerSessionMap.get(socket.id);
    if (existingMapping) {
      socket.emit('error', {
        code: 'ALREADY_JOINED',
        message: 'すでにルームに参加しています',
      });
      return;
    }

    const nameValidation = validatePlayerName(playerName);
    if (!nameValidation.valid) {
      socket.emit('error', {
        code: 'INVALID_NAME',
        message: nameValidation.error ?? '無効な名前です',
      });
      return;
    }

    const session = getSession(sessionCode.toUpperCase());
    if (!session) {
      socket.emit('error', {
        code: 'SESSION_NOT_FOUND',
        message: 'ルームが見つかりません',
      });
      return;
    }

    if (session.phase !== 'LOBBY') {
      socket.emit('error', {
        code: 'GAME_IN_PROGRESS',
        message: 'ゲームは既に開始されています',
      });
      return;
    }

    // 同名チェック
    const sanitizedName = nameValidation.sanitized;
    if (session.players.some((p) => p.name === sanitizedName)) {
      socket.emit('error', {
        code: 'DUPLICATE_NAME',
        message: 'その名前は既に使われています',
      });
      return;
    }

    const playerId = nanoid();
    const newPlayer = {
      id: playerId,
      name: sanitizedName,
      joinedAt: Date.now(),
      isConnected: true,
      isBot: false,
    };

    const updated = addPlayer(session.code, newPlayer);
    if (!updated) {
      socket.emit('error', {
        code: 'JOIN_FAILED',
        message: '参加に失敗しました',
      });
      return;
    }

    // マッピング登録
    registerPlayerSocket(playerId, socket.id);
    playerSessionMap.set(socket.id, {
      sessionCode: session.code,
      playerId,
    });

    // ルームトークン作成
    const sessionToken = createSessionToken(session.code, playerId);

    // ソケットルームに参加
    socket.join(session.code);

    // 参加者本人に確認を送信
    socket.emit('session:joined', {
      player: newPlayer,
      players: updated.players,
      phase: updated.phase,
      sessionToken,
    });

    // 他のメンバーに通知
    socket.to(session.code).emit('session:player-joined', {
      player: newPlayer,
      players: updated.players,
    });
  });

  // ----------------------------------------------------------------
  // player:rejoin
  // ----------------------------------------------------------------
  socket.on('player:rejoin', ({ sessionToken }) => {
    const tokenData = lookupToken(sessionToken);
    if (!tokenData) {
      socket.emit('error', {
        code: 'INVALID_TOKEN',
        message: 'ルームトークンが無効です',
      });
      return;
    }

    const { sessionCode, playerId } = tokenData;
    const session = getSession(sessionCode);
    if (!session) {
      socket.emit('error', {
        code: 'SESSION_NOT_FOUND',
        message: 'ルームが見つかりません',
      });
      return;
    }

    const player = session.players.find((p) => p.id === playerId);
    if (!player) {
      socket.emit('error', {
        code: 'PLAYER_NOT_FOUND',
        message: 'プレイヤーが見つかりません',
      });
      return;
    }

    // Re-register socket mapping
    registerPlayerSocket(playerId, socket.id);
    playerSessionMap.set(socket.id, { sessionCode, playerId });
    socket.join(sessionCode);

    // Check if this is the host reconnecting
    const isHost = session.players[0]?.id === playerId;
    if (isHost) {
      hostSessionMap.set(socket.id, sessionCode);
      updateSession(sessionCode, (s) => ({ ...s, hostSocketId: socket.id }));
      cancelHostDisconnectTimer(sessionCode);
    }

    // Mark player as connected
    updatePlayerConnection(sessionCode, playerId, true);

    // Build state sync payload
    const updatedSession = getSession(sessionCode);
    if (!updatedSession) return;

    const myTeam = updatedSession.teams.find((t) => t.memberIds.includes(playerId));
    const teamRoundInfos = updatedSession.teamRoundStates.map((trs) => {
      const p = updatedSession.players.find((pl) => pl.id === trs.guesserId);
      return {
        teamId: trs.teamId,
        guesserId: trs.guesserId,
        guesserName: p?.name ?? 'Unknown',
      };
    });

    // Get hints visible to this player
    const isGuesser = updatedSession.teamRoundStates.some(
      (trs) => trs.guesserId === playerId,
    );
    let hints: { playerId: string; playerName: string; text: string; isDuplicate: boolean }[] = [];

    if (myTeam) {
      const trs = updatedSession.teamRoundStates.find((t) => t.teamId === myTeam.id);
      if (trs && trs.checkedHints.length > 0) {
        if (isGuesser) {
          // Guesser sees only unique hints
          hints = trs.checkedHints
            .filter((h) => !h.isDuplicate)
            .map((h) => {
              const p = updatedSession.players.find((pl) => pl.id === h.playerId);
              return {
                playerId: h.playerId,
                playerName: p?.name ?? 'Unknown',
                text: h.text,
                isDuplicate: false,
              };
            });
        } else {
          // Hint giver sees all hints with duplicate info
          hints = trs.checkedHints.map((h) => {
            const p = updatedSession.players.find((pl) => pl.id === h.playerId);
            return {
              playerId: h.playerId,
              playerName: p?.name ?? 'Unknown',
              text: h.text,
              isDuplicate: h.isDuplicate,
            };
          });
        }
      }
    }

    // Get current topic (hide from guessers)
    const topic = isGuesser ? '' : (updatedSession.teamRoundStates[0]?.topic ?? '');

    // Round results
    const roundResults = updatedSession.phase === 'ROUND_RESULT'
      ? updatedSession.teamRoundStates.map((trs) => {
          const team = updatedSession.teams.find((t) => t.id === trs.teamId);
          const guesser = updatedSession.players.find((p) => p.id === trs.guesserId);
          return {
            teamId: trs.teamId,
            teamName: team?.name ?? 'Unknown',
            topic: trs.topic,
            guesserName: guesser?.name ?? 'Unknown',
            answer: trs.answer,
            isCorrect: trs.score > 0,
            allHintsUnique: trs.checkedHints.every((h) => !h.isDuplicate),
            score: trs.score,
            totalScore: updatedSession.totalScores.get(trs.teamId) ?? 0,
            hints: trs.checkedHints.map((h) => {
              const p = updatedSession.players.find((pl) => pl.id === h.playerId);
              return {
                playerId: h.playerId,
                playerName: p?.name ?? 'Unknown',
                text: h.text,
                isDuplicate: h.isDuplicate,
              };
            }),
          };
        })
      : [];

    socket.emit('session:state-sync', {
      sessionCode,
      playerId,
      isHost,
      players: updatedSession.players,
      teams: updatedSession.teams,
      phase: updatedSession.phase,
      progressionMode: updatedSession.progressionMode,
      currentRound: updatedSession.currentRound,
      totalRounds: updatedSession.totalRounds,
      topic,
      timeRemaining: getTimerRemaining(sessionCode),
      roundResults,
      finalResults: updatedSession.phase === 'FINAL_RESULT' ? buildFinalResults(updatedSession) : [],
      teamRoundInfos,
      hints,
    });
  });

  // ----------------------------------------------------------------
  // player:submit-hint
  // ----------------------------------------------------------------
  socket.on('player:submit-hint', ({ hint }) => {
    const mapping = playerSessionMap.get(socket.id);
    if (!mapping) {
      socket.emit('error', {
        code: 'NOT_IN_SESSION',
        message: 'ルームに参加していません',
      });
      return;
    }

    const hintValidation = validateHint(hint);
    if (!hintValidation.valid) {
      socket.emit('error', {
        code: 'INVALID_HINT',
        message: hintValidation.error ?? '無効なヒントです',
      });
      return;
    }

    submitHint(
      io,
      mapping.sessionCode,
      mapping.playerId,
      hintValidation.sanitized,
      hint,
    );
  });

  // ----------------------------------------------------------------
  // player:submit-answer
  // ----------------------------------------------------------------
  socket.on('player:submit-answer', ({ answer }) => {
    const mapping = playerSessionMap.get(socket.id);
    if (!mapping) {
      socket.emit('error', {
        code: 'NOT_IN_SESSION',
        message: 'ルームに参加していません',
      });
      return;
    }

    const answerValidation = validateAnswer(answer);
    if (!answerValidation.valid) {
      socket.emit('error', {
        code: 'INVALID_ANSWER',
        message: answerValidation.error ?? '無効な回答です',
      });
      return;
    }

    submitAnswer(
      io,
      mapping.sessionCode,
      mapping.playerId,
      answerValidation.sanitized,
    );
  });
};
