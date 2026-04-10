import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { Timer } from '@/components/ui/Timer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GAME_CONFIG } from '@shared/constants/game-config';
import { hapticSuccess } from '@/lib/haptics';

export function HintWriting() {
  const { state } = useGameState();
  const [hint1, setHint1] = useState('');
  const [hint2, setHint2] = useState('');
  const [submitted1, setSubmitted1] = useState(false);
  const [submitted2, setSubmitted2] = useState(false);

  const isGuesser = state.myRole === 'GUESSER';
  const isDoubleHintPlayer = state.isDoubleHintPlayer;

  function handleSubmit1() {
    if (hint1.trim().length === 0 || submitted1) return;
    socket.emit('player:submit-hint', { hint: hint1.trim() });
    hapticSuccess();
    setSubmitted1(true);
  }

  function handleSubmit2() {
    if (hint2.trim().length === 0 || submitted2) return;
    socket.emit('player:submit-hint', { hint: hint2.trim() });
    hapticSuccess();
    setSubmitted2(true);
  }

  // 後方互換: ダブルでない場合は1つ目のsubmittedをそのまま使う
  const submitted = submitted1 && (!isDoubleHintPlayer || submitted2);

  // Guesser sees a waiting screen
  if (isGuesser) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Timer
          timeRemaining={state.timeRemaining}
          totalTime={GAME_CONFIG.HINT_WRITING_SECONDS}
        />
        <div className="bg-white rounded-2xl shadow-md p-8 text-center w-full border-l-4 border-l-[var(--color-warning)]">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-2xl font-extrabold text-amber-600 mb-2">
            回答者のあなたは待機中
          </p>
          <p className="text-gray-500 font-semibold">
            チームメンバーがヒントを考えています
            <span className="animate-pulse">...</span>
          </p>
        </div>
      </div>
    );
  }

  // Hint giver
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <Timer
        timeRemaining={state.timeRemaining}
        totalTime={GAME_CONFIG.HINT_WRITING_SECONDS}
      />

      <div className="text-center">
        <p className="text-sm text-gray-500 font-bold mb-1">お題</p>
        <h3 className="text-3xl font-extrabold text-gray-800">{state.topic}</h3>
      </div>

      {submitted ? (
        <div className="bg-green-50 border-2 border-[var(--color-success)] rounded-2xl p-6 text-center w-full">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-[var(--color-success)] font-extrabold text-lg mb-1">
            ヒントを提出しました！
          </p>
          <p className="text-gray-500 text-sm font-semibold">
            他のメンバーの提出を待っています...
          </p>
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-3 w-full overflow-hidden">
              <div
                className="bg-[var(--color-success)] h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${state.hintTotalHinters > 0 ? (state.hintSubmittedCount / state.hintTotalHinters) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-gray-500 text-xs font-bold mt-1.5">
              {state.hintSubmittedCount} / {state.hintTotalHinters} 件提出済み
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-3">
          {/* 1つ目のヒント */}
          <div className={`bg-white rounded-2xl shadow-md p-6 border-l-4 ${submitted1 ? 'border-l-[var(--color-success)]' : 'border-l-[var(--color-cyan)]'}`}>
            {isDoubleHintPlayer && (
              <p className="text-xs font-extrabold text-amber-500 mb-2">
                ⚖️ 人数差補填 — ヒントを2つ提出してください
              </p>
            )}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💡</span>
              <span className="text-sm font-bold text-cyan-600">
                {isDoubleHintPlayer ? 'ヒント①' : 'ヒントを書こう！'}
              </span>
            </div>
            {submitted1 ? (
              <p className="text-[var(--color-success)] font-extrabold text-sm">✅ 提出済み：{hint1}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <Input
                  id="hint-input-1"
                  placeholder="ヒントを1つ入力"
                  maxLength={GAME_CONFIG.MAX_HINT_LENGTH}
                  value={hint1}
                  onChange={(e) => setHint1(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit1(); }}
                />
                <button
                  onClick={handleSubmit1}
                  disabled={hint1.trim().length === 0}
                  className={`rounded-2xl px-6 py-3 text-lg font-extrabold transition-all duration-150 btn-3d ${hint1.trim().length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[var(--color-success)] hover:bg-green-600 text-white border-b-4 border-green-700 hover:scale-[1.02]'}`}
                >
                  提出する
                </button>
              </div>
            )}
          </div>

          {/* 2つ目のヒント（ダブル担当者のみ） */}
          {isDoubleHintPlayer && (
            <div className={`bg-white rounded-2xl shadow-md p-6 border-l-4 ${submitted2 ? 'border-l-[var(--color-success)]' : 'border-l-amber-400'}`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">💡</span>
                <span className="text-sm font-bold text-amber-500">ヒント②</span>
              </div>
              {submitted2 ? (
                <p className="text-[var(--color-success)] font-extrabold text-sm">✅ 提出済み：{hint2}</p>
              ) : !submitted1 ? (
                <p className="text-gray-400 text-sm font-semibold">ヒント①を提出してから入力できます</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <Input
                    id="hint-input-2"
                    placeholder="2つ目のヒントを入力"
                    maxLength={GAME_CONFIG.MAX_HINT_LENGTH}
                    value={hint2}
                    onChange={(e) => setHint2(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit2(); }}
                  />
                  <button
                    onClick={handleSubmit2}
                    disabled={hint2.trim().length === 0}
                    className={`rounded-2xl px-6 py-3 text-lg font-extrabold transition-all duration-150 btn-3d ${hint2.trim().length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-white border-b-4 border-amber-700 hover:scale-[1.02]'}`}
                  >
                    提出する
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
