import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Crown,
  Flame,
  History,
  Swords,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react';
import { PlayerProfile } from '../types/ludo';
import { sound } from '../utils/soundEffects';
import { PlayerOnlineBadge } from './PlayerOnlineBadge';

interface ProfileModalProps {
  user: PlayerProfile;
  theme: 'dark' | 'light';
  isOpen: boolean;
  onClose: () => void;
  onUpdateName: (newName: string, avatarUrl?: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  theme,
  isOpen,
  onClose,
  onUpdateName,
}) => {
  const [editingName, setEditingName] = useState(user.name);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    if (isOpen) {
      setEditingName(user.name);
      fetch('/api/matches')
        .then((r) => r.json())
        .then((d) => {
          if (d.matches) setRecentMatches(d.matches);
        })
        .catch(() => {});
    }
  }, [isOpen, user.name]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingName.trim()) {
      sound.playClick();
      onUpdateName(editingName.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    }
  };

  const winRate =
    user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-[24px] border p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto ${
          isLight
            ? 'clay-card-light text-slate-900'
            : 'clay-card-dark text-slate-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black tracking-tight">Player Profile &amp; Stats</h3>
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

        {/* User Card with glowing online indicator */}
        <div
          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-slate-50 border-slate-200 shadow-sm'
              : 'bg-white/[0.04] border-white/10 shadow-inner'
          }`}
        >
          <div className="relative">
            <img
              src={user.avatarUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
            />
            <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 border border-white/20">
              <PlayerOnlineBadge status="online" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-base">{user.name}</span>
              {user.isTelegram && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-500 dark:text-sky-400 text-[10px] font-bold border border-sky-500/25">
                  Telegram
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono mt-0.5">
              {user.username ? `@${user.username}` : `ID: ${user.id.slice(0, 10)}`}
            </span>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
              <Crown className="w-3 h-3 fill-amber-400" />
              <span>Grandmaster Ludo</span>
            </div>
          </div>
        </div>

        {/* Edit Display Name */}
        <form onSubmit={handleSave} className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-rose-500'
                  : 'bg-white/[0.05] border-white/15 text-white focus:border-amber-400'
              }`}
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedSuccess ? 'Saved!' : 'Save'}</span>
            </button>
          </div>
        </form>

        {/* Lifetime Statistics in Tactile Pods */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Career Records &amp; Statistics
          </span>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div
              className={`p-3 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-semibold">
                <Swords className="w-3.5 h-3.5 text-sky-400" /> Matches
              </span>
              <span className="text-lg font-black mt-0.5 block">{user.gamesPlayed}</span>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <span className="text-[11px] text-amber-400 flex items-center justify-center gap-1 font-semibold">
                <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" /> Wins
              </span>
              <span className="text-lg font-black text-amber-400 mt-0.5 block">
                {user.wins}
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <span className="text-[11px] text-rose-400 flex items-center justify-center gap-1 font-semibold">
                <Flame className="w-3.5 h-3.5 text-rose-400" /> Win Rate
              </span>
              <span className="text-lg font-black text-rose-500 mt-0.5 block">
                {winRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Recent Server Matches */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Recent Match History</span>
          </span>
          <div className="max-h-36 overflow-y-auto flex flex-col gap-2 pr-1">
            {recentMatches.length === 0 ? (
              <div
                className={`p-3.5 rounded-2xl border text-center text-xs text-slate-400 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
                }`}
              >
                No completed matches recorded yet.
              </div>
            ) : (
              recentMatches.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-rose-500 font-bold">#{m.code}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-medium">
                      Winner:{' '}
                      <strong className="capitalize text-amber-400">
                        {m.winnerColor}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(m.endedAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
