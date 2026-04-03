import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GAME_CONFIG } from '@shared/constants/game-config';

export function JoinPage() {
  const { state } = useGameState();
  const [sessionCode, setSessionCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canJoin =
    sessionCode.length === GAME_CONFIG.SESSION_CODE_LENGTH &&
    playerName.trim().length > 0 &&
    playerName.length <= GAME_CONFIG.MAX_PLAYER_NAME_LENGTH &&
    !isSubmitting;

  function handleJoin() {
    if (!canJoin) return;
    setIsSubmitting(true);
    socket.emit('player:join', {
      playerName: playerName.trim(),
      sessionCode: sessionCode.toUpperCase(),
    });
    // Reset on error
    const timeout = setTimeout(() => setIsSubmitting(false), 5000);
    socket.once('error', () => {
      clearTimeout(timeout);
      setIsSubmitting(false);
    });
    socket.once('session:joined', () => {
      clearTimeout(timeout);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Just One</h2>
        <p className="text-gray-400">パーティーワードゲーム</p>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <Input
          id="session-code"
          label="セッションコード"
          placeholder="4桁の英数字"
          maxLength={GAME_CONFIG.SESSION_CODE_LENGTH}
          value={sessionCode}
          onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
          className="text-center text-2xl tracking-widest uppercase"
        />

        <Input
          id="player-name"
          label="あなたの名前"
          placeholder="名前を入力"
          maxLength={GAME_CONFIG.MAX_PLAYER_NAME_LENGTH}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />

        <Button onClick={handleJoin} disabled={!canJoin}>
          {isSubmitting ? '参加中...' : '参加する'}
        </Button>
      </div>

      {state.error && (
        <div className="bg-rose-900/50 border border-rose-500 rounded-2xl p-4 text-center text-rose-300">
          {state.error}
        </div>
      )}
    </div>
  );
}
