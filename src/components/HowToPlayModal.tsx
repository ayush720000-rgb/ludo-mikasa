import React from 'react';
import { BookOpen, Flame, Shield, Swords, Trophy, X, Zap } from 'lucide-react';
import { sound } from '../utils/soundEffects';

interface HowToPlayModalProps {
  isOpen: boolean;
  theme: 'dark' | 'light';
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, theme, onClose }) => {
  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-[24px] border p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto ${
          isLight
            ? 'clay-card-light text-slate-900'
            : 'clay-card-dark text-slate-100'
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black tracking-tight">How to Play Mikasa Ludo</h3>
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

        <div className="flex flex-col gap-2.5 text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <strong
                className={`block font-bold text-sm mb-0.5 ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                Roll a 6 to Deploy &amp; Bonus Roll
              </strong>
              <span>
                Tokens start safely inside your colored Base. Rolling a 6 allows you to deploy a pawn onto the board track or advance an active pawn 6 steps. Rolling a 6 also grants an <strong>extra turn</strong>!
              </span>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <strong
                className={`block font-bold text-sm mb-0.5 ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                Captures &amp; Extra Turns
              </strong>
              <span>
                Landing on an opponent pawn on any unprotected tile knocks them back into their Base and rewards you with a bonus roll.
              </span>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <strong
                className={`block font-bold text-sm mb-0.5 ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                Safe Star Zones (⭐)
              </strong>
              <span>
                The 4 colored starting tiles and 4 star-marked squares are safe zones. Opponents cannot capture pawns standing on star squares.
              </span>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <strong
                className={`block font-bold text-sm mb-0.5 ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                20-Second Fast Turns
              </strong>
              <span>
                Quick 20s timers keep every match thrilling. Consecutive AFK turns will trigger intelligent auto-play, ensuring the lobby never freezes!
              </span>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-yellow-500/15 text-yellow-500 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <strong
                className={`block font-bold text-sm mb-0.5 ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                Center Home Victory
              </strong>
              <span>
                Traverse 56 steps and guide your pawns into Center Home. The first player to bring all 4 pawns home claims the Championship crown!
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer mt-1 shadow-lg shadow-rose-600/25 tactile-btn"
        >
          Got it! Let&apos;s Play
        </button>
      </div>
    </div>
  );
};
