import React, { useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Eye,
  Link2,
  Play,
  Plus,
  Share2,
  Users,
} from 'lucide-react';
import { GameState, LobbyPlayer, PlayerColor, PlayerProfile } from '../types/ludo';
import { COLOR_CONFIG, COLOR_TURN_ORDER } from '../utils/ludoConstants';
import { sound } from '../utils/soundEffects';
import { PlayerOnlineBadge } from './PlayerOnlineBadge';

interface LobbyRoomProps {
  gameState: GameState;
  user: PlayerProfile;
  theme: 'dark' | 'light';
  onSelectColor: (color: PlayerColor) => void;
  onToggleReady: () => void;
  onAddBot: () => void;
  onRemoveBot: (botId?: string) => void;
  onStartGame: () => void;
  onShareLink: (code: string) => void;
}

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  gameState,
  user,
  theme,
  onSelectColor,
  onToggleReady,
  onAddBot,
  onRemoveBot,
  onStartGame,
  onShareLink,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  const isLight = theme === 'light';

  const me = gameState.players.find((p) => p.id === user.id);
  const isHost = me?.isHost || false;
  const isSpectator = !me;

  const handleCopyCode = () => {
    sound.playClick();
    sound.hapticImpact('light');
    navigator.clipboard?.writeText(gameState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInviteLink = () => {
    sound.playClick();
    sound.hapticImpact('medium');

    const inviteUrl = `${window.location.origin}/?join=${gameState.code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
    }

    setIsBouncing(true);
    setCopiedLink(true);
    setShowToast(true);

    setTimeout(() => setIsBouncing(false), 700);
    setTimeout(() => setCopiedLink(false), 2500);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleShare = () => {
    sound.playClick();
    sound.hapticImpact('light');
    onShareLink(gameState.code);
  };

  const takenColors = new Map<PlayerColor, LobbyPlayer>();
  gameState.players.forEach((p) => takenColors.set(p.color, p));

  const allPlayersReady =
    gameState.players.length >= 2 &&
    gameState.players.every((p) => p.isReady || p.isHost || p.isBot);

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-4 relative">
      {/* Lobby Header Card (Tactile Claymorphic Surface & Glossy Badges) */}
      <div
        className={`rounded-3xl p-5 sm:p-6 border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isLight
            ? 'clay-card-light text-slate-800'
            : 'clay-card-dark text-slate-100'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-lg relative">
              <img
                src="/assets/mikasa-mascot.jpg"
                alt="Mikasa Mascot"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 text-xs">🎲</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-rose-500 font-black">
                Waiting Lobby
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-bold">
                Live Server
              </span>
            </div>

            <div className="flex items-center gap-3 mt-0.5">
              <h2
                className={`text-2xl sm:text-3xl font-black font-mono tracking-wider ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                #{gameState.code}
              </h2>
              <button
                onClick={handleCopyCode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 shadow-xs'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/10 text-slate-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          {/* Copy Invite Link button with bounce animation */}
          <button
            onClick={handleCopyInviteLink}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs ${
              isBouncing ? 'animate-bounce ring-2 ring-emerald-400' : ''
            } ${
              copiedLink
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                : isLight
                ? 'bg-gradient-to-r from-amber-50 to-rose-50 hover:from-amber-100 hover:to-rose-100 border-amber-300/80 text-slate-800'
                : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/10 text-slate-200'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 text-amber-500" />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95 border-t border-white/20"
          >
            <Share2 className="w-4 h-4" />
            <span>Invite via Telegram</span>
          </button>
        </div>
      </div>

      {/* Floating 'Copied!' Toast Notification */}
      {showToast && (
        <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/98 dark:bg-[#120722]/98 text-white shadow-2xl border border-emerald-500/50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
          </div>
          <div className="flex flex-col text-left pr-1">
            <span className="text-xs font-black flex items-center gap-1 text-emerald-400">
              Copied!
            </span>
            <span className="text-[11px] text-slate-300 font-medium">
              Invite link copied to clipboard. Share with your friends!
            </span>
          </div>
        </div>
      )}

      {/* Color Selection Strip (Tactile buttons) */}
      {!isSpectator && me && (
        <div
          className={`p-4 rounded-3xl border transition-all ${
            isLight
              ? 'clay-card-light text-slate-800'
              : 'clay-card-dark text-slate-100'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-2.5">
            <span>Select Your Token Color</span>
            <span className="text-[11px] font-normal">
              Current: <strong className="capitalize text-rose-500">{me.color}</strong>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {COLOR_TURN_ORDER.map((c) => {
              const occupant = takenColors.get(c);
              const isMine = me.color === c;
              const isOccupiedByOther = occupant && occupant.id !== me.id;
              const cfg = COLOR_CONFIG[c];

              return (
                <button
                  key={c}
                  disabled={Boolean(isOccupiedByOther)}
                  onClick={() => onSelectColor(c)}
                  className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                    isMine
                      ? `bg-gradient-to-br ${cfg.gradient} border-white text-white shadow-md ring-2 ring-amber-400/50`
                      : isOccupiedByOther
                      ? 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.05] opacity-40'
                      : isLight
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-white/[0.05] hover:bg-white/[0.08] border-white/10 text-slate-200'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow"
                    style={{ background: cfg.tokenGradient }}
                  />
                  <span className="text-[11px] font-bold capitalize truncate max-w-full">
                    {c}
                  </span>
                  {isOccupiedByOther && (
                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-full">
                      {occupant?.name.slice(0, 7)}
                    </span>
                  )}
                  {isMine && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-slate-900 flex items-center justify-center text-[10px] font-black shadow">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Player Slots Grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
          <span>PLAYERS ({gameState.players.length}/4)</span>
          {isHost && gameState.players.length < 4 && (
            <button
              onClick={() => {
                sound.playClick();
                onAddBot();
              }}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add AI Bot</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gameState.players.map((p) => {
            const cfg = COLOR_CONFIG[p.color];
            const isMe = p.id === user.id;

            // Individual Squad Color Styling
            const colorThemes = {
              red: isLight
                ? 'bg-gradient-to-r from-rose-50/90 via-pink-50/70 to-rose-100/50 border-rose-300 shadow-[0_4px_16px_rgba(244,63,94,0.1)]'
                : 'bg-gradient-to-r from-[#2c1220] via-[#200d17] to-[#14080f] border-rose-500/40 shadow-[0_4px_16px_rgba(244,63,94,0.15)]',
              green: isLight
                ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-100/50 border-emerald-300 shadow-[0_4px_16px_rgba(16,185,129,0.1)]'
                : 'bg-gradient-to-r from-[#0d261b] via-[#091c13] to-[#05120c] border-emerald-500/40 shadow-[0_4px_16px_rgba(16,185,129,0.15)]',
              yellow: isLight
                ? 'bg-gradient-to-r from-amber-50/90 via-yellow-50/70 to-amber-100/50 border-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.12)]'
                : 'bg-gradient-to-r from-[#2c1d0c] via-[#201509] to-[#140d05] border-amber-500/40 shadow-[0_4px_16px_rgba(245,158,11,0.18)]',
              blue: isLight
                ? 'bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-sky-100/50 border-sky-300 shadow-[0_4px_16px_rgba(56,189,248,0.1)]'
                : 'bg-gradient-to-r from-[#101d36] via-[#0c1527] to-[#070e1a] border-sky-500/40 shadow-[0_4px_16px_rgba(56,189,248,0.15)]',
            }[p.color];

            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between ${colorThemes} ${
                  isMe ? 'ring-2 ring-amber-400/70' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={
                        p.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`
                      }
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-2xl object-cover border-2 shadow-md"
                      style={{ borderColor: cfg.primary }}
                    />

                    {/* Small Glowing Dot Online / AFK / Offline indicator beside avatar */}
                    <div className="absolute -top-1 -right-1 bg-slate-950/90 rounded-full p-0.5 border border-white/20 shadow">
                      <PlayerOnlineBadge
                        status={p.onlineStatus || (p.isConnected ? 'online' : 'offline')}
                      />
                    </div>

                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow"
                      style={{ background: cfg.primary }}
                    />
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-black truncate max-w-[120px] ${
                          isLight ? 'text-slate-900' : 'text-slate-100'
                        }`}
                      >
                        {p.name}
                      </span>
                      {p.isHost && (
                        <span title="Lobby Host">
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        </span>
                      )}
                      {p.isBot && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase">
                          BOT
                        </span>
                      )}
                      {p.isBot && isHost && (
                        <button
                          onClick={() => {
                            sound.playClick();
                            onRemoveBot(p.id);
                          }}
                          className="ml-1 px-1.5 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-[9px] font-black uppercase cursor-pointer active:scale-95 transition-all"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] font-bold capitalize flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shadow-xs"
                        style={{ background: cfg.primary }}
                      />
                      <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{p.color} Squad</span>
                      {isMe && <span className="text-rose-500 font-extrabold">(You)</span>}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.isHost ? (
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center gap-1 shadow-xs">
                      <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Host
                    </span>
                  ) : p.isReady ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ready
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-white/[0.08] border border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-bold">
                      Waiting...
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty slot placeholders */}
          {Array.from({ length: 4 - gameState.players.length }).map((_, idx) => (
            <div
              key={'empty_' + idx}
              className={`p-3.5 rounded-2xl border border-dashed flex items-center justify-between ${
                isLight
                  ? 'border-slate-300 bg-slate-50/50'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl border border-dashed border-slate-300 dark:border-white/15 flex items-center justify-center text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-400">Open Slot</span>
                  <span className="text-[11px] text-slate-400">Invite friend or add bot</span>
                </div>
              </div>

              {isHost && (
                <button
                  onClick={() => {
                    sound.playClick();
                    onAddBot();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>+ Bot</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spectators Drawer */}
      {gameState.spectators.length > 0 && (
        <div
          className={`p-3 rounded-2xl border flex items-center gap-3 ${
            isLight
              ? 'clay-card-light'
              : 'clay-card-dark'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Eye className="w-4 h-4 text-purple-400" />
            <span>Spectating:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {gameState.spectators.map((s) => (
              <span
                key={s.id}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-[11px] font-medium"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-auto pt-2 flex flex-col sm:flex-row items-center gap-3">
        {!isHost && !isSpectator && me && (
          <button
            onClick={() => {
              sound.playClick();
              onToggleReady();
            }}
            className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95 shadow-md ${
              me.isReady
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {me.isReady ? '✓ You Are Ready (Tap to Unready)' : 'Ready Up!'}
          </button>
        )}

        {isHost && (
          <button
            onClick={() => {
              sound.playClick();
              onStartGame();
            }}
            disabled={!allPlayersReady}
            className={`w-full py-4 rounded-full font-black text-sm uppercase tracking-wider disabled:opacity-40 text-white transition-all duration-150 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 border-t border-white/30 ${
              isLight ? 'cta-button-light' : 'cta-button-dark'
            }`}
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              {gameState.players.length < 2
                ? 'Need At Least 2 Players (or Add Bot)'
                : allPlayersReady
                ? 'Start Match Now! 🎲'
                : 'Waiting for Players to Ready...'}
            </span>
          </button>
        )}

        {isSpectator && (
          <div className="w-full py-3.5 rounded-2xl border text-center text-xs font-semibold text-rose-500 bg-rose-500/10 border-rose-500/20">
            You are spectating this room. You can watch the live match and join the chat!
          </div>
        )}
      </div>
    </div>
  );
};
