import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { socket } from '@/lib/socket';
import { useSocket } from '@/hooks/useSocket';
import { GAME_CONFIG } from '@shared/constants/game-config';
import type {
  GamePhase,
  Player,
  Team,
  PlayerRole,
  ProgressionMode,
  RevealedHint,
  TeamRoundInfo,
  TeamRoundResult,
  TeamFinalResult,
} from '@shared/types/game';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface GameState {
  readonly phase: GamePhase;
  readonly players: readonly Player[];
  readonly teams: readonly Team[];
  readonly myPlayer: Player | null;
  readonly myPlayerId: string | null;
  readonly myTeam: Team | null;
  readonly myRole: PlayerRole | null;
  readonly isHost: boolean;
  readonly progressionMode: ProgressionMode;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly topic: string;
  readonly hints: readonly RevealedHint[];
  readonly timeRemaining: number;
  readonly roundResults: readonly TeamRoundResult[];
  readonly finalResults: readonly TeamFinalResult[];
  readonly sessionCode: string;
  readonly hintSubmittedCount: number;
  readonly hintTotalHinters: number;
  readonly teamRoundInfos: readonly TeamRoundInfo[];
  readonly error: string | null;
}

const initialState: GameState = {
  phase: 'LOBBY',
  players: [],
  teams: [],
  myPlayer: null,
  myPlayerId: null,
  myTeam: null,
  myRole: null,
  isHost: false,
  progressionMode: 'auto',
  currentRound: 0,
  totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
  topic: '',
  hints: [],
  timeRemaining: 0,
  roundResults: [],
  finalResults: [],
  sessionCode: '',
  hintSubmittedCount: 0,
  hintTotalHinters: 0,
  teamRoundInfos: [],
  error: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type GameAction =
  | { type: 'SESSION_CREATED'; sessionCode: string; playerId: string; progressionMode: ProgressionMode; totalRounds: number }
  | { type: 'SESSION_JOINED'; player: Player; players: readonly Player[]; phase: GamePhase }
  | { type: 'PLAYER_JOINED'; player: Player; players: readonly Player[] }
  | { type: 'PLAYER_LEFT'; playerId: string; players: readonly Player[] }
  | { type: 'TEAMS_ASSIGNED'; teams: readonly Team[] }
  | {
      type: 'ROUND_START';
      round: number;
      totalRounds: number;
      topic: string;
      teams: readonly TeamRoundInfo[];
    }
  | { type: 'PHASE_CHANGE'; phase: GamePhase; timeRemaining: number }
  | { type: 'TIMER_TICK'; timeRemaining: number }
  | {
      type: 'HINT_SUBMITTED';
      playerId: string;
      submittedCount: number;
      totalHinters: number;
    }
  | { type: 'HINTS_REVEALED'; teamId: string; hints: readonly RevealedHint[] }
  | { type: 'ROUND_RESULT'; results: readonly TeamRoundResult[] }
  | { type: 'FINAL_RESULT'; rankings: readonly TeamFinalResult[] }
  | { type: 'SET_PROGRESSION_MODE'; progressionMode: ProgressionMode }
  | { type: 'GAME_RESET'; players: readonly Player[] }
  | { type: 'STATE_SYNC'; payload: GameState }
  | { type: 'ERROR'; code?: string; message: string }
  | { type: 'CLEAR_ERROR' };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function deriveMyTeam(
  teams: readonly Team[],
  playerId: string | undefined,
): Team | null {
  if (!playerId) return null;
  return teams.find((t) => t.memberIds.includes(playerId)) ?? null;
}

function deriveMyRole(
  teamRoundInfos: readonly TeamRoundInfo[],
  myTeamId: string | null,
  playerId: string | undefined,
): PlayerRole | null {
  if (!myTeamId || !playerId) return null;
  const info = teamRoundInfos.find((t) => t.teamId === myTeamId);
  if (!info) return null;
  return info.guesserId === playerId ? 'GUESSER' : 'HINT_GIVER';
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SESSION_CREATED':
      return {
        ...state,
        sessionCode: action.sessionCode,
        myPlayerId: action.playerId,
        isHost: true,
        progressionMode: action.progressionMode,
        totalRounds: action.totalRounds,
      };

    case 'SESSION_JOINED':
      return {
        ...state,
        myPlayer: action.player,
        myPlayerId: action.player.id,
        players: [...action.players],
        phase: action.phase,
        isHost: false,
      };

    case 'PLAYER_JOINED': {
      const updatedPlayers = [...action.players];
      // If the joined player matches our myPlayerId (host case), set myPlayer
      const matchedPlayer =
        state.myPlayerId && !state.myPlayer
          ? updatedPlayers.find((p) => p.id === state.myPlayerId) ?? null
          : state.myPlayer;
      return { ...state, players: updatedPlayers, myPlayer: matchedPlayer };
    }

    case 'PLAYER_LEFT':
      return { ...state, players: [...action.players] };

    case 'TEAMS_ASSIGNED': {
      const pid = state.myPlayerId ?? state.myPlayer?.id;
      const myTeam = deriveMyTeam(action.teams, pid);
      return {
        ...state,
        teams: [...action.teams],
        myTeam,
        phase: 'TEAM_ASSIGNMENT',
      };
    }

    case 'ROUND_START': {
      const pid = state.myPlayerId ?? state.myPlayer?.id;
      const myTeam = deriveMyTeam(state.teams, pid);
      const myRole = deriveMyRole(
        action.teams,
        myTeam?.id ?? null,
        pid,
      );
      return {
        ...state,
        currentRound: action.round,
        totalRounds: action.totalRounds,
        topic: action.topic,
        teamRoundInfos: [...action.teams],
        myRole,
        hints: [],
        hintSubmittedCount: 0,
        hintTotalHinters: 0,
      };
    }

    case 'PHASE_CHANGE':
      return {
        ...state,
        phase: action.phase,
        timeRemaining: action.timeRemaining,
        // ロビーに戻る場合はチーム情報をリセット
        ...(action.phase === 'LOBBY' ? { teams: [], myTeam: null, myRole: null } : {}),
      };

    case 'TIMER_TICK':
      return { ...state, timeRemaining: action.timeRemaining };

    case 'HINT_SUBMITTED':
      return {
        ...state,
        hintSubmittedCount: action.submittedCount,
        hintTotalHinters: action.totalHinters,
      };

    case 'HINTS_REVEALED': {
      // Merge hints per team — replace if same teamId
      const isMyTeam = state.myTeam?.id === action.teamId;
      if (isMyTeam) {
        return { ...state, hints: [...action.hints] };
      }
      return state;
    }

    case 'ROUND_RESULT':
      return { ...state, roundResults: [...action.results] };

    case 'FINAL_RESULT':
      return { ...state, finalResults: [...action.rankings] };

    case 'SET_PROGRESSION_MODE':
      return { ...state, progressionMode: action.progressionMode };

    case 'GAME_RESET':
      return {
        ...initialState,
        sessionCode: state.sessionCode,
        myPlayerId: state.myPlayerId,
        myPlayer: state.myPlayer,
        isHost: state.isHost,
        progressionMode: state.progressionMode,
        players: [...action.players],
      };

    case 'STATE_SYNC':
      return { ...action.payload };

    case 'ERROR': {
      // Clear session token when the session no longer exists or player is gone,
      // so the next reconnect doesn't loop on an invalid token.
      if (
        action.code === 'SESSION_NOT_FOUND' ||
        action.code === 'PLAYER_NOT_FOUND' ||
        action.code === 'INVALID_TOKEN' ||
        action.message.includes('ホストが切断')
      ) {
        localStorage.removeItem('just-one-token');
        localStorage.removeItem('just-one-session');
      }
      return { ...state, error: action.message };
    }

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface GameContextValue {
  readonly state: GameState;
  readonly dispatch: React.Dispatch<GameAction>;
  readonly setPendingProgressionMode: (mode: ProgressionMode) => void;
  readonly setPendingTotalRounds: (rounds: number) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGameState(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface GameProviderProps {
  readonly children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  // Track the progression mode chosen when creating a session
  const pendingProgressionModeRef = useRef<ProgressionMode>('auto');
  const pendingTotalRoundsRef = useRef<number>(GAME_CONFIG.TOTAL_ROUNDS);

  // Connect socket
  useSocket();

  // Listen to server events
  useEffect(() => {
    const s = socket;

    s.on('session:created', ({ sessionCode, playerId, sessionToken }) => {
      dispatch({
        type: 'SESSION_CREATED',
        sessionCode,
        playerId,
        progressionMode: pendingProgressionModeRef.current,
        totalRounds: pendingTotalRoundsRef.current,
      });
      // Persist for reconnection
      localStorage.setItem('just-one-token', sessionToken);
      localStorage.setItem('just-one-session', JSON.stringify({
        sessionToken,
        sessionCode,
        playerId,
      }));
    });

    s.on('session:joined', ({ player, players, phase, sessionToken }) => {
      dispatch({ type: 'SESSION_JOINED', player, players, phase });
      // Persist for reconnection
      localStorage.setItem('just-one-token', sessionToken);
    });

    s.on('session:player-joined', ({ player, players }) => {
      dispatch({ type: 'PLAYER_JOINED', player, players });
    });

    s.on('session:player-left', ({ playerId, players }) => {
      dispatch({ type: 'PLAYER_LEFT', playerId, players });
    });

    s.on('session:teams-assigned', ({ teams }) => {
      dispatch({ type: 'TEAMS_ASSIGNED', teams });
    });

    s.on('game:round-start', ({ round, totalRounds, topic, teams }) => {
      dispatch({ type: 'ROUND_START', round, totalRounds, topic, teams });
    });

    s.on('game:phase-change', ({ phase, timeRemaining }) => {
      dispatch({ type: 'PHASE_CHANGE', phase, timeRemaining });
    });

    s.on('game:timer-tick', ({ timeRemaining }) => {
      dispatch({ type: 'TIMER_TICK', timeRemaining });
    });

    s.on('game:hint-submitted', ({ playerId, submittedCount, totalHinters }) => {
      dispatch({
        type: 'HINT_SUBMITTED',
        playerId,
        submittedCount,
        totalHinters,
      });
    });

    s.on('game:hints-revealed', ({ teamId, hints }) => {
      dispatch({ type: 'HINTS_REVEALED', teamId, hints });
    });

    s.on('game:round-result', ({ results }) => {
      dispatch({ type: 'ROUND_RESULT', results });
    });

    s.on('game:final-result', ({ rankings }) => {
      dispatch({ type: 'FINAL_RESULT', rankings });
    });

    s.on('session:game-reset', ({ players }) => {
      dispatch({ type: 'GAME_RESET', players });
    });

    s.on('session:state-sync', (payload) => {
      // Derive myPlayer, myTeam, myRole from sync data
      const myPlayer = payload.players.find((p) => p.id === payload.playerId) ?? null;
      const myTeam = payload.teams.find((t) => t.memberIds.includes(payload.playerId)) ?? null;
      const myRole = myTeam
        ? (payload.teamRoundInfos.find((t) => t.teamId === myTeam.id)?.guesserId === payload.playerId
          ? 'GUESSER' as const
          : 'HINT_GIVER' as const)
        : null;

      dispatch({
        type: 'STATE_SYNC',
        payload: {
          phase: payload.phase,
          players: [...payload.players],
          teams: [...payload.teams],
          myPlayer,
          myPlayerId: payload.playerId,
          myTeam,
          myRole,
          isHost: payload.isHost,
          progressionMode: payload.progressionMode,
          currentRound: payload.currentRound,
          totalRounds: payload.totalRounds,
          topic: payload.topic,
          hints: [...payload.hints],
          timeRemaining: payload.timeRemaining,
          roundResults: [...payload.roundResults],
          finalResults: [...payload.finalResults],
          sessionCode: payload.sessionCode,
          hintSubmittedCount: 0,
          hintTotalHinters: 0,
          teamRoundInfos: [...payload.teamRoundInfos],
          error: null,
        },
      });

      // Persist to localStorage
      localStorage.setItem('just-one-session', JSON.stringify({
        sessionToken: localStorage.getItem('just-one-token'),
        sessionCode: payload.sessionCode,
        playerId: payload.playerId,
      }));
    });

    s.on('error', ({ code, message }) => {
      dispatch({ type: 'ERROR', code, message });
    });

    return () => {
      s.off('session:created');
      s.off('session:joined');
      s.off('session:player-joined');
      s.off('session:player-left');
      s.off('session:teams-assigned');
      s.off('game:round-start');
      s.off('game:phase-change');
      s.off('game:timer-tick');
      s.off('game:hint-submitted');
      s.off('game:hints-revealed');
      s.off('game:round-result');
      s.off('game:final-result');
      s.off('session:game-reset');
      s.off('session:state-sync');
      s.off('error');
    };
  }, []);

  function setPendingProgressionMode(mode: ProgressionMode) {
    pendingProgressionModeRef.current = mode;
  }

  function setPendingTotalRounds(rounds: number) {
    pendingTotalRoundsRef.current = rounds;
  }

  return (
    <GameContext.Provider value={{ state, dispatch, setPendingProgressionMode, setPendingTotalRounds }}>
      {children}
    </GameContext.Provider>
  );
}
