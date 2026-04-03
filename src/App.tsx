import { GameProvider, useGameState } from '@/contexts/GameContext';
import { PlayerLayout } from '@/components/layout/PlayerLayout';
import { HostControlBar } from '@/components/game/HostControlBar';
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

  // No session yet -> TopPage (create or join)
  if (!state.sessionCode && !state.myPlayer) {
    return (
      <PlayerLayout>
        <TopPage />
      </PlayerLayout>
    );
  }

  // In lobby
  if (state.phase === 'LOBBY') {
    return (
      <PlayerLayout>
        <LobbyPage />
        <HostControlBar />
      </PlayerLayout>
    );
  }

  // Team assignment
  if (state.phase === 'TEAM_ASSIGNMENT') {
    return (
      <PlayerLayout>
        <TeamRevealPage />
        <HostControlBar />
      </PlayerLayout>
    );
  }

  // Game phases
  if (GAME_PHASES.includes(state.phase as typeof GAME_PHASES[number])) {
    return (
      <PlayerLayout>
        <GamePage />
        <HostControlBar />
      </PlayerLayout>
    );
  }

  // Final result
  if (state.phase === 'FINAL_RESULT') {
    return (
      <PlayerLayout>
        <FinalResultPage />
      </PlayerLayout>
    );
  }

  return (
    <PlayerLayout>
      <TopPage />
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
