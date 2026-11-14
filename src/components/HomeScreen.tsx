import React, { useState } from 'react';
import {
  ChevronRight,
  Crown,
  Flame,
  History,
  KeyRound,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { PlayerProfile } from '../types/ludo';
import { sound } from '../utils/soundEffects';
import { PlayerOnlineBadge } from './PlayerOnlineBadge';

interface HomeScreenProps {
  user: PlayerProfile;
  theme: 'dark' | 'light';
  onCreateLobby: () => void;
  onJoinLobby: (code: string) => void;
  onQuickPractice: () => void;
  onOpenProfile: () => void;
  onOpenMatchHistory: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  theme,
  onCreateLobby,
  onJoinLobby,
  onQuickPractice,
  onOpenProfile,
  onOpenMatchHistory,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const isLight = theme === 'light';

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCodeInput.trim().toUpperCase();
    if (cleaned.length >= 4) {
      sound.playClick();
      setIsJoinModalOpen(false);
      onJoinLobby(cleaned);
    }
  };

  const winRate =
    user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full min-w-0 px-3 py-4 sm:p-6 flex flex-col gap-5 relative overflow-x-hidden">
      {/* Radiant Ambient Background Atmosphere & Playful Floating Motifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-rose-500/20 blur-[100px]" />
        <div className="absolute top-1/3 -right-16 w-88 h-88 rounded-full bg-amber-500/20 blur-[110px]" />
        <div className="absolute -bottom-20 left-1/4 w-96 h-96 rounded-full bg-purple-600/20 blur-[120px]" />

        {/* Playful Floating Stickers */}
        <span className="cute-sticker absolute top-10 left-3 text-amber-500/40 text-2xl animate-bounce">🎲</span>
        <span className="cute-sticker absolute top-40 right-4 text-rose-500/40 text-xl">⭐</span>
        <span className="cute-sticker absolute bottom-36 left-6 text-emerald-500/40 text-xl">🍀</span>
        <span className="cute-sticker absolute bottom-12 right-10 text-amber-500/40 text-2xl">👑</span>
        <span className="cute-sticker absolute top-2/3 left-4 text-blue-500/40 text-xl">✨</span>
      </div>

      {/* Hero Profile Podium Card (Tactile Claymorphism with Jewel/Gold Trim) */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 border ${
          isLight
            ? 'clay-card-light'
            : 'clay-card-dark'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {/* User Avatar with Glowing Online Indicator */}
            <div className="relative group cursor-pointer" onClick={onOpenProfile}>
              <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-amber-400 shadow-xl relative bg-amber-500/10">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Requirement 3: Small glowing dot beside player avatar */}
              <div className="absolute -bottom-1 -right-1 bg-slate-900/90 rounded-full p-1 border border-white/20 shadow-md">
                <PlayerOnlineBadge status="online" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start min-w-0 max-w-full">
                <h2
                  className={`text-xl sm:text-2xl font-black tracking-tight min-w-0 max-w-full break-words ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {user.name}
                </h2>
                {user.isTelegram && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-400/40 text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Telegram
                  </span>
                )}
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 font-medium max-w-full break-all">
                {user.username ? `@${user.username}` : `Player ID: ${user.id.slice(0, 8)}`}
              </span>

              {/* Ranking Badge & Quick Edit Button */}
              <div className="mt-3 flex items-center gap-2 justify-center sm:justify-start">
                <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/10 border border-amber-400/50 text-[11px] font-black text-amber-600 dark:text-amber-300 flex items-center gap-1.5 shadow-sm">
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Grandmaster Ludo
                </span>
                <button
                  onClick={() => {
                    sound.playClick();
                    onOpenProfile();
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Quick Statistics Strip in Distinct Pastel Candy & Jewel Pods */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full sm:w-auto min-w-0 max-w-full">
            {/* Matches Pod - Cyan */}
            <div
              className={`flex min-w-0 flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-gradient-to-br from-sky-50 to-blue-100/70 border-sky-200 text-sky-900 shadow-sm'
                  : 'bg-gradient-to-br from-[#101e38] to-[#0a1224] border-sky-500/35 text-sky-200 shadow-inner'
              }`}
            >
              <span className="text-[9px] sm:text-[11px] text-sky-600 dark:text-sky-400 flex items-center justify-center gap-1 font-bold leading-tight text-center min-w-0">
                <Swords className="w-3.5 h-3.5 text-sky-500" /> Matches
              </span>
              <span
                className={`text-lg font-black mt-0.5 ${
                  isLight ? 'text-sky-950' : 'text-sky-100'
                }`}
              >
                {user.gamesPlayed}
              </span>
            </div>

            {/* Wins Pod - Imperial Honey Gold */}
            <div
              className={`flex min-w-0 flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-gradient-to-br from-amber-50 to-yellow-100/70 border-amber-300 text-amber-900 shadow-sm'
                  : 'bg-gradient-to-br from-[#2c1d0b] to-[#180e04] border-amber-500/40 text-amber-200 shadow-inner'
              }`}
            >
              <span className="text-[9px] sm:text-[11px] text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 font-bold leading-tight text-center min-w-0">
                <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" /> Wins
              </span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{user.wins}</span>
            </div>

            {/* Win Rate Pod - Neon Ruby */}
            <div
              className={`flex min-w-0 flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-gradient-to-br from-rose-50 to-pink-100/70 border-rose-200 text-rose-900 shadow-sm'
                  : 'bg-gradient-to-br from-[#2d101c] to-[#18070f] border-rose-500/35 text-rose-200 shadow-inner'
              }`}
            >
              <span className="text-[9px] sm:text-[11px] text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1 font-bold leading-tight text-center min-w-0">
                <Flame className="w-3.5 h-3.5 text-rose-500" /> Win Rate
              </span>
              <span className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">{winRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Mode Action Tiles Grid (Tactile 3D Claymorphism & Color Pairings) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Create Custom Lobby - Vibrant Ruby Rose Theme */}
        <button
          onClick={() => {
            sound.playClick();
            onCreateLobby();
          }}
          className={`group p-5 rounded-3xl border-2 text-left transition-all duration-200 hover:-translate-y-1 active:translate-y-0.5 cursor-pointer flex flex-col justify-between ${
            isLight
              ? 'bg-gradient-to-br from-white via-rose-50/80 to-rose-100/60 border-rose-200 hover:border-rose-400 shadow-[0_12px_28px_rgba(244,63,94,0.12)] hover:shadow-[0_18px_36px_rgba(244,63,94,0.2)]'
              : 'bg-gradient-to-br from-[#2c1322] via-[#200e19] to-[#140810] border-rose-500/35 hover:border-rose-400 shadow-[0_14px_34px_rgba(225,29,72,0.18)]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/35 text-white border-t border-white/30">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 font-extrabold text-xs border border-rose-400/40 shadow-xs">
              Host Match
            </span>
          </div>

          <div>
            <h3
              className={`text-lg font-black tracking-tight ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}
            >
              Create Private Lobby
            </h3>
            <p className={`mt-1 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Generate a 6-letter room code, invite Telegram friends, pick squad colors, or battle with bots.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1.5 transition-transform">
            <span>Create Room</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        {/* Card 2: Join via Room Code - Vibrant Azure Sky Theme */}
        <button
          onClick={() => {
            sound.playClick();
            setIsJoinModalOpen(true);
          }}
          className={`group p-5 rounded-3xl border-2 text-left transition-all duration-200 hover:-translate-y-1 active:translate-y-0.5 cursor-pointer flex flex-col justify-between ${
            isLight
              ? 'bg-gradient-to-br from-white via-sky-50/80 to-blue-100/60 border-sky-200 hover:border-sky-400 shadow-[0_12px_28px_rgba(37,99,235,0.12)] hover:shadow-[0_18px_36px_rgba(37,99,235,0.2)]'
              : 'bg-gradient-to-br from-[#122038] via-[#0d1729] to-[#080e1c] border-sky-500/35 hover:border-sky-400 shadow-[0_14px_34px_rgba(37,99,235,0.18)]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/35 text-white border-t border-white/30">
              <KeyRound className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 font-extrabold text-xs border border-sky-400/40 shadow-xs">
              Join Code
            </span>
          </div>

          <div>
            <h3
              className={`text-lg font-black tracking-tight ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              }`}
            >
              Join via Code
            </h3>
            <p className={`mt-1 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Enter a friend&apos;s invite code to jump directly into their waiting lobby or spectate live.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-1.5 transition-transform">
            <span>Enter Room</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Featured Instant Match Card (Repositioned at Last Below Host & Join) */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 border transition-all duration-300 ${
          isLight
            ? 'bg-gradient-to-r from-amber-100 via-orange-50 to-rose-100 border-2 border-amber-300/80 shadow-[0_14px_32px_rgba(245,158,11,0.18)]'
            : 'bg-gradient-to-r from-[#2c1d10] via-[#22141c] to-[#180e28] border-2 border-amber-500/40 shadow-[0_16px_38px_rgba(245,158,11,0.22)]'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-lg relative bg-amber-500/20">
                <img
                  src="/assets/mikasa-mascot.jpg"
                  alt="Mikasa Companion"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 text-sm">⚔️</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start min-w-0 max-w-full">
                <span
                  className={`text-base font-black ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Instant Match Arena
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-400/50 shadow-xs">
                  Instant Play
                </span>
              </div>
              <p className={`text-xs mt-1 max-w-md leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Jump straight into a 4-player competitive match loaded with smart AI bots. No waiting for friends!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onQuickPractice();
            }}
            className={`w-full sm:w-auto px-7 py-3 rounded-full font-black text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
              isLight ? 'cta-button-light' : 'cta-button-dark'
            }`}
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Instant Match</span>
          </button>
        </div>
      </div>

      {/* Secondary Row: Match Records & Features Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <button
          onClick={() => {
            sound.playClick();
            onOpenMatchHistory();
          }}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 ${
            isLight
              ? 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-amber-300/80 text-amber-900 shadow-[0_4px_14px_rgba(245,158,11,0.15)]'
              : 'bg-gradient-to-r from-[#1e152d] to-[#140e1f] hover:from-[#281c3b] hover:to-[#1b132a] border-purple-500/30 text-purple-200 shadow-[0_4px_14px_rgba(168,85,247,0.15)]'
          }`}
        >
          <History className="w-4 h-4 text-amber-500" />
          <span>View Match History &amp; Records</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-semibold flex-wrap justify-center">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Fair Dice RNG
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Live 20s Turns
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <Zap className="w-4 h-4 text-purple-400" />
            Instant Bot Fill
          </span>
        </div>
      </div>

      {/* Join Code Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-[24px] p-6 shadow-2xl flex flex-col gap-4 border ${
              isLight
                ? 'clay-card-light text-slate-900'
                : 'clay-card-dark text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-500" />
                <span>Join with Room Code</span>
              </h3>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter the 6-character room code shared by your friend:
            </p>

            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. MIKASA"
                className={`w-full px-4 py-3.5 rounded-2xl border text-center text-2xl font-mono font-bold tracking-widest uppercase focus:outline-none transition-all ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                    : 'bg-[#1a1f30] border-white/15 text-white focus:border-blue-400 shadow-inner'
                }`}
              />

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinCodeInput.trim().length < 4}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-blue-600/30 cursor-pointer disabled:cursor-not-allowed"
                >
                  Enter Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
