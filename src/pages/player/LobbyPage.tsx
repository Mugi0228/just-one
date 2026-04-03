import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { GAME_CONFIG } from '@shared/constants/game-config';

const AVATAR_COLORS = [
  'bg-[var(--color-primary)]',
  'bg-[var(--color-success)]',
  'bg-[var(--color-warning)]',
  'bg-[var(--color-pink)]',
  'bg-[#3B82F6]',
  'bg-[var(--color-cyan)]',
  'bg-[#F97316]',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function LobbyPage() {
  const { state } = useGameState();
  const botCount = state.players.filter((p) => p.isBot).length;

  function handleRemoveBot(botId: string) {
    socket.emit('host:remove-bot', { botId });
  }

  return (
    <div className={`flex flex-col gap-6 ${state.isHost ? 'pb-20' : ''}`}>
      {/* Session code */}
      <div className="bg-white rounded-2xl shadow-md p-6 text-center">
        <p className="text-gray-500 text-sm font-bold mb-2">セッションコード</p>
        <div className="inline-block border-[3px] border-dashed border-[var(--color-primary)] rounded-2xl px-8 py-3">
          <p className="text-5xl font-extrabold tracking-widest text-[var(--color-primary)]">
            {state.sessionCode}
          </p>
        </div>
        <p className="text-gray-400 text-sm mt-3 font-semibold">
          このコードを参加者に共有してください
        </p>
      </div>

      {/* Player count */}
      <div className="text-center">
        <span className="text-3xl font-extrabold text-gray-800">
          👥 {state.players.length}
        </span>
        <span className="text-gray-500 text-lg font-bold ml-1">人参加中</span>
        {botCount > 0 && (
          <span className="text-gray-400 text-sm font-semibold ml-2">
            （うちボット {botCount}人）
          </span>
        )}
      </div>

      {/* Player grid */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="grid grid-cols-3 gap-4">
          {state.players.map((player, index) => (
            <div key={player.id} className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center
                  text-lg font-extrabold text-white
                  transition-all duration-150
                  ${player.isBot
                    ? 'bg-gray-300'
                    : getAvatarColor(index)}
                  ${player.id === state.myPlayer?.id
                    ? 'ring-[3px] ring-[var(--color-primary)] ring-offset-2'
                    : ''}
                `}
              >
                {player.isBot ? '🤖' : player.name.charAt(0)}
              </div>
              <span
                className={`text-xs text-center truncate w-full font-bold ${
                  player.id === state.myPlayer?.id
                    ? 'text-[var(--color-primary)]'
                    : 'text-gray-600'
                }`}
              >
                {player.name}
              </span>
              {/* Host can remove bots */}
              {state.isHost && player.isBot && (
                <button
                  onClick={() => handleRemoveBot(player.id)}
                  className="text-xs text-[var(--color-error)] hover:text-red-600 font-bold transition-colors"
                >
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Min players hint */}
      {state.players.length < GAME_CONFIG.MIN_PLAYERS && (
        <div className="text-center">
          <p className="text-gray-400 text-sm font-semibold">
            {GAME_CONFIG.MIN_PLAYERS}人以上で開始できます
          </p>
        </div>
      )}

      {/* Waiting message for non-host */}
      {!state.isHost && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-2xl shadow-sm px-5 py-3">
            <span className="text-2xl animate-bounce">🎲</span>
            <span className="text-gray-500 text-sm font-bold">
              ホストの開始を待っています
              <span className="animate-pulse">...</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
