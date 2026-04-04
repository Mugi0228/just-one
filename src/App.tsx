import { GameProvider, useGameState } from '@/contexts/GameContext';
import { PlayerLayout } from '@/components/layout/PlayerLayout';
import { HostControlBar } from '@/components/game/HostControlBar';
import { PhaseTransition } from '@/components/ui/PhaseTransition';
import { TopPage } from '@/pages/TopPage';
import { LobbyPage } from '@/pages/player/LobbyPage';
import { TeamRevealPage } from '@/pages/player/TeamRevealPage';
import { GamePage } from '@/pages/player/GamePage';
import { FinalResultPage } from '@/pages/player/FinalResultPage';

// ---------------------------------------------------------------------------
// Unified Router
// ---------------------------------------------------------------------------

const GAME_PHASES = [
  'TOPIC_REVEAL',
  'HINT_WRITING',
  'HINT_CHECKING',
  'ANSWERING',
  'ROUND_RESULT',
] as const;

function AppRouter() {
  const { state } = useGameState();

  // Derive a stable routing key (coarser than phase for page-level transitions)
  const routeKey = (() => {
    if (!state.sessionCode && !state.myPlayer) return 'top';
    if (state.phase === 'LOBBY') return 'lobby';
    if (state.phase === 'TEAM_ASSIGNMENT') return 'teams';
    if (state.phase === 'FINAL_RESULT') return 'final';
    if (GAME_PHASES.includes(state.phase as typeof GAME_PHASES[number])) return 'game';
    return 'top';
  })();

  // No session yet -> TopPage (create or join)
  if (routeKey === 'top') {
    return (
      <PlayerLayout hideHeader>
        <PhaseTransition phaseKey={routeKey}>
          <TopPage />
        </PhaseTransition>
      </PlayerLayout>
    );
  }

  // In lobby
  if (routeKey === 'lobby') {
    return (
      <PlayerLayout>
        <PhaseTransition phaseKey={routeKey}>
          <LobbyPage />
        </PhaseTransition>
        <HostControlBar />
      </PlayerLayout>
    );
  }

  // Team assignment
  if (routeKey === 'teams') {
    return (
      <PlayerLayout>
        <PhaseTransition phaseKey={routeKey}>
          <TeamRevealPage />
        </PhaseTransition>
        <HostControlBar />
      </PlayerLayout>
    );
  }

  // Game phases
  if (routeKey === 'game') {
    return (
      <PlayerLayout>
        <PhaseTransition phaseKey={routeKey}>
          <GamePage />
        </PhaseTransition>
        <HostControlBar />
      </PlayerLayout>
    );
  }

  // Final result
  if (routeKey === 'final') {
    return (
      <PlayerLayout>
        <PhaseTransition phaseKey={routeKey}>
          <FinalResultPage />
        </PhaseTransition>
      </PlayerLayout>
    );
  }

  return (
    <PlayerLayout hideHeader>
      <PhaseTransition phaseKey="top">
        <TopPage />
      </PhaseTransition>
    </PlayerLayout>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  return (
    <GameProvider>
      <AppRouter />
    </GameProvider>
  );
}
