/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChatNotificationToast } from './components/ChatNotificationToast';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { GameBoard } from './components/GameBoard';
import { GameChat } from './components/GameChat';
import { FloatingEmoji } from './components/GameMomentBanner';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { HowToPlayModal } from './components/HowToPlayModal';
import { IntroScreen } from './components/IntroScreen';
import { LobbyRoom } from './components/LobbyRoom';
import { MatchHistoryModal } from './components/MatchHistoryModal';
import { ProfileModal } from './components/ProfileModal';
import { VictoryModal } from './components/VictoryModal';
import { SharedResultView } from './components/SharedResultView';
import { useLudoSocket } from './hooks/useLudoSocket';
import { useTelegram } from './hooks/useTelegram';
import { ChatMessage } from './types/ludo';
import { sound } from './utils/soundEffects';

function safeGetStorage(type: 'local' | 'session', key: string): string | null {
  try {
    return (type === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(type: 'local' | 'session', key: string, value: string): void {
  try {
    (type === 'local' ? localStorage : sessionStorage).setItem(key, value);
  } catch {}
}

export default function App() {
  const { profile, updateProfile, shareLobbyLink } = useTelegram();

  // Theme Management: Dark mode is the default; saved user preference takes priority.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = safeGetStorage('local', 'mikasa_ludo_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      safeSetStorage('local', 'mikasa_ludo_theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  // Intro Screen visibility: only shown once per session
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    return !safeGetStorage('session', 'mikasa_intro_viewed');
  });

  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const browserJoinCode = params.get('join');
    const tg = (window as any).Telegram?.WebApp;
    const startParam =
      tg?.initDataUnsafe?.start_param ||
      params.get('tgWebAppStartParam') ||
      params.get('startapp');
    const deepLinkJoinCode =
      typeof startParam === 'string' && startParam.startsWith('join_')
        ? startParam.slice(5)
        : null;
    const joinCode = deepLinkJoinCode || browserJoinCode;
    return joinCode ? decodeURIComponent(joinCode).trim().toUpperCase() : null;
  });

  // Shared result links open here: startapp=result_<id> shows the match image inside Telegram.
  const [sharedResultId, setSharedResultId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const tg = (window as any).Telegram?.WebApp;
    const sp = tg?.initDataUnsafe?.start_param || params.get('tgWebAppStartParam') || params.get('startapp');
    return typeof sp === 'string' && sp.startsWith('result_') ? sp.slice(7) : null;
  });

  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState<boolean>(false);
  const [lastReadChatLength, setLastReadChatLength] = useState<number>(0);
  const [autoFillBots, setAutoFillBots] = useState<boolean>(false);
  const deepLinkHandledRef = useRef(false);

  // Handle Telegram named-Mini-App invite links. The initializer above covers
  // normal Telegram startup; this effect is a safe fallback if the WebApp bridge
  // exposes start_param just after React mounts.
  useEffect(() => {
    if (deepLinkHandledRef.current || currentRoomCode) return;
    const tg = (window as any).Telegram?.WebApp;
    const params = new URLSearchParams(window.location.search);
    const startParam =
      tg?.initDataUnsafe?.start_param ||
      params.get('tgWebAppStartParam') ||
      params.get('startapp');
    if (typeof startParam === 'string' && startParam.startsWith('join_')) {
      const code = startParam.slice(5).trim().toUpperCase();
      if (/^[A-Z0-9]{4,12}$/.test(code)) {
        deepLinkHandledRef.current = true;
        setIsSpectator(false);
        setCurrentRoomCode(code);
        window.history.replaceState(null, '', `?join=${code}`);
      }
    }
  }, [currentRoomCode]);

  // Floating Emoji Reaction Animation State
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [lastIncomingMessage, setLastIncomingMessage] = useState<ChatMessage | null>(null);
  const prevChatLengthRef = useRef<number>(0);

  // WebSocket Hook for the current active room
  const {
    gameState,
    isConnected,
    isReconnecting,
    lastQuickReaction,
    selectColor,
    toggleReady,
    addBot,
    removeBot,
    startGame,
    rollDice,
    moveToken,
    sendChatMessage,
    reactChat,
    sendQuickReaction,
    rematch,
    leaveRoom,
  } = useLudoSocket(currentRoomCode, profile, isSpectator);

  // Detect incoming chat message for toast notification
  useEffect(() => {
    if (gameState?.chat) {
      if (
        gameState.chat.length > prevChatLengthRef.current &&
        prevChatLengthRef.current > 0
      ) {
        const latestMsg = gameState.chat[gameState.chat.length - 1];
        if (latestMsg.senderId !== profile.id) {
          setLastIncomingMessage(latestMsg);
        }
      }
      prevChatLengthRef.current = gameState.chat.length;
    }
  }, [gameState?.chat, profile.id]);

  const handleDismissIntro = () => {
    safeSetStorage('session', 'mikasa_intro_viewed', 'true');
    setShowIntro(false);
  };

  // Trigger floating reaction fountain
  const triggerReactionAnimation = (emoji: string) => {
    const newBatch: FloatingEmoji[] = Array.from({ length: 8 }).map((_, i) => ({
      id: 'emoji_' + Date.now() + '_' + i + '_' + Math.random(),
      emoji,
      x: 15 + Math.random() * 70,
    }));
    setFloatingEmojis((prev) => [...prev, ...newBatch]);
    setTimeout(() => {
      setFloatingEmojis((prev) =>
        prev.filter((item) => !newBatch.some((b) => b.id === item.id))
      );
    }, 2200);
  };

  // Auto-fill bots if Quick Practice mode was requested
  useEffect(() => {
    if (autoFillBots && gameState && gameState.status === 'waiting') {
      const needed = 4 - gameState.players.length;
      if (needed > 0) {
        addBot();
      } else {
        setAutoFillBots(false);
        setTimeout(() => {
          startGame();
        }, 600);
      }
    }
  }, [autoFillBots, gameState, addBot, startGame]);

  const handleCreateLobby = async () => {
    try {
      const res = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostProfile: profile }),
      });
      const data = await res.json();
      if (data.code) {
        setIsSpectator(false);
        setCurrentRoomCode(data.code);
        window.history.replaceState(null, '', `?join=${data.code}`);
      }
    } catch (e) {
      console.error('Failed to create lobby:', e);
    }
  };

  const handleQuickPractice = async () => {
    try {
      const res = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostProfile: profile }),
      });
      const data = await res.json();
      if (data.code) {
        setIsSpectator(false);
        setAutoFillBots(true);
        setCurrentRoomCode(data.code);
        window.history.replaceState(null, '', `?join=${data.code}`);
      }
    } catch (e) {
      console.error('Failed to start quick match:', e);
    }
  };

  const handleJoinLobby = (code: string) => {
    setIsSpectator(false);
    setCurrentRoomCode(code.toUpperCase());
    window.history.replaceState(null, '', `?join=${code.toUpperCase()}`);
  };

  const requestLeaveConfirmation = () => setIsExitConfirmOpen(true);

  const handleLeaveRoom = () => {
    setIsExitConfirmOpen(false);
    leaveRoom();
    setCurrentRoomCode(null);
    setAutoFillBots(false);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
    if (gameState?.chat) {
      setLastReadChatLength(gameState.chat.length);
    }
  };

  const unreadChatCount = Math.max(
    0,
    (gameState?.chat.length || 0) - lastReadChatLength
  );

  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen min-h-[var(--tg-viewport-height,100dvh)] flex flex-col font-sans relative transition-colors duration-300 app-shell ${
        isLight
          ? 'theme-playful-light text-[#0E1726]'
          : 'theme-playful-dark text-slate-100 selection:bg-rose-500/30'
      }`}
    >
      {/* Reconnection Alert Banner on temporary network interruptions */}
      {isReconnecting && currentRoomCode && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2 border border-amber-300 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          <span>Temporary network drop • Reconnecting to #{currentRoomCode}...</span>
        </div>
      )}

      {/* Mascot Intro Animation Overlay on initial entry */}
      {showIntro && (
        <IntroScreen user={profile} theme={theme} onEnter={handleDismissIntro} />
      )}

      {/* Navigation Header with Upper Right Theme Switcher */}
      <Header
        user={profile}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentRoom={currentRoomCode}
        onLeaveRoom={requestLeaveConfirmation}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
      />

      {/* Floating Chat Notification Toast */}
      <ChatNotificationToast
        lastMessage={lastIncomingMessage}
        isChatOpen={isChatOpen}
        theme={theme}
        onOpenChat={handleOpenChat}
      />

      {/* Main Content Area */}
      {sharedResultId && !currentRoomCode && (
        <SharedResultView resultId={sharedResultId} onClose={() => setSharedResultId(null)} />
      )}
      <main className="flex-1 flex flex-col pb-6">
        <>
        {!currentRoomCode ? (
          /* HOME SCREEN */
          <HomeScreen
            user={profile}
            theme={theme}
            onCreateLobby={handleCreateLobby}
            onJoinLobby={handleJoinLobby}
            onQuickPractice={handleQuickPractice}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenMatchHistory={() => setIsMatchHistoryOpen(true)}
          />
        ) : !gameState ? (
          /* CONNECTING LOADER */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg animate-spin">
              <span className="text-2xl">🎲</span>
            </div>
            <h3
              className={`mt-4 font-black text-lg ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Connecting to #{currentRoomCode}...
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Synchronizing match state with server
            </p>
          </div>
        ) : gameState.status === 'waiting' ? (
          /* LOBBY ROOM */
          <LobbyRoom
            gameState={gameState}
            user={profile}
            theme={theme}
            onSelectColor={selectColor}
            onToggleReady={toggleReady}
            onAddBot={addBot}
            onRemoveBot={removeBot}
            onStartGame={startGame}
            onShareLink={shareLobbyLink}
          />
        ) : (
          /* IN GAME BOARD */
          <GameBoard
            gameState={gameState}
            userId={profile.id}
            theme={theme}
            floatingEmojis={floatingEmojis}
            activeQuickReaction={lastQuickReaction}
            onRollDice={rollDice}
            onMoveToken={moveToken}
            onOpenChat={handleOpenChat}
            onQuickReact={sendQuickReaction}
            unreadChatCount={unreadChatCount}
            onLeaveRoom={requestLeaveConfirmation}
            isChatOpen={isChatOpen}
          />
        )}
        </>
      </main>

      {/* Real-Time Multiplayer Chat Drawer */}
      {gameState && (
        <GameChat
          isOpen={isChatOpen}
          theme={theme}
          onClose={() => setIsChatOpen(false)}
          messages={gameState.chat}
          currentUser={profile}
          onSendMessage={sendChatMessage}
          onReactMessage={reactChat}
          onTriggerReactionAnimation={triggerReactionAnimation}
        />
      )}

      {/* Victory Celebration Modal */}
      {gameState && gameState.status === 'ended' && (
        <VictoryModal
          gameState={gameState}
          currentUser={profile}
          theme={theme}
          onRematch={rematch}
          onReturnHome={handleLeaveRoom}
          onCreateLobby={handleCreateLobby}
        />
      )}

      {/* Profile & Lifetime Stats Modal */}
      <ProfileModal
        user={profile}
        theme={theme}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpdateName={updateProfile}
      />

      {/* Match History Modal */}
      <MatchHistoryModal
        isOpen={isMatchHistoryOpen}
        theme={theme}
        onClose={() => setIsMatchHistoryOpen(false)}
      />

      {/* Rules & How to Play Modal */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        theme={theme}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      {isExitConfirmOpen && (
        <ExitConfirmModal
          theme={theme}
          onCancel={() => setIsExitConfirmOpen(false)}
          onConfirm={handleLeaveRoom}
        />
      )}
    </div>
  );
}
