import type { GamePhase, Player, ProgressionMode, Team, Hint } from '@shared/types/game.js';
import { generateSessionCode } from '../utils/code-generator.js';
import { createTopicProvider, type TopicProvider } from './topic-provider.js';
import { nanoid } from 'nanoid';
import { cancelBotTimeouts } from './bot-timeout-registry.js';

/** チームのラウンド内部状態 */
export interface TeamRoundState {
  readonly teamId: string;
  readonly guesserId: string;
  readonly topic: string;
  readonly hints: readonly Omit<Hint, 'isDuplicate'>[];
  readonly checkedHints: readonly Hint[];
  readonly answer: string | null;
  readonly score: number;
}

/** ゲームルームの内部状態 */
export interface GameSession {
  readonly code: string;
  readonly hostSocketId: string;
  readonly players: readonly Player[];
  readonly phase: GamePhase;
  readonly progressionMode: ProgressionMode;
  readonly teams: readonly Team[];
  readonly currentRound: number;
  readonly teamRoundStates: readonly TeamRoundState[];
  readonly totalScores: ReadonlyMap<string, number>; // teamId → total score
  readonly roundHistory: readonly (readonly TeamRoundState[])[]; // past rounds
  readonly topicProvider: TopicProvider;
  readonly timerId: ReturnType<typeof setInterval> | null;
  readonly pausedTimeRemaining: number | null; // ポーズ時の残り時間
  readonly guesserRotation: ReadonlyMap<string, number>; // teamId → next guesser index
}

/** ルームストア */
const sessions = new Map<string, GameSession>();

/** プレイヤーID → ソケットID のマッピング（player.id !== socket.id の場合のルックアップ用） */
const playerToSocketMap = new Map<string, string>();

/** ルームトークン → { sessionCode, playerId } のマッピング（再接続用） */
const tokenStore = new Map<string, { readonly sessionCode: string; readonly playerId: string }>();

/**
 * ルームトークンを作成し、保存する。
 */
export const createSessionToken = (
  sessionCode: string,
  playerId: string,
): string => {
  const token = nanoid();
  tokenStore.set(token, { sessionCode, playerId });
  return token;
};

/**
 * トークンからルーム情報を検索する。
 */
export const lookupToken = (
  token: string,
): { sessionCode: string; playerId: string } | undefined =>
  tokenStore.get(token);

/**
 * トークンを削除する。
 */
export const deleteToken = (token: string): void => {
  tokenStore.delete(token);
};

/**
 * プレイヤーIDとソケットIDのマッピングを登録する。
 */
export const registerPlayerSocket = (
  playerId: string,
  socketId: string,
): void => {
  playerToSocketMap.set(playerId, socketId);
};

/**
 * プレイヤーIDのマッピングを削除する。
 */
export const unregisterPlayerSocket = (playerId: string): void => {
  playerToSocketMap.delete(playerId);
};

/**
 * プレイヤーIDからソケットIDを取得する。
 * マッピングが無い場合はプレイヤーID自体がソケットID（既存の通常プレイヤー）として返す。
 */
export const getSocketIdByPlayerId = (playerId: string): string =>
  playerToSocketMap.get(playerId) ?? playerId;

/** 全ルームコードの集合を取得（コード生成時の衝突チェック用） */
const getExistingCodes = (): ReadonlySet<string> => new Set(sessions.keys());

/**
 * 新しいルームを作成する。
 * ホストを最初のプレイヤーとして自動追加する。
 */
export const createSession = (
  hostSocketId: string,
  hostName: string,
  progressionMode: ProgressionMode,
): GameSession => {
  const code = generateSessionCode(getExistingCodes());

  const hostPlayer: Player = {
    id: nanoid(),
    name: hostName,
    joinedAt: Date.now(),
    isConnected: true,
    isBot: false,
  };

  const session: GameSession = {
    code,
    hostSocketId,
    players: [hostPlayer],
    phase: 'LOBBY',
    progressionMode,
    teams: [],
    currentRound: 0,
    teamRoundStates: [],
    totalScores: new Map(),
    roundHistory: [],
    topicProvider: createTopicProvider(),
    timerId: null,
    pausedTimeRemaining: null,
    guesserRotation: new Map(),
  };

  sessions.set(code, session);
  return session;
};

