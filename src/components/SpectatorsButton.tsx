import React, { useState } from 'react';
import { Eye, X, ArrowLeft } from 'lucide-react';
import { Spectator } from '../types/ludo';
import { sound } from '../utils/soundEffects';

interface SpectatorsButtonProps {
  spectators: Spectator[];
  isLight: boolean;
}

const avatarFor = (s: Spectator) =>
  s.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.id}`;

/** Eye chip with the spectator count. Tapping it lists spectators; tapping one opens their profile. */
export const SpectatorsButton: React.FC<SpectatorsButtonProps> = ({ spectators, isLight }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Spectator | null>(null);

  const close = () => {
    setOpen(false);
    setSelected(null);
  };

  return (
    <>
      <button
        onClick={() => {
          sound.playClick();
          setOpen(true);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-black shadow-sm active:scale-95 transition-transform ${
          isLight
            ? 'bg-white/90 text-slate-700 border-amber-200'
            : 'bg-[#211636]/90 text-slate-100 border-purple-500/40'
        }`}
        aria-label={`${spectators.length} spectators`}
      >
        <Eye className="w-3.5 h-3.5 text-purple-400" />
        <span className="tabular-nums">{spectators.length}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-3"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm max-h-[70vh] overflow-hidden flex flex-col rounded-2xl border shadow-2xl ${
              isLight ? 'bg-white text-slate-800 border-amber-200' : 'bg-[#170e24] text-slate-100 border-purple-500/40'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-current/10">
              {selected ? (
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1 text-xs font-black text-purple-400"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <span className="text-sm font-black">Spectators ({spectators.length})</span>
              )}
              <button onClick={close} aria-label="Close" className="p-1 rounded-full opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {selected ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <img
                    src={avatarFor(selected)}
                    alt={selected.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-400"
                  />
                  <div className="text-base font-black break-words max-w-full">{selected.name}</div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-400">
                    Spectating this match
                  </span>
                  <span className="text-[10px] opacity-60 break-all">ID {selected.id}</span>
                </div>
              ) : spectators.length === 0 ? (
                <p className="text-xs text-center opacity-70 py-6">No spectators yet. Share the invite link to let friends watch.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {spectators.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setSelected(s);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left active:scale-[0.98] transition-transform ${
                          isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-white/5 border-purple-500/20'
                        }`}
                      >
                        <img
                          src={avatarFor(s)}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-xl object-cover shrink-0"
                        />
                        <span className="text-sm font-bold truncate min-w-0">{s.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
