import React from 'react';
import { Crown, Shield } from 'lucide-react';
import { LobbyPlayer } from '../types/ludo';
import { SAFE_TRACK_INDICES, TRACK_COORDINATES, YARD_SLOT_COORDINATES } from '../utils/ludoConstants';

interface DarkLudoBoardProps {
  boardRotation?: number;
  players?: LobbyPlayer[];
}

export const DarkLudoBoard: React.FC<DarkLudoBoardProps> = ({ boardRotation = 0, players }) => {
  const safeCoordsMap = new Set<string>();
  SAFE_TRACK_INDICES.forEach((idx) => {
    const c = TRACK_COORDINATES[idx];
    safeCoordsMap.add(`${c.r}_${c.c}`);
  });

  const redPlayer = players?.find((p) => p.color === 'red');
  const bluePlayer = players?.find((p) => p.color === 'blue');
  const yellowPlayer = players?.find((p) => p.color === 'yellow');
  const greenPlayer = players?.find((p) => p.color === 'green');

  const getPlayerLabel = (p?: LobbyPlayer) => {
    if (!p) return 'Vacant';
    if (p.username) return `@${p.username}`;
    return p.name;
  };

  const getPlayerProgress = (p?: LobbyPlayer) => {
    if (!p || !p.tokens) return 0;
    const totalStep = p.tokens.reduce((acc, t) => acc + Math.min(57, t.step || 0), 0);
    return Math.min(100, Math.round((totalStep / (4 * 57)) * 100));
  };

  const redProgress = getPlayerProgress(redPlayer);
  const blueProgress = getPlayerProgress(bluePlayer);
  const yellowProgress = getPlayerProgress(yellowPlayer);
  const greenProgress = getPlayerProgress(greenPlayer);

  // Keep every player label on the SOUTH edge in the viewer's rotated board perspective.
  const getSouthAnchorStyle = (): React.CSSProperties => {
    const rotation = ((boardRotation % 360) + 360) % 360;
    if (rotation === 90) return { position: 'absolute', right: '3px', top: '50%', transform: 'translate(0, -50%) rotate(-90deg)', transformOrigin: 'center' };
    if (rotation === 180) return { position: 'absolute', top: '3px', left: '50%', transform: 'translate(-50%, 0) rotate(-180deg)', transformOrigin: 'center' };
    if (rotation === 270) return { position: 'absolute', left: '3px', top: '50%', transform: 'translate(0, -50%) rotate(-270deg)', transformOrigin: 'center' };
    return { position: 'absolute', bottom: '3px', left: '50%', transform: 'translate(-50%, 0)' };
  };

  const StickmanExitDoorIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg
      viewBox="0 0 24 24"
      className={`${className} stroke-current fill-none stroke-2 shrink-0 drop-shadow-xs`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8" />
      <circle cx="16" cy="6" r="1.5" className="fill-current" />
      <path d="M16 7.5v4" />
      <path d="M16 9l-2.5 1.5" />
      <path d="M16 9l2.5 1" />
      <path d="M16 11.5l-2.5 3.5" />
      <path d="M16 11.5l3 3" />
      <path d="M19 11h3" />
      <path d="M20 9l2 2-2 2" />
    </svg>
  );

  const renderHomeFooter = (
    player: LobbyPlayer,
    progress: number,
    dotHex: string
  ) => {
    const isLeft = !player.isBot && (player.isConnected === false || player.onlineStatus === 'offline');
    const capturesCount = player.capturesCount || 0;
    const nameLabel = player.name || 'Player';

    return (
      <div
        style={getSouthAnchorStyle()}
        className="z-10 flex flex-col items-center pointer-events-none transition-transform duration-500 ease-out"
      >
        {/* Merged South Pill: Name/Left on left, % on right */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 w-max max-w-[calc(100%-6px)] min-w-0 overflow-hidden rounded-xl border border-purple-500/40 bg-[#150a24]/95 text-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          {isLeft ? (
            <div className="flex items-center gap-1 text-rose-400 font-black">
              <StickmanExitDoorIcon className="w-3 h-3 text-rose-400" />
              <span className="text-[8.5px] font-black uppercase tracking-wider">Left</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0 flex-1 max-w-[min(112px,24vw)] sm:max-w-[140px] leading-tight overflow-hidden">
              <Shield className="w-2.5 h-2.5 shrink-0" style={{ color: dotHex }} />
              <span className="text-[10px] font-black truncate min-w-0">{nameLabel}</span>
            </div>
          )}

          {/* Merged % Badge */}
          <span
            className="px-1.5 py-0.2 rounded-md text-white text-[8.5px] font-black shadow-xs leading-tight shrink-0"
            style={{ backgroundColor: dotHex }}
          >
            {progress}%
          </span>
        </div>

        {/* 4 dots according to home color below name - glowing according to tokens captured */}
        <div className="flex items-center gap-1 mt-0.5">
          {[0, 1, 2, 3].map((dotIdx) => {
            const isGlowing = dotIdx < capturesCount;
            return (
              <span
                key={dotIdx}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isGlowing
                    ? 'shadow-[0_0_6px_currentColor] scale-110 animate-pulse'
                    : 'bg-white/20 opacity-40'
                }`}
                style={{
                  backgroundColor: isGlowing ? dotHex : undefined,
                  color: dotHex,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const counterRotationStyle = {
    transform: `rotate(${-boardRotation}deg)`,
    transformOrigin: 'center center',
  };

  // Progress % sits in the exact centre of each home: the gap between the four token slots.
  // Its size follows the board width (container query units) so it never touches a token.
  const renderHomePercent = (progress: number, hex: string, _side?: 'left' | 'right') => (
    <div
      className="home-pct absolute left-1/2 top-1/2 z-10 pointer-events-none flex items-center justify-center rounded-full font-black tabular-nums leading-none text-white"
      style={{ background: hex, transform: `translate(-50%, -50%) rotate(${-boardRotation}deg)` }}
    >
      {progress}%
    </div>
  );

  return (
    <div className="ludo-board-root absolute inset-0 w-full h-full select-none pointer-events-none overflow-hidden bg-[#0A0216]">
      {/* 1. TOP-LEFT: RED BASE (Rows 0-5, Cols 0-5 -> 40% x 40%) */}
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-gradient-to-br from-[#9f1239] via-[#881337] to-[#4c0519] border-r-2 border-b-2 border-rose-500/40 p-2 sm:p-2.5 flex items-center justify-center">
        <div className="relative w-full h-full rounded-2xl bg-[#140b12] border-2 border-rose-500/60 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] flex items-center justify-center">
          {redPlayer && renderHomePercent(redProgress, '#f43f5e', 'left')}
        </div>
      </div>

      {/* 2. TOP-RIGHT: BLUE BASE (Rows 0-5, Cols 9-14 -> 40% x 40%) */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-gradient-to-br from-[#1e40af] via-[#1e3a8a] to-[#0f172a] border-l-2 border-b-2 border-blue-500/40 p-2 sm:p-2.5 flex items-center justify-center">
        <div className="relative w-full h-full rounded-2xl bg-[#091124] border-2 border-blue-500/60 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] flex items-center justify-center">
          {bluePlayer && renderHomePercent(blueProgress, '#3b82f6', 'right')}
        </div>
      </div>

      {/* 3. BOTTOM-RIGHT: YELLOW BASE (Rows 9-14, Cols 9-14 -> 40% x 40%) */}
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-gradient-to-br from-[#b45309] via-[#92400e] to-[#451a03] border-l-2 border-t-2 border-amber-500/40 p-2 sm:p-2.5 flex items-center justify-center">
        <div className="relative w-full h-full rounded-2xl bg-[#1c1205] border-2 border-amber-500/60 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] flex items-center justify-center">
          {yellowPlayer && renderHomePercent(yellowProgress, '#f59e0b', 'right')}
        </div>
      </div>

      {/* 4. BOTTOM-LEFT: GREEN BASE (Rows 9-14, Cols 0-5 -> 40% x 40%) */}
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-gradient-to-br from-[#047857] via-[#065f46] to-[#022c22] border-r-2 border-t-2 border-emerald-500/40 p-2 sm:p-2.5 flex items-center justify-center">
        <div className="relative w-full h-full rounded-2xl bg-[#051811] border-2 border-emerald-500/60 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] flex items-center justify-center">
          {greenPlayer && renderHomePercent(greenProgress, '#10b981', 'left')}
        </div>
      </div>

      {/* 5. 4x4 CIRCULAR SOCKET RECEPTACLES (Precisely aligned with YARD_SLOT_COORDINATES) */}
      {(['red', 'blue', 'yellow', 'green'] as const).map((color) => {
        const slots = YARD_SLOT_COORDINATES[color];
        const socketColors = {
          red: 'bg-rose-500/15 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.25)]',
          blue: 'bg-blue-500/15 border-blue-500/50 shadow-[0_0_8px_rgba(56,189,248,0.25)]',
          yellow: 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_8px_rgba(251,191,36,0.25)]',
          green: 'bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_8px_rgba(52,211,153,0.25)]',
        }[color];

        const dotColors = {
          red: 'bg-rose-400/60',
          blue: 'bg-blue-400/60',
          yellow: 'bg-amber-400/60',
          green: 'bg-emerald-400/60',
        }[color];

        return slots.map((coord, sIdx) => (
          <div
            key={`dark_socket_${color}_${sIdx}`}
            style={{
              top: `${(coord.r / 15) * 100}%`,
              left: `${(coord.c / 15) * 100}%`,
              width: `${100 / 15}%`,
              height: `${100 / 15}%`,
            }}
            className="absolute flex items-center justify-center"
          >
            <div
              className={`w-[84%] h-[84%] max-w-[26px] max-h-[26px] rounded-full border-2 shadow-inner flex items-center justify-center ${socketColors}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${dotColors}`} />
            </div>
          </div>
        ));
      })}

      {/* 6. CENTER VICTORY HOME (Rows 6-8, Cols 6-8 -> 20% x 20%) */}
      <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-[#0f1422] border-2 border-amber-400/80 flex items-center justify-center overflow-hidden z-10 shadow-lg">
        {/* Left triangle: Red */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(0 0, 50% 50%, 0 100%)',
            background: 'linear-gradient(to right, #e11d48, #9f1239)',
          }}
        />
        {/* Top triangle: Blue */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 50% 50%)',
            background: 'linear-gradient(to bottom, #2563eb, #1e3a8a)',
          }}
        />
        {/* Right triangle: Yellow */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)',
            background: 'linear-gradient(to left, #f59e0b, #b45309)',
          }}
        />
        {/* Bottom triangle: Green */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)',
            background: 'linear-gradient(to top, #10b981, #065f46)',
          }}
        />
        {/* Golden Trophy Crown Rosette */}
        <div
          style={counterRotationStyle}
          className="relative z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.6)] flex items-center justify-center"
        >
          <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 fill-slate-950 drop-shadow" />
        </div>
      </div>

      {/* 7. TRACK AND HOME RUN CELLS (Clean dark cyberpunk / neon aesthetic) */}
      {Array.from({ length: 15 }).map((_, r) =>
        Array.from({ length: 15 }).map((_, c) => {
          const isBaseRed = r < 6 && c < 6;
          const isBaseBlue = r < 6 && c >= 9;
          const isBaseYellow = r >= 9 && c >= 9;
          const isBaseGreen = r >= 9 && c < 6;
          const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

          if (isBaseRed || isBaseBlue || isBaseYellow || isBaseGreen || isCenter) {
            return null;
          }

          const isSafe = safeCoordsMap.has(`${r}_${c}`);

          const isRedStart = r === 6 && c === 1;
          const isBlueStart = r === 1 && c === 8;
          const isYellowStart = r === 8 && c === 13;
          const isGreenStart = r === 13 && c === 6;

          const isRedHomeRun = r === 7 && c >= 1 && c <= 5;
          const isBlueHomeRun = c === 7 && r >= 1 && r <= 5;
          const isYellowHomeRun = r === 7 && c >= 9 && c <= 13;
          const isGreenHomeRun = c === 7 && r >= 9 && r <= 13;

          return (
            <div
              key={`darkcell_${r}_${c}`}
              style={{
                top: `${(r / 15) * 100}%`,
                left: `${(c / 15) * 100}%`,
                width: `${100 / 15}%`,
                height: `${100 / 15}%`,
              }}
              className={`absolute flex items-center justify-center border-r border-b border-[#222b3d] text-white transition-colors ${
                isRedStart
                  ? 'bg-[#e11d48] text-white font-black shadow-[inset_0_0_8px_rgba(225,29,72,0.6)]'
                  : isBlueStart
                  ? 'bg-[#2563eb] text-white font-black shadow-[inset_0_0_8px_rgba(37,99,235,0.6)]'
                  : isYellowStart
                  ? 'bg-[#f59e0b] text-white font-black shadow-[inset_0_0_8px_rgba(245,158,11,0.6)]'
                  : isGreenStart
                  ? 'bg-[#10b981] text-white font-black shadow-[inset_0_0_8px_rgba(16,185,129,0.6)]'
                  : isRedHomeRun
                  ? 'bg-[#e11d48]/90 text-white border-rose-400/30'
                  : isBlueHomeRun
                  ? 'bg-[#2563eb]/90 text-white border-blue-400/30'
                  : isYellowHomeRun
                  ? 'bg-[#f59e0b]/90 text-white border-amber-400/30'
                  : isGreenHomeRun
                  ? 'bg-[#10b981]/90 text-white border-emerald-400/30'
                  : 'bg-[#131926]'
              }`}
            >
              {isSafe && !isRedStart && !isBlueStart && !isYellowStart && !isGreenStart && (
                <div
                  style={counterRotationStyle}
                  className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.35)]"
                >
                  <span className="text-[10px] text-amber-300 font-bold leading-none select-none drop-shadow">
                    ⭐
                  </span>
                </div>
              )}
              {isRedStart && <span className="text-xs font-black drop-shadow">→</span>}
              {isBlueStart && <span className="text-xs font-black drop-shadow">↓</span>}
              {isYellowStart && <span className="text-xs font-black drop-shadow">←</span>}
              {isGreenStart && <span className="text-xs font-black drop-shadow">↑</span>}

              {/* Home-run guidance arrows */}
              {isRedHomeRun && c === 5 && <span className="text-xs font-black drop-shadow opacity-80">→</span>}
              {isBlueHomeRun && r === 5 && <span className="text-xs font-black drop-shadow opacity-80">↓</span>}
              {isYellowHomeRun && c === 9 && <span className="text-xs font-black drop-shadow opacity-80">←</span>}
              {isGreenHomeRun && r === 9 && <span className="text-xs font-black drop-shadow opacity-80">↑</span>}
            </div>
          );
        })
      )}
    </div>
  );
};