/**
 * ルームを取得する。
 */
export const getSession = (code: string): GameSession | undefined =>
  sessions.get(code);

/**
 * ルームを削除する。
 */
export const deleteSession = (code: string): boolean => {
  const session = sessions.get(code);
  if (session?.timerId) {
    clearInterval(session.timerId);
  }
  cancelBotTimeouts(code);
  return sessions.delete(code);
};

/**
 * ルームを更新する（不変更新）。
 */
export const updateSession = (
  code: string,
  updater: (session: GameSession) => GameSession,
): GameSession | undefined => {
  const session = sessions.get(code);
  if (!session) return undefined;

  const updated = updater(session);
  sessions.set(code, updated);
  return updated;
};

/**
 * プレイヤーをルームに追加する。
 */
export const addPlayer = (
  code: string,
  player: Player,
): GameSession | undefined =>
  updateSession(code, (session) => ({
    ...session,
    players: [...session.players, player],
  }));

/**
 * プレイヤーをルームから削除する。
 */
export const removePlayer = (
  code: string,
  playerId: string,
): GameSession | undefined =>
  updateSession(code, (session) => ({
    ...session,
    players: session.players.filter((p) => p.id !== playerId),
  }));

/**
 * プレイヤーの接続状態を更新する。
 */
export const updatePlayerConnection = (
  code: string,
  playerId: string,
  isConnected: boolean,
): GameSession | undefined =>
  updateSession(code, (session) => ({
    ...session,
    players: session.players.map((p) =>
      p.id === playerId ? { ...p, isConnected } : p,
    ),
  }));

/**
 * ソケットIDからルームを検索する。
 */
export const findSessionBySocketId = (
  socketId: string,
): { session: GameSession; playerId: string } | undefined => {
  for (const session of sessions.values()) {
    // ホストのチェック（ホストの player ID は players[0].id）
    if (session.hostSocketId === socketId) {
      const hostPlayer = session.players[0];
      return { session, playerId: hostPlayer?.id ?? socketId };
    }
  }
  return undefined;
};

/**
 * ボットプレイヤーを追加する。
 */
const BOT_NAMES = [
  'B太郎', 'B花子', 'B次郎', 'Bさくら',
  'B一郎', 'B美咲', 'B健太', 'Bあかり',
  'B翔太', 'B結衣', 'B大輔', 'Bゆい',
  'B拓海', 'Bはな', 'B陽太', 'Bりん',
  'B悠人', 'Bみお', 'B蒼', 'Bひなた',
  'B樹', 'Bすず', 'B律', 'Bあおい',
  'B湊', 'Bつむぎ', 'B凪',
] as const;

export const addBot = (code: string): GameSession | undefined => {
  const session = getSession(code);
  if (!session) return undefined;

  const botCount = session.players.filter((p) => p.isBot).length;
  const botId = `bot-${botCount + 1}-${Date.now()}`;
  const botName = BOT_NAMES[botCount % BOT_NAMES.length];

  const botPlayer: Player = {
    id: botId,
    name: botName,
    joinedAt: Date.now(),
    isConnected: true,
    isBot: true,
  };

  return addPlayer(code, botPlayer);
};

/**
 * ボットプレイヤーを削除する。
 */
export const removeBot = (
  code: string,
  botId: string,
): GameSession | undefined =>
  updateSession(code, (session) => ({
    ...session,
    players: session.players.filter((p) => !(p.id === botId && p.isBot)),
  }));

/**
 * 全ルーム数を取得する（デバッグ用）。
 */
export const getSessionCount = (): number => sessions.size;
