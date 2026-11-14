import React from 'react';
import { LogOut } from 'lucide-react';
import { PlayerColor, LobbyPlayer } from '../types/ludo';
import { COLOR_CONFIG } from '../utils/ludoConstants';
import { sound } from '../utils/soundEffects';
import { PlayerOnlineBadge } from './PlayerOnlineBadge';

interface PlayerStationProps {
  player: LobbyPlayer | undefined;
  color: PlayerColor;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  isCurrentTurn: boolean;
  canRoll: boolean;
  diceValue: number | null;
  isRolling: boolean;
  secondsLeft: number;
  theme: 'dark' | 'light';
  userId: string;
  onRoll: () => void;
  onOpenChat?: () => void;
}

export const PlayerStation: React.FC<PlayerStationProps> = ({
  player,
  color,
  position,
  isCurrentTurn,
  canRoll,
  diceValue,
  isRolling,
  secondsLeft,
  theme,
  userId,
  onRoll,
  onOpenChat,
}) => {
  const cfg = COLOR_CONFIG[color];
  const isLight = theme === 'light';
  const isMe = player?.id === userId;
  const hasLeft = !!player && !player.isBot && (player.isConnected === false || player.onlineStatus === 'offline');
  const isRightSide = position === 'top-right' || position === 'bottom-right';

  // Handle dice roll click
  const handleDiceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canRoll) {
      sound.playDiceRoll();
      sound.hapticImpact('medium');
      onRoll();
    }
  };

  // Authentic dice pips for 3D cube
  const renderFacePips = (num: number) => {
    const dotColor = cfg.primary;
    const dotBaseClass = 'w-2 h-2 rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]';

    switch (num) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span
              className="w-3.5 h-3.5 rounded-full shadow-inner"
              style={{ background: dotColor }}
            />
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between items-between w-full h-full p-1.5">
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={`${dotBaseClass} self-end`} style={{ background: dotColor }} />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between items-between w-full h-full p-1.5">
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={`${dotBaseClass} self-center`} style={{ background: dotColor }} />
            <span className={`${dotBaseClass} self-end`} style={{ background: dotColor }} />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-2 p-1.5 w-full h-full place-items-center">
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={dotBaseClass} style={{ background: dotColor }} />
          </div>
        );
      case 5:
        return (
          <div className="relative w-full h-full p-1.5 flex items-center justify-center">
            <div className="absolute top-1.5 left-1.5">
              <span className={dotBaseClass} style={{ background: dotColor }} />
            </div>
            <div className="absolute top-1.5 right-1.5">
              <span className={dotBaseClass} style={{ background: dotColor }} />
            </div>
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <div className="absolute bottom-1.5 left-1.5">
              <span className={dotBaseClass} style={{ background: dotColor }} />
            </div>
            <div className="absolute bottom-1.5 right-1.5">
              <span className={dotBaseClass} style={{ background: dotColor }} />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 p-1 w-full h-full place-items-center">
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={dotBaseClass} style={{ background: dotColor }} />
            <span className={dotBaseClass} style={{ background: dotColor }} />
          </div>
        );
      default:
        return null;
    }
  };

  const displayedValue = isCurrentTurn && diceValue !== null ? diceValue : 1;

  // Progress: sum of token steps out of the maximum (57 per token, 4 tokens)
  const progressPct = player
    ? Math.min(100, Math.round((player.tokens.reduce((acc, t) => acc + Math.min(57, Math.max(0, t.step)), 0) / (4 * 57)) * 100))
    : 0;

  if (!player) {
    return <div className="w-12 sm:w-14 h-12 invisible pointer-events-none select-none" />;
  }

  // Profile Card (Avatar with Name in its downside!)
  const ProfileAvatarUnit = (
    <div className="flex flex-col items-center min-w-0 w-[min(76px,22vw)] sm:w-[105px] max-w-[105px]">
      {/* NAME + PROGRESS ABOVE THE AVATAR (long names end with ...) */}
      <div
        className={`mb-1 w-full max-w-full min-w-0 overflow-hidden min-h-[22px] px-1.5 sm:px-2.5 py-0.5 rounded-xl border flex items-center justify-center gap-1 text-center shadow-xs transition-colors ${
          isCurrentTurn
            ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-amber-300 font-black shadow-md'
            : isLight
            ? 'bg-white text-slate-800 border-amber-200/60 font-black shadow-xs'
            : 'bg-[#211636] text-slate-100 border-purple-500/30 font-black shadow-xs'
        }`}
      >
        <span className={`text-[9px] sm:text-[11px] truncate min-w-0 flex-1 text-left ${hasLeft ? 'line-through opacity-60' : ''}`}>{player.name}</span>
        {isCurrentTurn && canRoll && (
          <span
            className="shrink-0 px-1.5 rounded-full text-[9px] leading-[14px] font-black text-white tabular-nums"
            style={{ background: cfg.primary }}
          >
            {secondsLeft}s
          </span>
        )}
      </div>
      {/* Profile Image with Perfectly Positioned Glowing Status Indicator */}
      <div className="relative w-9 h-9 sm:w-13 sm:h-13">
        {/* Frame box with rounded-2xl & overflow-hidden for the avatar image */}
        <div
          className={`relative w-full h-full rounded-2xl overflow-hidden border-2 shadow-md transition-transform ${
            isCurrentTurn
              ? 'ring-2 ring-amber-400 ring-offset-1 shadow-lg scale-105'
              : isLight
              ? 'bg-white shadow-sm'
              : 'bg-[#141822] shadow-sm'
          }`}
          style={{ borderColor: cfg.primary }}
        >
          <img
            src={
              player.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${player.id}`
            }
            alt={player.name}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover ${hasLeft ? 'brightness-[0.28] grayscale' : ''}`}
          />

          {hasLeft && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-0 bg-slate-950/45 text-white pointer-events-none">
              <LogOut className="w-7 h-7 sm:w-10 sm:h-10 stroke-[3.25] drop-shadow-lg" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider leading-none mt-0.5">Left</span>
            </div>
          )}

          {/* Turn indicator glow border */}
          {isCurrentTurn && (
            <div
              className="absolute inset-0 border-2 rounded-2xl pointer-events-none"
              style={{ borderColor: cfg.primary }}
            />
          )}
        </div>

        {/* Small Glowing Online / AFK / Offline indicator dot cleanly on top-right edge */}
        <div className="absolute -top-1 -right-1 z-30 flex items-center justify-center p-0.5 rounded-full bg-slate-900 border border-white/30 shadow-md pointer-events-none">
          <PlayerOnlineBadge
            status={player.onlineStatus || (player.isConnected ? 'online' : 'offline')}
          />
        </div>
      </div>

    </div>
  );

  // Attached Square Dice Box
  const DiceBoxUnit = (
    <div
      onClick={handleDiceClick}
      className={`relative flex flex-col items-center justify-center p-1 rounded-2xl border-2 transition-transform select-none ${
        canRoll
          ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-md ring-2 ring-amber-400/70'
          : isCurrentTurn
          ? 'cursor-default shadow-md'
          : 'opacity-65 shadow-xs'
      } ${
        isCurrentTurn
          ? 'bg-amber-400/20 border-amber-400'
          : isLight
          ? 'bg-gradient-to-br from-white to-amber-50/70 border-amber-200/80'
          : 'bg-gradient-to-br from-[#241738] to-[#170e24] border-purple-500/30'
      }`}
      style={{
        width: 'clamp(42px, 12vw, 52px)',
        height: 'clamp(42px, 12vw, 52px)',
        flex: '0 0 clamp(42px, 12vw, 52px)',
        overflow: 'hidden',
        borderColor: isCurrentTurn ? cfg.primary : undefined,
      }}
    >
      {/* Turn Halo */}
      {isCurrentTurn && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `0 0 14px ${cfg.primary}60`,
          }}
        />
      )}

      {/* Flat die: cheap to render; a short wobble replaces the 3D tumble */}
      <div className={`flex items-center justify-center w-full h-full ${isRolling ? 'animate-dice-wobble' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
          {renderFacePips(displayedValue)}
        </div>
      </div>

    </div>
  );

  // Animated 3D Golden Pointer Arrow (Points directly at the dice box when current turn!)
  const ArrowPointer = isCurrentTurn && !gameStateDiceRolled(diceValue, isRolling) ? (
    <div
      className={`flex items-center justify-center transition-transform ${
        isRightSide ? '-mr-1.5' : '-ml-1.5'
      }`}
    >
      <div
        className="w-0 h-0 drop-shadow-[0_2px_4px_rgba(234,179,8,0.7)]"
        style={{
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          ...(isRightSide
            ? { borderRight: '12px solid #eab308' } // Points right toward dice box
            : { borderLeft: '12px solid #eab308' }), // Points left toward dice box
        }}
      />
    </div>
  ) : null;

  return (
    <div className="relative flex items-center gap-1 sm:gap-1.5 select-none min-w-0 max-w-[49%] overflow-visible">
      {/* Left side players: Avatar on Left, Dice Box on Right */}
      {!isRightSide ? (
        <>
          {ProfileAvatarUnit}
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1 shrink-0">
              {DiceBoxUnit}
            </div>
            {/* Arrow points left towards dice box */}
            {isCurrentTurn && canRoll && (
              <div className="flex items-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-400 drop-shadow rotate-180"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Right side players: Dice Box on Left, Avatar on Right */
        <>
          <div className="flex items-center gap-1">
            {/* Arrow points right towards dice box */}
            {isCurrentTurn && canRoll && (
              <div className="flex items-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-400 drop-shadow"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <div className="flex flex-col items-center gap-1 shrink-0">
              {DiceBoxUnit}
            </div>
          </div>
          {ProfileAvatarUnit}
        </>
      )}
    </div>
  );
};

function gameStateDiceRolled(diceValue: number | null, isRolling: boolean): boolean {
  return diceValue !== null && !isRolling;
}
