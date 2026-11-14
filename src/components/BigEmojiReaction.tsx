import React, { useEffect, useState } from 'react';
import { QuickReactionEvent } from '../types/ludo';

export const QUICK_EMOJIS = ['😭', '😂', '😡', '😘', '🥀', '🤡', '🖕', '😱'] as const;
export type QuickEmoji = (typeof QUICK_EMOJIS)[number];

interface BigEmojiReactionProps {
  reaction: QuickReactionEvent | null;
  onFinished?: () => void;
}

export const BigEmojiReaction: React.FC<BigEmojiReactionProps> = ({ reaction, onFinished }) => {
  const [activeItem, setActiveItem] = useState<QuickReactionEvent | null>(null);
  const [stage, setStage] = useState<'enter' | 'active' | 'exit'>('enter');

  useEffect(() => {
    if (!reaction) return;

    setActiveItem(reaction);
    setStage('enter');

    const activeTimer = setTimeout(() => {
      setStage('active');
    }, 120);

    const exitTimer = setTimeout(() => {
      setStage('exit');
    }, 2000);

    const doneTimer = setTimeout(() => {
      setActiveItem(null);
      onFinished?.();
    }, 2400);

    return () => {
      clearTimeout(activeTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [reaction, onFinished]);

  if (!activeItem) return null;

  const emoji = activeItem.emoji;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center px-3 py-[max(12px,env(safe-area-inset-top))] overflow-hidden select-none">
      {/* Centered bounded modal reaction area - guaranteed never to overflow or overlap */}
      <div
        className={`relative flex flex-col items-center justify-center w-[min(78vw,260px)] max-h-[min(72dvh,480px)] transition-all duration-300 ease-out pointer-events-none ${
          stage === 'enter'
            ? 'scale-50 opacity-0 -translate-y-4'
            : stage === 'active'
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-90 opacity-0 -translate-y-8'
        }`}
      >
        {/* Tactile Ambient Glow Backdrop */}
        <div
          className={`absolute w-32 h-32 rounded-full -z-10 transition-opacity ${
            emoji === '😡'
              ? 'bg-rose-600/35'
              : emoji === '😭'
              ? 'bg-sky-500/30'
              : emoji === '😘'
              ? 'bg-pink-500/35'
              : emoji === '🥀'
              ? 'bg-rose-950/40'
              : emoji === '🤡'
              ? 'bg-amber-500/35'
              : emoji === '🖕'
              ? 'bg-purple-600/35'
              : emoji === '😱'
              ? 'bg-indigo-600/35'
              : 'bg-yellow-400/30'
          }`}
        />

        {/* Spacious Reaction Stage Box with Claymorphic Frame */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 max-w-full max-h-full rounded-[24px] bg-slate-950/80 border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex items-center justify-center">
          {/* 1. CRYING TEAR WATERFALL - clean side drops without overlapping face */}
          {emoji === '😭' && (
            <div className="relative flex items-center justify-center w-full h-full">
              <span className="text-5xl sm:text-6xl animate-bounce drop-shadow-xl select-none">😭</span>
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-lg text-blue-400 animate-pulse">💧</span>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-blue-400 animate-pulse [animation-delay:200ms]">💧</span>
            </div>
          )}

          {/* 2. LAUGHING JOYFUL BOUNCE - spacious sparkles on corners */}
          {emoji === '😂' && (
            <div className="relative flex items-center justify-center w-full h-full">
              <span className="text-5xl sm:text-6xl animate-[spin_1.5s_ease-in-out_infinite] [animation-direction:alternate] drop-shadow-xl select-none">
                😂
              </span>
              <span className="absolute top-2 right-2 text-xl animate-ping">✨</span>
              <span className="absolute bottom-2 left-2 text-lg animate-bounce">💦</span>
            </div>
          )}

          {/* 3. ANGRY RAGE FLAME EXPLOSION - framed fire overhead */}
          {emoji === '😡' && (
            <div className="relative flex items-center justify-center w-full h-full">
              <span className="text-5xl sm:text-6xl animate-[shake_0.4s_ease-in-out_infinite] drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] select-none">
                😡
              </span>
              <span className="absolute top-1.5 left-3 text-xl animate-bounce">🔥</span>
              <span className="absolute top-1.5 right-3 text-xl animate-bounce [animation-delay:150ms]">🔥</span>
            </div>
          )}

          {/* 4. KISSING FLOATING HEARTS - clean upper orbit */}
          {emoji === '😘' && (
            <div className="relative flex items-center justify-center w-full h-full">
              <span className="text-5xl sm:text-6xl animate-pulse drop-shadow-xl select-none">😘</span>
              <span className="absolute top-2 right-2 text-xl animate-bounce text-pink-400">💖</span>
              <span className="absolute bottom-2 left-2 text-lg animate-pulse text-rose-300">💕</span>
            </div>
          )}

          {/* 5. WILTED ROSE - serene side petals */}
          {emoji === '🥀' && (
            <div className="relative flex items-center justify-center w-full h-full">
              <span className="text-5xl sm:text-6xl animate-[wiggle_1.2s_ease-in-out_infinite] drop-shadow-xl select-none">
                🥀
              </span>
              <span className="absolute left-3 bottom-3 text-lg animate-bounce text-rose-500">🍃</span>
              <span className="absolute right-3 top-3 text-lg animate-pulse text-rose-400">🍂</span>
            </div>
          )}

          {/* 6. CLOWN PARTY POP - clean corner confetti */}
          {emoji === '🤡' && (
            <div className="relative flex items-center justify-center w-full h-full">
              <span className="text-5xl sm:text-6xl animate-[bounce_0.8s_infinite] drop-shadow-xl select-none">
                🤡
              </span>
              <span className="absolute top-2 left-2 text-lg animate-spin">🎉</span>
              <span className="absolute top-2 right-2 text-lg animate-pulse">🎊</span>
            </div>
          )}

          {/* 7. COMIC REACTION */}
          {emoji === '🖕' && (
            <div className="relative flex items-center justify-center w-full h-full">
              <span className="text-5xl sm:text-6xl animate-[pulse_0.6s_ease-in-out_infinite] drop-shadow-[0_0_20px_rgba(168,85,247,0.7)] select-none">
                🖕
              </span>
              <span className="absolute top-2 right-2 text-lg animate-ping">💥</span>
              <span className="absolute bottom-2 left-2 text-lg animate-bounce text-amber-400">⚡</span>
            </div>
          )}

          {/* 8. SHOCKED SCREAMING SHOCKWAVE */}
          {emoji === '😱' && (
            <div className="relative flex items-center justify-center w-full h-full">
              <span className="text-5xl sm:text-6xl animate-[shake_0.3s_ease-in-out_infinite] drop-shadow-[0_0_20px_rgba(99,102,241,0.8)] select-none">
                😱
              </span>
              <span className="absolute top-2 left-2 text-lg animate-ping text-cyan-300">⚡</span>
              <span className="absolute bottom-2 right-2 text-lg animate-bounce text-indigo-300">🌀</span>
            </div>
          )}
        </div>

        {/* Sender identification pill cleanly separated below */}
        <div className="mt-2 max-w-full min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/95 border border-white/20 text-white shadow-xl">
          <img
            src={
              activeItem.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${activeItem.senderId}`
            }
            alt={activeItem.senderName}
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-full object-cover border border-amber-400 shrink-0"
          />
          <span className="text-xs font-black truncate min-w-0 max-w-[min(42vw,130px)]">
            {activeItem.senderName}
          </span>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            reacted
          </span>
        </div>
      </div>
    </div>
  );
};
