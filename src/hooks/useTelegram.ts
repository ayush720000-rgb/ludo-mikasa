import { MINIAPP_URL } from '../utils/botConfig';
import { useEffect, useState } from 'react';
import { PlayerProfile } from '../types/ludo';

function safeGetStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function useTelegram() {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const saved = safeGetStorage('mikasa_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    const defaultId = 'user_' + Math.random().toString(36).substring(2, 8);
    return {
      id: defaultId,
      name: 'Mikasa Player',
      username: 'mikasa_fan',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isTelegram: false,
      gamesPlayed: 0,
      wins: 0,
      captures: 0,
    };
  });

  const [isTelegramWebApp, setIsTelegramWebApp] = useState<boolean>(false);
  const [initDataString, setInitDataString] = useState<string>('');

  useEffect(() => {
    try {
      const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

      if (tg) {
        tg.ready?.();
        tg.expand?.();
        tg.disableVerticalSwipes?.();
        const viewportHeight = tg.viewportStableHeight || tg.viewportHeight;
        if (viewportHeight) document.documentElement.style.setProperty('--tg-viewport-height', `${viewportHeight}px`);
        tg.setHeaderColor?.('#0b0c16');
        tg.setBackgroundColor?.('#0b0c16');

        if (tg.initData) {
          setInitDataString(tg.initData);
          setIsTelegramWebApp(true);
          const onViewportChanged = () => {
            const height = tg.viewportStableHeight || tg.viewportHeight;
            if (height) document.documentElement.style.setProperty('--tg-viewport-height', `${height}px`);
          };
          tg.onEvent?.('viewportChanged', onViewportChanged);
        }

        const user = tg.initDataUnsafe?.user;
        if (user) {
          const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
          const tgProfile: PlayerProfile = {
            id: 'tg_' + user.id,
            name: fullName || 'Telegram Player',
            username: user.username,
            avatarUrl: user.photo_url
              ? `/api/telegram/avatar-url?url=${encodeURIComponent(user.photo_url)}`
              : undefined,
            isTelegram: true,
            gamesPlayed: 0,
            wins: 0,
            captures: 0,
          };

          setProfile((prev) => ({
            ...tgProfile,
            gamesPlayed: prev.gamesPlayed,
            wins: prev.wins,
            captures: prev.captures,
          }));

          // Authenticate with backend
          fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
          })
            .then(async (r) => {
              if (r.ok && r.headers.get('content-type')?.includes('application/json')) {
                return r.json();
              }
              return null;
            })
            .then((data) => {
              if (data?.profile) {
                setProfile(data.profile);
                safeSetStorage('mikasa_user_profile', JSON.stringify(data.profile));
                if (typeof data.sessionToken === 'string' && data.sessionToken) {
                  safeSetStorage('mikasa_telegram_session', data.sessionToken);
                }
              }
            })
            .catch(() => {});
          return;
        }
      }

      // Guest / Browser fallback
      fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestProfile: profile }),
      })
        .then(async (r) => {
          if (r.ok && r.headers.get('content-type')?.includes('application/json')) {
            return r.json();
          }
          return null;
        })
        .then((data) => {
          if (data?.profile) {
            setProfile(data.profile);
            safeSetStorage('mikasa_user_profile', JSON.stringify(data.profile));
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn('Telegram init notice:', e);
    }
  }, []);

  const updateProfile = (name: string, avatarUrl?: string) => {
    setProfile((prev) => {
      const updated = { ...prev, name, avatarUrl: avatarUrl || prev.avatarUrl };
      safeSetStorage('mikasa_user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const shareLobbyLink = (code: string) => {
    // Telegram's named Mini App deep link opens this game inside Telegram
    // and delivers the room code through WebApp.initDataUnsafe.start_param.
    const normalizedCode = code.trim().toUpperCase();
    const inviteUrl = `${MINIAPP_URL}?startapp=join_${encodeURIComponent(normalizedCode)}`;
    const shareText = `🎲 Join my Mikasa ~ Ludo room [${normalizedCode}]! Let's play: ${inviteUrl}`;

    try {
      const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
      if (tg?.openTelegramLink) {
        const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(
          `🎲 Join my Mikasa ~ Ludo room [${normalizedCode}]!`
        )}`;
        tg.openTelegramLink(tgShareUrl);
      } else if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(shareText);
      } else {
        window.prompt('Copy this Ludo invite link:', shareText);
      }
    } catch {
      try {
        void navigator.clipboard?.writeText(shareText);
      } catch {}
    }
  };

  return {
    profile,
    updateProfile,
    isTelegramWebApp,
    initDataString,
    shareLobbyLink,
  };
}
