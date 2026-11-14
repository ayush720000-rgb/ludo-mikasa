import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState, LobbyPlayer, PlayerColor, PlayerProfile, QuickReactionEvent } from '../types/ludo';
import { sound } from '../utils/soundEffects';

export function useLudoSocket(
  roomCode: string | null,
  user: PlayerProfile,
  asSpectator: boolean = false
) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [lastQuickReaction, setLastQuickReaction] = useState<QuickReactionEvent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const isManuallyClosedRef = useRef<boolean>(false);
  const lastActionIdRef = useRef<string>('');
  const lastWinnerRef = useRef<string | null>(null);

  // Keep latest user ref to avoid reconnecting socket on superficial user prop changes
  const userRef = useRef<PlayerProfile>(user);
  useEffect(() => {
    userRef.current = user;
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'update_profile',
        payload: { id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl },
      }));
    }
  }, [user.id, user.name, user.username, user.avatarUrl]);

  const clearPingInterval = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!roomCode) return;
    clearReconnectTimeout();
    clearPingInterval();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        retryCountRef.current = 0;

        const currentUser = userRef.current;
        // Join lobby or re-join active room seamlessly
        ws.send(
          JSON.stringify({
            type: 'join_lobby',
            payload: {
              code: roomCode,
              user: {
                id: currentUser.id,
                name: currentUser.name,
                username: currentUser.username,
                avatarUrl: currentUser.avatarUrl,
              },
              asSpectator,
            },
          })
        );

        // Setup 15-second heartbeat to detect ghost/dead sockets
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'quick_reaction') {
            setLastQuickReaction(msg.payload);
            sound.playReactionBurst();
          } else if (msg.type === 'init_state' || msg.type === 'sync') {
            const state: GameState = msg.payload;
            setGameState(state);

            // Audio triggers on state changes
            if (state.lastAction) {
              const actionKey = `${state.lastAction.type}_${state.lastAction.description}_${state.stats.totalRolls}_${state.stats.turnsCount}`;
              if (actionKey !== lastActionIdRef.current) {
                lastActionIdRef.current = actionKey;

                if (state.lastAction.type === 'roll') {
                  sound.playDiceRoll();
                  setTimeout(() => sound.playDiceLand(), 250);
                } else if (state.lastAction.type === 'capture') {
                  sound.playCapture();
                } else if (state.lastAction.type === 'home') {
                  sound.playSafeStar();
                } else if (state.lastAction.type === 'move') {
                  sound.playTokenStep();
                }
              }
            }

            if (state.winnerColor && state.winnerColor !== lastWinnerRef.current) {
              lastWinnerRef.current = state.winnerColor;
              sound.playVictory();
            } else if (!state.winnerColor) {
              lastWinnerRef.current = null;
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearPingInterval();

        if (!isManuallyClosedRef.current && roomCode) {
          setIsReconnecting(true);
          // Exponential backoff with jitter: 1s, 1.8s, 2.7s, up to 6s
          const backoff = Math.min(
            1000 * Math.pow(1.5, Math.min(retryCountRef.current, 6)) + Math.random() * 500,
            6000
          );
          retryCountRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isManuallyClosedRef.current && roomCode) {
              connect();
            }
          }, backoff);
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    } catch (e) {
      console.warn('Socket connect error:', e);
      setIsConnected(false);
      setIsReconnecting(true);
    }
  }, [roomCode, asSpectator]);

  // Handle immediate reconnection on network reconnect or browser tab focus
  useEffect(() => {
    const handleOnline = () => {
      if (
        roomCode &&
        (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
      ) {
        retryCountRef.current = 0;
        connect();
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        roomCode &&
        (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
      ) {
        retryCountRef.current = 0;
        connect();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, roomCode]);

  useEffect(() => {
    isManuallyClosedRef.current = false;
    connect();
    return () => {
      isManuallyClosedRef.current = true;
      clearReconnectTimeout();
      clearPingInterval();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendAction = useCallback((type: string, payload: any = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const selectColor = useCallback(
    (color: PlayerColor) => {
      sendAction('select_color', { color });
      sound.playClick();
    },
    [sendAction]
  );

  const toggleReady = useCallback(() => {
    sendAction('toggle_ready');
    sound.playClick();
  }, [sendAction]);

  const addBot = useCallback(() => {
    sendAction('add_bot');
    sound.playClick();
  }, [sendAction]);

  const removeBot = useCallback(
    (botId?: string) => {
      sendAction('remove_bot', botId ? { botId } : {});
      sound.playClick();
    },
    [sendAction]
  );

  const startGame = useCallback(() => {
    sendAction('start_game');
    sound.playClick();
  }, [sendAction]);

  const rollDice = useCallback(() => {
    sendAction('roll_dice');
    sound.playDiceRoll();
  }, [sendAction]);

  const moveToken = useCallback(
    (tokenIndex: number) => {
      sendAction('move_token', { tokenIndex });
      sound.playTokenStep();
    },
    [sendAction]
  );

  const sendChatMessage = useCallback(
    (text: string, replyTo?: { id: string; senderName: string; text: string }) => {
      const u = userRef.current;
      sendAction('send_chat', {
        sender: {
          id: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl,
        },
        text,
        replyTo,
      });
      sound.playClick();
    },
    [sendAction]
  );

  const reactChat = useCallback(
    (messageId: string, emoji: string) => {
      const u = userRef.current;
      sendAction('react_chat', {
        messageId,
        emoji,
        user: { id: u.id, name: u.name },
      });
      sound.playClick();
    },
    [sendAction]
  );

  const sendQuickReaction = useCallback(
    (emoji: string) => {
      sendAction('quick_reaction', { emoji });
      sound.playReactionBurst();
    },
    [sendAction]
  );

  const leaveRoom = useCallback(() => {
    sendAction('leave_lobby');
    sound.playClick();
  }, [sendAction]);

  const rematch = useCallback(() => {
    sendAction('rematch');
    sound.playClick();
  }, [sendAction]);

  return {
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
  };
}
