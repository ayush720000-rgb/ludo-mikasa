import { BOT_HANDLE } from '../utils/botConfig';
import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Check,
  Crown,
  Download,
  Flame,
  Home,
  Image as ImageIcon,
  RotateCcw,
  Share2,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { GameState, PlayerProfile } from '../types/ludo';
import { COLOR_CONFIG } from '../utils/ludoConstants';
import { generatePersonalizedMatchResult } from '../utils/matchResultCanvas';
import { buildMatchShareCaption } from '../utils/shareCaption';
import { sound } from '../utils/soundEffects';

interface VictoryModalProps {
  gameState: GameState;
  currentUser: PlayerProfile;
  theme: 'dark' | 'light';
  onRematch: () => void;
  onReturnHome: () => void;
  onCreateLobby: () => void;
}

const SESSION_STORAGE_KEY = 'mikasa_telegram_session';

function readStoredSessionToken(): string {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

// Ask the server to re-verify the current WebView initData and issue a fresh session token.
async function refreshSessionToken(initData: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || typeof data?.sessionToken !== 'string') return false;
    try { localStorage.setItem(SESSION_STORAGE_KEY, data.sessionToken); } catch { /* storage unavailable */ }
    return true;
  } catch {
    return false;
  }
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  gameState,
  currentUser,
  theme,
  onRematch,
  onReturnHome,
  onCreateLobby,
}) => {
  const winner = gameState.players.find((p) => p.color === gameState.winnerColor);
  const colorCfg = gameState.winnerColor ? COLOR_CONFIG[gameState.winnerColor] : null;
  const isMeWinner = winner?.id === currentUser.id;
  const myPlayer = gameState.players.find((p) => p.id === currentUser.id);
  const myRank = myPlayer?.rank || (isMeWinner ? 1 : 2);
  const isLight = theme === 'light';

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'image' | 'podium'>('image');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Trigger Victory or Defeat celebration animation
  useEffect(() => {
    if (isMeWinner) {
      sound.playVictory();
      // Continuous multi-cannon confetti blast for victory
      const duration = 3.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 60,
          origin: { x: 0.05, y: 0.65 },
          colors: ['#fbbf24', '#f59e0b', '#e11d48', '#2563eb', '#10b981'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 60,
          origin: { x: 0.95, y: 0.65 },
          colors: ['#fbbf24', '#f59e0b', '#e11d48', '#2563eb', '#10b981'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else {
      // Play smooth defeat audio
      sound.playDefeat();
      // Gentle subtle falling stars for loss
      confetti({
        particleCount: 25,
        spread: 45,
        startVelocity: 15,
        gravity: 0.8,
        origin: { x: 0.5, y: 0.2 },
        colors: ['#94a3b8', '#64748b', '#cbd5e1', '#38bdf8'],
      });
    }
  }, [isMeWinner]);

  // Generate Personalized Match Result Image on Mount
  useEffect(() => {
    let isCancelled = false;
    setIsGenerating(true);

    generatePersonalizedMatchResult({
      matchCode: gameState.code,
      durationSeconds: gameState.stats.durationSeconds,
      players: [...gameState.players, ...(gameState.departedPlayers || []).filter((departed) => !gameState.players.some((active) => active.id === departed.id))],
      botUsername: BOT_HANDLE,
    })
      .then((imgDataUrl) => {
        if (!isCancelled) {
          setGeneratedImageUrl(imgDataUrl);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate match result image:', err);
        if (!isCancelled) {
          setIsGenerating(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [gameState]);

  // Handle Download Action
  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    sound.playClick();
    sound.hapticImpact('medium');

    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `LudoBot-Match-${gameState.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const notify = (message: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.showAlert) tg.showAlert(message);
    else window.alert(message);
  };

  const markShared = () => {
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const postJson = async (url: string, body: object) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, data: (await r.json().catch(() => ({}))) as any };
  };

  // Route 1: Telegram's native chat picker with the image and the formatted caption.
  // Returns 'sent' | 'cancelled', or 'unavailable' so the caller can fall back to a hosted link.
  const shareViaPreparedMessage = async (tg: any, imageBase64: string): Promise<'sent' | 'cancelled' | 'unavailable'> => {
    if (typeof tg.shareMessage !== 'function') return 'unavailable';
    const payload = () => ({
      initData: tg.initData || '',
      sessionToken: readStoredSessionToken(),
      imageBase64,
      caption: buildMatchShareCaption(gameState, 'html'),
      parseMode: 'HTML',
    });
    try {
      let prepared = await postJson('/api/results/prepare-share', payload());
      if (!prepared.data.preparedMessageId && tg.initData && (await refreshSessionToken(tg.initData))) {
        prepared = await postJson('/api/results/prepare-share', payload());
      }
      if (!prepared.ok || !prepared.data.preparedMessageId) return 'unavailable';
      const sent = await new Promise<boolean>((resolve, reject) => {
        try {
          tg.shareMessage(prepared.data.preparedMessageId, (ok: boolean) => resolve(Boolean(ok)));
        } catch (err) {
          reject(err);
        }
      });
      return sent ? 'sent' : 'cancelled';
    } catch {
      return 'unavailable';
    }
  };

  // Route 2: host the image on this server and open Telegram's share sheet with the link.
  // Telegram renders the link as an image preview with the match text. No bot token involved.
  const shareViaHostedLink = async (tg: any, imageBase64: string): Promise<boolean> => {
    const text = buildMatchShareCaption(gameState, 'text');
    const hosted = await postJson('/api/results/host', { imageBase64, caption: text });
    if (!hosted.ok || !hosted.data.url) return false;
    const link = `https://t.me/share/url?url=${encodeURIComponent(hosted.data.url)}&text=${encodeURIComponent(text)}`;
    if (typeof tg.openTelegramLink === 'function') tg.openTelegramLink(link);
    else window.open(link, '_blank');
    return true;
  };

  const handleShare = async () => {
    if (!generatedImageUrl || isGenerating || isSharing) return;
    sound.playClick();
    sound.hapticImpact('medium');
    setIsSharing(true);
    try {
      // generatedImageUrl is a data URL: everything after the first comma is the base64 PNG.
      const imageBase64 = generatedImageUrl.slice(generatedImageUrl.indexOf(',') + 1);
      const tg = (window as any).Telegram?.WebApp;

      if (tg) {
        const viaMessage = await shareViaPreparedMessage(tg, imageBase64);
        if (viaMessage === 'sent') return markShared();
        if (viaMessage === 'cancelled') return;
        if (await shareViaHostedLink(tg, imageBase64)) return markShared();
        notify('Sharing is not available right now. Please try again in a moment.');
        return;
      }

      // Outside Telegram: system share sheet with the image, or a plain download.
      const blob = await (await fetch(generatedImageUrl)).blob();
      const file = new File([blob], `Mikasa-Ludo-Results-${gameState.code}.png`, { type: 'image/png' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: 'Mikasa Ludo Results', text: buildMatchShareCaption(gameState, 'text') });
      } else {
        const link = document.createElement('a');
        link.href = generatedImageUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      // Closing the system share sheet is not an error.
      if ((err as any)?.name !== 'AbortError') notify('Could not share the result. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  // Rank title formatting for the current user
  const userRankTitle = isMeWinner
    ? '🏆 VICTORY! CHAMPION'
    : myRank === 2
    ? '🥈 RUNNER UP - GREAT EFFORT!'
    : myRank === 3
    ? '🥉 3RD PLACE - WELL PLAYED!'
    : '💜 4TH PLACE - NICE TRY!';

  const userRankSubtitle = isMeWinner
    ? 'You dominated the board and guided all pawns home!'
    : 'A hard-fought match! Claim your revenge in the next round!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 animate-in fade-in duration-200 overflow-y-auto">
      <div
        className={`w-full max-w-xl rounded-[24px] border-2 p-4 sm:p-6 shadow-2xl flex flex-col items-center text-center relative my-auto max-h-[92vh] overflow-y-auto ${
          isLight
            ? 'clay-card-light text-slate-900 border-amber-300'
            : 'clay-card-dark text-slate-100 border-amber-500/50'
        }`}
      >
        {/* Animated Banner Header */}
        <div className="relative flex flex-col items-center mb-3">
          {/* Top Crown / Defeat Icon with radiant pulse */}
          <div className="relative mb-2">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transition-transform duration-300 ${
                isMeWinner
                  ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 ring-4 ring-amber-400/40 shadow-amber-500/40 animate-bounce'
                  : 'bg-gradient-to-tr from-slate-600 via-slate-500 to-slate-700 ring-4 ring-slate-500/30 shadow-slate-900/50'
              }`}
            >
              {isMeWinner ? (
                <Crown className="w-9 h-9 text-slate-950 fill-slate-950 drop-shadow" />
              ) : (
                <Trophy className="w-8 h-8 text-amber-300" />
              )}
            </div>
          </div>

          <span
            className={`text-xs font-black uppercase tracking-widest ${
              isMeWinner ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            {userRankTitle}
          </span>
          <h2
            className={`text-2xl sm:text-3xl font-black mt-0.5 tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isMeWinner ? 'You Claimed The Victory! 🎉' : `${winner?.name || 'Player'} Won!`}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-sm font-medium">
            {userRankSubtitle}
          </p>
        </div>

        {/* View Switcher Tabs: "Match Result Card" vs "Stats Overview" */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/30 border border-white/10 mb-4 select-none">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'image'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Match Result Image</span>
          </button>
          <button
            onClick={() => setActiveTab('podium')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'podium'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Podium Rankings</span>
          </button>
        </div>

        {/* TAB 1: Generated Personalized Match Result Image Card */}
        {activeTab === 'image' && (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-2xl bg-black/60 flex items-center justify-center group">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <div className="w-10 h-10 rounded-full border-3 border-amber-400 border-t-transparent animate-spin" />
                  <span className="text-xs font-bold text-amber-300">
                    Generating Official Match Card...
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Rendering 4-player podium &amp; statistics
                  </span>
                </div>
              ) : generatedImageUrl ? (
                <img
                  src={generatedImageUrl}
                  alt="Personalized Match Result"
                  className="w-full h-full object-contain select-none"
                />
              ) : (
                <div className="text-xs text-rose-400">
                  Failed to render image card preview
                </div>
              )}
            </div>

            {/* Functional Share & Download Buttons OUTSIDE the generated image */}
            <div className="w-full grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={handleDownloadImage}
                disabled={!generatedImageUrl || isGenerating}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-t border-white/20"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Saved PNG!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PNG</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                disabled={!generatedImageUrl || isGenerating || isSharing}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-rose-500/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-t border-white/20"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Image Sent!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>{isSharing ? 'Opening…' : 'Share Result'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Podium Breakdown & Statistics */}
        {activeTab === 'podium' && (
          <div className="w-full flex flex-col gap-3">
            {/* 4 Player Rankings Strip */}
            <div className="flex flex-col gap-2">
              {[...gameState.players]
                .sort((a, b) => (a.rank || 4) - (b.rank || 4))
                .slice(0, 4)
                .map((p, idx) => {
                  const rankPos = idx + 1;
                  const rankTheme = {
                    1: { bg: 'bg-amber-500/20', border: 'border-amber-400', badge: 'bg-amber-500 text-slate-950', title: '1st - Champion' },
                    2: { bg: 'bg-slate-500/20', border: 'border-slate-300', badge: 'bg-slate-300 text-slate-950', title: '2nd - Runner Up' },
                    3: { bg: 'bg-orange-500/20', border: 'border-orange-400', badge: 'bg-orange-500 text-white', title: '3rd Place' },
                    4: { bg: 'bg-purple-500/20', border: 'border-purple-400', badge: 'bg-purple-500 text-white', title: '4th Place' },
                  }[rankPos] || { bg: 'bg-slate-800', border: 'border-slate-700', badge: 'bg-slate-600 text-white', title: `${rankPos}th Place` };

                  const isMe = p.id === currentUser.id;

                  return (
                    <div
                      key={p.id + '_' + idx}
                      className={`flex items-center justify-between p-3 rounded-2xl border ${rankTheme.bg} ${rankTheme.border} transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shadow ${rankTheme.badge}`}>
                          #{rankPos}
                        </span>
                        <img
                          src={p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`}
                          alt={p.name}
                          className="w-9 h-9 rounded-xl object-cover border border-white/20"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded font-black text-[9px] bg-rose-500 text-white">
                                YOU
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {rankTheme.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-amber-400 font-mono">
                          {p.score || 250} pts
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.gamesWon ?? 1}W / {p.totalGames ?? 4}G
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Overall Match Stats */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div
                className={`p-3 rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181d2a] border-white/10'
                }`}
              >
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <RotateCcw className="w-3 h-3 text-purple-400" /> Turns
                </span>
                <span className="text-base font-black mt-0.5 block">
                  {gameState.stats.turnsCount}
                </span>
              </div>
              <div
                className={`p-3 rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181d2a] border-white/10'
                }`}
              >
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Swords className="w-3 h-3 text-rose-400" /> Captures
                </span>
                <span className="text-base font-black text-rose-500 mt-0.5 block">
                  {gameState.stats.totalCaptures}
                </span>
              </div>
              <div
                className={`p-3 rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181d2a] border-white/10'
                }`}
              >
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Sixes
                </span>
                <span className="text-base font-black text-amber-500 mt-0.5 block">
                  {gameState.stats.totalSixes}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Game Navigation Controls */}
        <div className="w-full mt-4 flex flex-col gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => {
              sound.playClick();
              onRematch();
            }}
            className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-lg shadow-rose-500/25 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 border-t border-white/30"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again (Rematch)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onReturnHome();
            }}
            className={`w-full py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Lobby / Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
