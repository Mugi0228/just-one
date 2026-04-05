import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { hapticLight } from '@/lib/haptics';
import type { Team, Player } from '@shared/types/game';

const TEAM_ACCENT_COLORS = [
  { border: 'border-l-[var(--color-primary)]', text: 'text-[var(--color-primary)]', bg: 'bg-purple-50', dropBg: 'bg-purple-50', dropBorder: 'border-[var(--color-primary)]' },
  { border: 'border-l-[var(--color-cyan)]', text: 'text-[var(--color-cyan)]', bg: 'bg-cyan-50', dropBg: 'bg-cyan-50', dropBorder: 'border-[var(--color-cyan)]' },
  { border: 'border-l-[var(--color-warning)]', text: 'text-[var(--color-warning)]', bg: 'bg-amber-50', dropBg: 'bg-amber-50', dropBorder: 'border-[var(--color-warning)]' },
  { border: 'border-l-[var(--color-pink)]', text: 'text-[var(--color-pink)]', bg: 'bg-pink-50', dropBg: 'bg-pink-50', dropBorder: 'border-[var(--color-pink)]' },
  { border: 'border-l-[var(--color-success)]', text: 'text-[var(--color-success)]', bg: 'bg-green-50', dropBg: 'bg-green-50', dropBorder: 'border-[var(--color-success)]' },
  { border: 'border-l-[#3B82F6]', text: 'text-[#3B82F6]', bg: 'bg-blue-50', dropBg: 'bg-blue-50', dropBorder: 'border-[#3B82F6]' },
];

function getTeamColors(index: number) {
  return TEAM_ACCENT_COLORS[index % TEAM_ACCENT_COLORS.length];
}

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

// ---------------------------------------------------------------------------
// Touch DnD — module-level state (no React re-renders during drag move)
// ---------------------------------------------------------------------------

let _ghostEl: HTMLDivElement | null = null;
let _activeDragPlayerId: string | null = null;
let _highlightedTeamEl: Element | null = null;

function createDragGhost(label: string, x: number, y: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'z-index:9999',
    'background:white',
    'border:2px solid #7C3AED',
    'border-radius:0.75rem',
    'padding:0.375rem 0.875rem',
    'font-weight:700',
    'font-size:0.875rem',
    'line-height:1.5',
    'color:#374151',
    'box-shadow:0 8px 24px rgba(0,0,0,0.25)',
    'transform:translate(-50%,-60%) scale(1.08)',
    'white-space:nowrap',
    'transition:none',
  ].join(';');
  el.textContent = label;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  return el;
}

function getTeamIdAtPoint(x: number, y: number): string | null {
  // Temporarily hide ghost so elementFromPoint sees what's beneath
  if (_ghostEl) _ghostEl.style.visibility = 'hidden';
  const el = document.elementFromPoint(x, y);
  if (_ghostEl) _ghostEl.style.visibility = '';
  return el?.closest('[data-team-id]')?.getAttribute('data-team-id') ?? null;
}

function setDropHighlight(teamId: string | null): void {
  if (_highlightedTeamEl) {
    _highlightedTeamEl.classList.remove('touch-drag-over');
    _highlightedTeamEl = null;
  }
  if (teamId) {
    const el = document.querySelector(`[data-team-id="${teamId}"]`);
    if (el) {
      el.classList.add('touch-drag-over');
      _highlightedTeamEl = el;
    }
  }
}

function cleanupDrag(): void {
  _ghostEl?.remove();
  _ghostEl = null;
  setDropHighlight(null);
  _activeDragPlayerId = null;
}

// ---------------------------------------------------------------------------
// TeamRevealPage
// ---------------------------------------------------------------------------

