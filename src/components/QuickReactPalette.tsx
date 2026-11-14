import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SmilePlus, X } from 'lucide-react';
import { sound } from '../utils/soundEffects';
import { QUICK_EMOJIS, QuickEmoji } from './BigEmojiReaction';

interface QuickReactPaletteProps {
  onSelectEmoji: (emoji: string) => void;
  theme: 'light' | 'dark';
}

export const QuickReactPalette: React.FC<QuickReactPaletteProps> = ({
  onSelectEmoji,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: 240 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(196, window.innerWidth - 16);
    const estimatedHeight = 166;
    let left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.top - estimatedHeight - 10;
    if (top < 8) top = Math.min(rect.bottom + 10, window.innerHeight - 8 - estimatedHeight);
    top = Math.max(8, top);
    setPosition({ left, top, maxHeight: Math.max(120, window.innerHeight - top - 8) });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !paletteRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleViewportChange = () => updatePosition();
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen]);

  const handleEmojiClick = (emoji: QuickEmoji) => {
    sound.hapticImpact('light');
    onSelectEmoji(emoji);
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && createPortal(
        <div
          ref={paletteRef}
          className={`p-2 rounded-2xl border shadow-2xl flex flex-col gap-1.5 ${
            isLight
              ? 'fake-glass-light text-slate-900 shadow-[0_16px_36px_rgba(14,23,38,0.18)]'
              : 'fake-glass-dark text-slate-100 shadow-[0_16px_45px_rgba(0,0,0,0.85)]'
          }`}
          style={{
            position: 'fixed',
            left: position.left,
            top: position.top,
            width: 'min(196px, calc(100vw - 16px))',
            maxHeight: position.maxHeight,
            overflowY: 'auto',
            zIndex: 99999,
            touchAction: 'manipulation',
          }}
        >
          <div className="flex items-center justify-between gap-3 px-1 pb-1 border-b border-black/5 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
              Quick React ⚡
            </span>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close reactions"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className={`aspect-square min-w-0 rounded-xl flex items-center justify-center text-2xl transition-colors cursor-pointer active:scale-95 ${
                  isLight ? 'hover:bg-slate-100/90 bg-slate-50' : 'hover:bg-purple-900/50 bg-white/[0.06]'
                }`}
                title={`Send ${emoji}`}
              >
                <span className="drop-shadow-sm select-none pointer-events-none">{emoji}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      <div ref={triggerRef} className="relative inline-flex items-center">
        <button
          onClick={() => {
            sound.playClick();
            setIsOpen((prev) => !prev);
          }}
          aria-expanded={isOpen}
          aria-label="Open quick reactions"
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all cursor-pointer active:scale-95 ${
            isOpen
              ? isLight
                ? 'ring-2 ring-rose-400 border-rose-400 bg-rose-50 text-rose-600 font-black'
                : 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/40 text-cyan-400 font-black'
              : isLight
              ? 'fake-glass-light text-slate-800 hover:border-slate-300'
              : 'fake-glass-dark text-slate-100 hover:border-purple-400/50'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <span className="text-sm select-none">😂</span>
          <span className="text-[11px] font-bold">React</span>
        </button>
      </div>
    </>
  );
};
