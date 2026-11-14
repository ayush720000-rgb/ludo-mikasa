import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

interface ExitConfirmModalProps {
  theme: 'dark' | 'light';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  theme,
  onConfirm,
  onCancel,
}) => {
  const isLight = theme === 'light';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      onClick={(event) => event.stopPropagation()}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-confirm-title"
        className={`relative w-full max-w-[340px] rounded-3xl border p-5 shadow-2xl animate-in zoom-in-95 duration-150 ${
          isLight
            ? 'bg-white border-rose-200 text-slate-900'
            : 'bg-[#1b102b] border-rose-400/30 text-slate-100'
        }`}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel exit"
          className={`absolute right-3 top-3 w-8 h-8 rounded-xl flex items-center justify-center ${
            isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/10'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
          isLight ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/15 text-rose-300'
        }`}>
          <LogOut className="w-6 h-6" />
        </div>

        <h2 id="exit-confirm-title" className="text-lg font-black tracking-tight">
          Confirm Exit?
        </h2>
        <p className={`mt-1.5 text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          Are you sure you want to leave this match? Leaving will forfeit your place.
        </p>

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className={`rounded-xl px-4 py-3 text-xs font-black tracking-wide border transition-colors ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/10 text-slate-200'
            }`}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl px-4 py-3 text-xs font-black tracking-wide text-white bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 shadow-lg shadow-rose-900/20 active:scale-[0.98] transition-all"
          >
            CONFIRM
          </button>
        </div>
      </section>
    </div>
  );
};
