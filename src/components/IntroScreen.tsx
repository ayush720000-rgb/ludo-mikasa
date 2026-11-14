import { BOT_HANDLE } from '../utils/botConfig';
import React, { useEffect, useState } from 'react';
import { Crown, Heart, Sparkles, Trophy } from 'lucide-react';
import { PlayerProfile } from '../types/ludo';
import { sound } from '../utils/soundEffects';

interface IntroScreenProps {
  user: PlayerProfile;
  theme: 'dark' | 'light';
  onEnter: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ user, theme, onEnter }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    const soundTimer = setTimeout(() => {
      sound.playTurnStart();
    }, 400);

    return () => clearTimeout(soundTimer);
  }, []);

  const handleStart = () => {
    sound.playClick();
    setIsFadingOut(true);
    setTimeout(() => {
      onEnter();
    }, 450);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 transition-all duration-500 overflow-hidden ${
        isLight
          ? 'bg-[#F4F6FB] text-[#0E1726]'
          : 'bg-gradient-to-b from-[#160226] via-[#0b0114] to-[#030007] text-white'
      } ${
        isFadingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Soft Ambient Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[110px] ${isLight ? 'bg-pink-500/10' : 'bg-purple-600/15'}`} />
        <div className={`absolute -bottom-10 left-1/3 w-80 h-80 rounded-full blur-[100px] ${isLight ? 'bg-orange-500/10' : 'bg-cyan-500/10'}`} />
      </div>

      {/* Top Telegram Verified Badge */}
      <div
        className={`relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border shadow-xs ${
          isLight
            ? 'fake-glass-light text-[#0E1726]'
            : 'fake-glass-dark text-slate-200'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>Telegram Official · {BOT_HANDLE}</span>
      </div>

      {/* Center Hero Card with Mascot Illustration */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md my-auto w-full">
        {/* Animated Mascot Art Frame */}
        <div className="relative mb-4 group cursor-pointer" onClick={() => sound.playDiceRoll()}>
          <div className="absolute -inset-2 bg-gradient-to-r from-rose-500/40 via-amber-400/30 to-purple-600/40 rounded-3xl blur-lg animate-pulse" />

          {/* Actual Mascot Image uploaded by User */}
          <div className="relative w-72 sm:w-80 h-44 sm:h-48 rounded-[24px] overflow-hidden border-2 border-amber-400/80 shadow-2xl transform hover:scale-[1.02] transition-transform duration-300">
            <img
              src="/assets/mikasa-mascot.jpg"
              alt="Mikasa Playing Ludo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            {/* Subtle gloss sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />

            {/* Mascot Dialogue Bubble */}
            <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-white drop-shadow">
              <span className="text-[11px] font-bold flex items-center gap-1 bg-black/80 px-2.5 py-1 rounded-full border border-white/20">
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                Mikasa is waiting for you!
              </span>
              <span className="text-[11px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow">
                🎲 Roll Now
              </span>
            </div>
          </div>

          {/* Floating animated crown */}
          <div className="absolute -top-3.5 -right-3 w-8 h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-slate-950 shadow-lg animate-bounce">
            <Crown className="w-4 h-4 fill-slate-950" />
          </div>
        </div>

        {/* Cinematic Title Requested by User: "Welcome to Mikasa" */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-rose-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Welcome to
          </span>
          <h1
            className={`text-3xl sm:text-4xl font-black tracking-tight mt-1 ${
              isLight ? 'text-[#0E1726]' : 'text-white'
            }`}
          >
            Welcome to Mikasa 🎲
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 max-w-xs font-medium">
            Join Mikasa at the table for real-time multiplayer Ludo with friends and smart AI bots!
          </p>
        </div>

        {/* Player preview card */}
        <div
          className={`mt-4 flex items-center gap-3 px-4 py-2 rounded-[20px] ${
            isLight ? 'clay-card-light' : 'clay-card-dark'
          }`}
        >
          <img
            src={user.avatarUrl}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border-2 border-rose-500"
          />
          <div className="text-left">
            <span
              className={`text-xs font-bold block ${
                isLight ? 'text-[#0E1726]' : 'text-white'
              }`}
            >
              {user.name}
            </span>
            <span className="text-[10px] text-slate-400">
              {user.username ? `@${user.username}` : 'Challenger'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Start Action Button with Tactile 3D feel */}
      <div className="relative z-10 w-full max-w-xs mb-3">
        <button
          onClick={handleStart}
          className={`w-full py-4 px-6 rounded-[20px] font-black text-sm tracking-wider uppercase text-white shadow-lg active:translate-y-1 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
            isLight ? 'cta-button-light' : 'cta-button-dark'
          }`}
        >
          <span>Enter Game Table</span>
          <span className="text-base font-bold">→</span>
        </button>
      </div>
    </div>
  );
};
