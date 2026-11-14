import React, { useEffect, useState } from 'react';
import { Flame, Sparkles, Swords, Trophy } from 'lucide-react';
import { sound } from '../utils/soundEffects';

export interface GameMomentEvent {
  id: string;
  type: 'capture' | 'six' | 'home' | 'win';
  title: string;
  subtitle: string;
  color?: string;
}

export interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number; // percentage 10-90%
}

interface GameMomentBannerProps {
  moment: GameMomentEvent | null;
  floatingEmojis: FloatingEmoji[];
}

export const GameMomentBanner: React.FC<GameMomentBannerProps> = ({
  moment,
  floatingEmojis,
}) => {
  const [visibleMoment, setVisibleMoment] = useState<GameMomentEvent | null>(null);

  useEffect(() => {
    if (moment) {
      setVisibleMoment(moment);
      const timer = setTimeout(() => {
        setVisibleMoment(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [moment]);

  return (
    <>
      {/* Floating Emoji Reaction Fountain */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{
              left: `${item.x}%`,
              bottom: '15%',
            }}
            className="absolute text-4xl animate-float-up pointer-events-none drop-shadow-lg"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Dramatic Game Moment Banner */}
      {visibleMoment && (
        <div className="fixed top-[max(4.5rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 w-[calc(100vw-24px)] max-w-sm z-40 p-2 sm:p-3 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full min-w-0 rounded-2xl bg-slate-900/98 border-2 border-amber-400 p-2.5 sm:p-3.5 shadow-[0_12px_35px_rgba(0,0,0,0.7)] text-white flex items-center gap-2 sm:gap-3 overflow-hidden">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shrink-0 shadow-md">
              {visibleMoment.type === 'capture' ? (
                <Swords className="w-6 h-6 text-white animate-spin" />
              ) : visibleMoment.type === 'six' ? (
                <Flame className="w-6 h-6 text-amber-300 animate-pulse" />
              ) : visibleMoment.type === 'home' ? (
                <Sparkles className="w-6 h-6 text-amber-300 animate-bounce" />
              ) : (
                <Trophy className="w-6 h-6 text-amber-300" />
              )}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                {visibleMoment.title}
              </span>
              <span className="text-sm font-extrabold text-white leading-tight break-words line-clamp-2">
                {visibleMoment.subtitle}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