export function TeamRevealPage() {
  const { state } = useGameState();

  return (
    <div className={`flex flex-col gap-6 ${state.isHost ? 'pb-20' : ''}`}>
      {/* My team highlight (non-host) */}
      {!state.isHost && state.myTeam && (
        <div className="bg-purple-50 rounded-2xl shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm font-bold mb-1">あなたのチーム</p>
          <h2 className="text-4xl font-extrabold text-[var(--color-primary)]">
            {state.myTeam.name}
          </h2>
        </div>
      )}

      {/* Host instruction */}
      {state.isHost && (
        <div className="text-center">
          <p className="text-gray-500 text-sm font-bold">
            👆 ドラッグまたは ↔ ボタンでメンバーを移動
          </p>
        </div>
      )}

      {/* Teams */}
      <div className="flex flex-col gap-3">
        {state.teams.map((team, teamIndex) => (
          <DraggableTeamCard
            key={team.id}
            team={team}
            teamIndex={teamIndex}
            players={state.players}
            isHost={state.isHost}
            isMyTeam={team.id === state.myTeam?.id}
            myPlayerId={state.myPlayerId}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable Team Card
// ---------------------------------------------------------------------------

interface DraggableTeamCardProps {
  readonly team: Team;
  readonly teamIndex: number;
  readonly players: readonly Player[];
  readonly isHost: boolean;
  readonly isMyTeam: boolean;
  readonly myPlayerId: string | null;
}

function DraggableTeamCard({
  team,
  teamIndex,
  players,
  isHost,
  isMyTeam,
  myPlayerId,
}: DraggableTeamCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const colors = getTeamColors(teamIndex);

  const members = team.memberIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  // Desktop DnD handlers
  function handleDragOver(e: React.DragEvent) {
    if (!isHost) return;
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    if (!isHost) return;
    e.preventDefault();
    setIsDragOver(false);
    const playerId = e.dataTransfer.getData('text/plain');
    if (!playerId) return;
    socket.emit('host:move-player', { playerId, toTeamId: team.id });
  }

  return (
    <div
      data-team-id={team.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        bg-white rounded-2xl shadow-md p-4 transition-all duration-150
        border-l-4 ${colors.border}
        ${isMyTeam ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ' + colors.bg : ''}
        ${isDragOver ? `${colors.dropBorder} border-2 ${colors.dropBg} scale-[1.01]` : 'border-2 border-transparent'}
      `}
    >
      <h3 className={`text-lg font-extrabold mb-3 ${colors.text}`}>{team.name}</h3>
      <div className="flex flex-wrap gap-2">
        {members.map((member, memberIndex) => (
          <PlayerChip
            key={member.id}
            player={member}
            playerIndex={memberIndex}
            draggable={isHost}
            isMe={member.id === myPlayerId}
            isHost={isHost}
            currentTeamId={team.id}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player Chip (draggable — desktop + touch)
// ---------------------------------------------------------------------------

interface PlayerChipProps {
  readonly player: Player;
  readonly playerIndex: number;
  readonly draggable: boolean;
  readonly isMe: boolean;
  readonly isHost: boolean;
  readonly currentTeamId: string;
}

function PlayerChip({ player, playerIndex, draggable, isMe, isHost, currentTeamId }: PlayerChipProps) {
  const { state } = useGameState();
  const [isDragging, setIsDragging] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  // ---- Desktop DnD ----

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', player.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  // ---- Touch DnD ----

  function handleTouchStart(e: React.TouchEvent) {
    if (!draggable) return;
    // Close any open move menu
    setShowMoveMenu(false);
    const touch = e.touches[0];
    _activeDragPlayerId = player.id;
    _ghostEl = createDragGhost(player.name, touch.clientX, touch.clientY);
    hapticLight();
    setIsDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!_ghostEl || _activeDragPlayerId !== player.id) return;
    const touch = e.touches[0];
    _ghostEl.style.left = `${touch.clientX}px`;
    _ghostEl.style.top = `${touch.clientY}px`;

    const targetId = getTeamIdAtPoint(touch.clientX, touch.clientY);
    setDropHighlight(targetId !== currentTeamId ? targetId : null);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!_ghostEl || _activeDragPlayerId !== player.id) return;
    const touch = e.changedTouches[0];
    const targetId = getTeamIdAtPoint(touch.clientX, touch.clientY);

    cleanupDrag();
    setIsDragging(false);

    if (targetId && targetId !== currentTeamId) {
      socket.emit('host:move-player', { playerId: player.id, toTeamId: targetId });
      hapticLight();
    }
  }

  function handleTouchCancel() {
    if (_activeDragPlayerId !== player.id) return;
    cleanupDrag();
    setIsDragging(false);
  }

  // ---- Move menu (button fallback) ----

  function handleMoveToTeam(toTeamId: string) {
    socket.emit('host:move-player', { playerId: player.id, toTeamId });
    setShowMoveMenu(false);
  }

  const otherTeams = state.teams.filter((t) => t.id !== currentTeamId);

  return (
    <div className="relative">
      <div
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTouchStart={draggable ? handleTouchStart : undefined}
        onTouchMove={draggable ? handleTouchMove : undefined}
        onTouchEnd={draggable ? handleTouchEnd : undefined}
        onTouchCancel={draggable ? handleTouchCancel : undefined}
        className={`
          flex items-center gap-2 rounded-xl px-3 py-1.5 min-h-[44px]
          bg-white shadow-sm border-2
          ${isMe ? 'border-[var(--color-primary)] bg-purple-50' : 'border-gray-100'}
          ${draggable ? 'cursor-grab active:cursor-grabbing hover:scale-105 hover:shadow-md touch-none' : ''}
          ${isDragging ? 'opacity-40' : ''}
          transition-all duration-150
        `}
      >
        <div
          className={`
            w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-white
            ${player.isBot ? 'bg-gray-300' : getAvatarColor(playerIndex)}
          `}
        >
          {player.isBot ? '🤖' : player.name.charAt(0)}
        </div>
        <span className="text-sm font-bold text-gray-700 max-w-[8rem] truncate">{player.name}</span>
        {isHost && otherTeams.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu(!showMoveMenu);
            }}
            className="ml-1 w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-sm text-gray-500 transition-colors touch-manipulation"
            title="チームを移動"
          >
            ↔
          </button>
        )}
      </div>

      {/* Move popover */}
      {showMoveMenu && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[9rem]">
          {otherTeams.map((t) => (
            <button
              key={t.id}
              onClick={() => handleMoveToTeam(t.id)}
              className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-purple-50 hover:text-[var(--color-primary)] active:bg-purple-100 transition-colors touch-manipulation"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
