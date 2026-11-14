import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Crown,
  Flame,
  History,
  RotateCcw,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { COLOR_CONFIG } from '../utils/ludoConstants';
import { sound } from '../utils/soundEffects';

interface MatchHistoryModalProps {
  isOpen: boolean;
  theme: 'dark' | 'light';
  onClose: () => void;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
  isOpen,
  theme,
  onClose,
}) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const isLight = theme === 'light';

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/matches')
        .then((r) => r.json())
        .then((data) => {
          if (data.matches) {
            setMatches(data.matches);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-[24px] border p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden ${
          isLight
            ? 'clay-card-light text-slate-900'
            : 'clay-card-dark text-slate-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-md font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight">Match History &amp; Champions</h3>
              <p className="text-[11px] text-slate-400">
                Track previous games, champions, and battle statistics
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">
              Loading match records...
            </div>
          ) : matches.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-400/40" />
              <span>No finished matches recorded yet. Finish a game to see records!</span>
            </div>
          ) : (
            matches.map((match) => {
              const winnerColorCfg = COLOR_CONFIG[match.winnerColor as keyof typeof COLOR_CONFIG];
              const winnerPlayer = match.players?.find((p: any) => p.color === match.winnerColor);

              return (
                <div
                  key={match.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-rose-500">
                        #{match.code}
                      </span>
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(match.endedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-black capitalize flex items-center gap-1 border"
                      style={{
                        background: winnerColorCfg ? `${winnerColorCfg.primary}18` : '#f59e0b18',
                        color: winnerColorCfg ? winnerColorCfg.primary : '#f59e0b',
                        borderColor: winnerColorCfg ? `${winnerColorCfg.primary}40` : '#f59e0b40',
                      }}
                    >
                      <Crown className="w-3 h-3" />
                      {match.winnerColor} Won
                    </span>
                  </div>

                  {/* Winner highlight */}
                  <div className="flex items-center gap-3 my-2">
                    <img
                      src={
                        winnerPlayer?.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${winnerPlayer?.id || 'win'}`
                      }
                      alt={winnerPlayer?.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border-2 shadow"
                      style={{ borderColor: winnerColorCfg ? winnerColorCfg.primary : '#fbbf24' }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold leading-none">
                        {winnerPlayer?.name || 'Champion'}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize mt-1">
                        {match.winnerColor} Squad Leader
                      </span>
                    </div>
                  </div>

                  {/* Match summary stats row */}
                  {match.stats && (
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-400 font-medium">
                        <RotateCcw className="w-3 h-3 text-purple-400" />
                        <span>{match.stats.turnsCount} Turns</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 font-medium">
                        <Swords className="w-3 h-3 text-rose-400" />
                        <span>{match.stats.totalCaptures} Captures</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 font-medium">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>{match.stats.totalSixes} Sixes</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
