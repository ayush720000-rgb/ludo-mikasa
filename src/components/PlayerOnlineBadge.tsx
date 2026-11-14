import React from 'react';

interface PlayerOnlineBadgeProps {
  status?: 'online' | 'afk' | 'offline';
  className?: string;
  showText?: boolean;
}

export const PlayerOnlineBadge: React.FC<PlayerOnlineBadgeProps> = ({
  status = 'online',
  className = '',
  showText = false,
}) => {
  const config = {
    online: {
      dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
      ring: 'bg-emerald-400',
      label: 'Online',
      textColor: 'text-emerald-500 dark:text-emerald-400',
    },
    afk: {
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
      ring: 'bg-amber-300',
      label: 'Away (AFK)',
      textColor: 'text-amber-500 dark:text-amber-400',
    },
    offline: {
      dot: 'bg-slate-400 dark:bg-slate-500 shadow-[0_0_4px_rgba(148,163,184,0.4)]',
      ring: '',
      label: 'Offline',
      textColor: 'text-slate-400',
    },
  }[status] || {
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
    ring: 'bg-emerald-400',
    label: 'Online',
    textColor: 'text-emerald-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 select-none ${className}`}
      title={`Player is ${config.label}`}
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {status === 'online' && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.ring}`}
          />
        )}
        {status === 'afk' && (
          <span
            className={`absolute inline-flex h-full w-full animate-pulse rounded-full opacity-60 ${config.ring}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full border border-white dark:border-slate-900 ${config.dot}`}
        />
      </span>
      {showText && (
        <span className={`text-[10px] font-bold ${config.textColor}`}>
          {config.label}
        </span>
      )}
    </span>
  );
};
