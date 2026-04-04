import type {
  GamePhase,
  Player,
  ProgressionMode,
  Team,
  TeamRoundInfo,
  TeamRoundResult,
  TeamFinalResult,
  RevealedHint,
} from './game.js';

/** クライアント → サーバー イベント */
export interface ClientEvents {
  'host:create-session': (payload: { hostName: string; progressionMode: ProgressionMode; totalRounds: number }) => void;
  'host:start-team-shuffle': () => void;
  'host:confirm-teams': () => void;
  'host:start-game': () => void;
  'host:next-round': () => void;
  'host:pause': () => void;
  'host:resume': () => void;
  'host:reveal-result': () => void;
  'host:move-player': (payload: { playerId: string; toTeamId: string }) => void;
  'host:override-result': (payload: { teamId: string; isCorrect: boolean }) => void;
  'host:play-again': () => void;
  'host:add-bot': () => void;
  'host:remove-bot': (payload: { botId: string }) => void;
  'host:back-to-lobby': () => void;
  'player:join': (payload: {
    playerName: string;
    sessionCode: string;
  }) => void;
  'player:submit-hint': (payload: { hint: string }) => void;
  'player:submit-answer': (payload: { answer: string }) => void;
  'player:rejoin': (payload: { sessionToken: string }) => void;
}

/** サーバー → クライアント イベント */
export interface ServerEvents {
  'session:created': (payload: { sessionCode: string; playerId: string; sessionToken: string }) => void;
  'session:player-joined': (payload: {
    player: Player;
    players: readonly Player[];
  }) => void;
  'session:player-left': (payload: {
    playerId: string;
    players: readonly Player[];
  }) => void;
  'session:teams-assigned': (payload: {
    teams: readonly Team[];
  }) => void;
  'session:joined': (payload: {
    player: Player;
    players: readonly Player[];
    phase: GamePhase;
    sessionToken: string;
  }) => void;
  'game:round-start': (payload: {
    round: number;
    totalRounds: number;
    topic: string;
    teams: readonly TeamRoundInfo[];
  }) => void;
  'game:phase-change': (payload: {
    phase: GamePhase;
    timeRemaining: number;
  }) => void;
  'game:timer-tick': (payload: { timeRemaining: number }) => void;
  'game:hint-submitted': (payload: {
    playerId: string;
    submittedCount: number;
    totalHinters: number;
  }) => void;
  'game:hints-revealed': (payload: {
    teamId: string;
    hints: readonly RevealedHint[];
  }) => void;
  'game:round-result': (payload: {
    results: readonly TeamRoundResult[];
  }) => void;
  'game:final-result': (payload: {
    rankings: readonly TeamFinalResult[];
  }) => void;
  'session:game-reset': (payload: { players: readonly Player[] }) => void;
  'session:state-sync': (payload: {
    sessionCode: string;
    playerId: string;
    isHost: boolean;
    players: readonly Player[];
    teams: readonly Team[];
    phase: GamePhase;
    progressionMode: ProgressionMode;
    currentRound: number;
    totalRounds: number;
    topic: string;
    timeRemaining: number;
    roundResults: readonly TeamRoundResult[];
    finalResults: readonly TeamFinalResult[];
    teamRoundInfos: readonly TeamRoundInfo[];
    hints: readonly RevealedHint[];
  }) => void;
  error: (payload: { code: string; message: string }) => void;
}
