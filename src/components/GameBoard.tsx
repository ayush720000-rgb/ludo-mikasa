import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Crown,
  Flame,
  MessageSquare,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import { GameState, LobbyPlayer, PlayerColor, TokenPosition } from '../types/ludo';
import {
  COLOR_CONFIG,
  getTokenCoordinates,
  GridCoord,
} from '../utils/ludoConstants';
import { MAX_STEP, countThreatsAt } from '../utils/ludoRules';
import { SpectatorsButton } from './SpectatorsButton';
import { sound } from '../utils/soundEffects';
import { CustomLudoToken } from './CustomLudoToken';
import { DarkLudoBoard } from './DarkLudoBoard';
import { FloatingEmoji, GameMomentBanner, GameMomentEvent } from './GameMomentBanner';
import { LightLudoBoard } from './LightLudoBoard';
import { PlayerStation } from './PlayerStation';
import { BigEmojiReaction } from './BigEmojiReaction';
import { QuickReactPalette } from './QuickReactPalette';
import { QuickReactionEvent } from '../types/ludo';

interface GameBoardProps {
  gameState: GameState;
  userId: string;
  theme: 'dark' | 'light';
  floatingEmojis: FloatingEmoji[];
  activeQuickReaction?: QuickReactionEvent | null;
  onRollDice: () => void;
  onMoveToken: (tokenIndex: number) => void;
  onOpenChat: () => void;
  onQuickReact?: (emoji: string) => void;
  unreadChatCount: number;
  onLeaveRoom?: () => void;
  isChatOpen?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  userId,
  theme,
  floatingEmojis,
  activeQuickReaction,
  onRollDice,
  onMoveToken,
  onOpenChat,
  onQuickReact,
  unreadChatCount,
  onLeaveRoom,
  isChatOpen = false,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [isRollingAnimation, setIsRollingAnimation] = useState<boolean>(false);
  const [activeMoment, setActiveMoment] = useState<GameMomentEvent | null>(null);

  // Smooth Token Walking / Hopping Animation States
  const [activeHop, setActiveHop] = useState<{
    color: PlayerColor;
    tokenIndex: number;
    currentCoord: GridCoord;
    isHopping: boolean;
    hopKey: number;
  } | null>(null);

  const [victimSwoosh, setVictimSwoosh] = useState<{
    color: PlayerColor;
    tokenIndex: number;
  } | null>(null);

  const prevStepsRef = React.useRef<Record<string, number>>({});
  const hopTimerRef = React.useRef<any>(null);

  const isLight = theme === 'light';

  const me = gameState.players.find((p) => p.id === userId);
  const isMyTurn = gameState.currentTurnColor === me?.color;
  const activePlayer = gameState.players.find(
    (p) => p.color === gameState.currentTurnColor
  );

  // PERSPECTIVE ORIENTATION:
  // As requested: Your board and home quadrant are ALWAYS in your bottom-left corner!
  // Clockwise order in Ludo: Red -> Blue -> Yellow -> Green
  const {
    topLeftPlayer,
    topLeftColor,
    topRightPlayer,
    topRightColor,
    bottomLeftPlayer,
    bottomLeftColor,
    bottomRightPlayer,
    bottomRightColor,
    boardRotationAngle,
  } = useMemo(() => {
    const order: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];
    const myColor = me?.color || 'green';
    const myIdx = order.indexOf(myColor);

    // Board rotation angle so that myColor's home yard is in the bottom-left corner:
    // Green (natural bottom-left) = 0deg
    // Yellow (natural bottom-right) = 90deg (rotates bottom-right to bottom-left)
    // Blue (natural top-right) = 180deg (rotates top-right to bottom-left)
    // Red (natural top-left) = 270deg (rotates top-left to bottom-left)
    const rotationMap: Record<PlayerColor, number> = {
      green: 0,
      yellow: 90,
      blue: 180,
      red: 270,
    };
    const boardRotationAngle = rotationMap[myColor] ?? 0;

    // Corner positions relative to my perspective (bottom-left):
    // bottom-left: me (myColor)
    // top-left: next clockwise color (+1)
    // top-right: opposite color (+2)
    // bottom-right: preceding color (+3)
    const bLColor = myColor;
    const tLColor = order[(myIdx + 1) % 4];
    const tRColor = order[(myIdx + 2) % 4];
    const bRColor = order[(myIdx + 3) % 4];

    return {
      bottomLeftPlayer: me || gameState.players.find((p) => p.color === bLColor),
      bottomLeftColor: bLColor,
      topLeftPlayer: gameState.players.find((p) => p.color === tLColor),
      topLeftColor: tLColor,
      topRightPlayer: gameState.players.find((p) => p.color === tRColor),
      topRightColor: tRColor,
      bottomRightPlayer: gameState.players.find((p) => p.color === bRColor),
      bottomRightColor: bRColor,
      boardRotationAngle,
    };
  }, [gameState.players, me]);

  // Alert player when it becomes their turn
  const prevIsMyTurnRef = React.useRef(isMyTurn);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      sound.playTurnStart();
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  // Watch for dramatic moments - only when someone makes a token home or someone wins
  useEffect(() => {
    if (gameState.status === 'ended' && gameState.winnerColor) {
      const winner = gameState.players.find((p) => p.color === gameState.winnerColor);
      sound.playVictory();
      setActiveMoment({
        id: 'win_' + Date.now(),
        type: 'win',
        title: '👑 VICTORY!',
        subtitle: `${winner?.name || 'Player'} has won the match!`,
      });
      return;
    }

    if (!gameState.lastAction) return;

    if (gameState.lastAction.type === 'capture') {
      sound.playCapture();
      setActiveMoment({
        id: 'capture_' + Date.now(),
        type: 'capture',
        title: '💥 CAPTURED!',
        subtitle: gameState.lastAction.description,
      });
      return;
    }

    if (gameState.lastAction.type === 'home') {
      sound.playSafeStar();
      // Close finish: the mover has three tokens home and is one token from winning
      const homeCount = activePlayer?.tokens.filter((t) => t.step >= MAX_STEP).length ?? 0;
      const oneToGo = homeCount === 3;
      setActiveMoment({
        id: 'home_' + Date.now(),
        type: 'home',
        title: oneToGo ? '🔥 ONE TOKEN AWAY!' : '⭐ TOKEN ENTERED HOME!',
        subtitle: oneToGo
          ? `${activePlayer?.name || 'Player'} has 3 tokens home. One more to win!`
          : gameState.lastAction.description,
      });
    }
  }, [gameState.lastAction, gameState.status, gameState.winnerColor, activePlayer]);

  // Synchronized remaining time
  useEffect(() => {
    const updateTimer = () => {
      const elapsed = (Date.now() - gameState.turnStartTime) / 1000;
      const rem = Math.max(0, Math.ceil(gameState.turnDuration - elapsed));
      setSecondsLeft(rem);

      if (rem <= 5 && rem > 0 && isMyTurn && !gameState.diceRolled) {
        sound.playTimerTick();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [gameState.turnStartTime, gameState.turnDuration, isMyTurn, gameState.diceRolled]);

  // Step-by-step smooth token hopping animation
  useEffect(() => {
    // If first render, initialize tracking steps
    if (Object.keys(prevStepsRef.current).length === 0) {
      gameState.players.forEach((p) => {
        p.tokens.forEach((t, idx) => {
          prevStepsRef.current[`${p.color}_${idx}`] = t.step;
        });
      });
      return;
    }

    let movedColor: PlayerColor | null = null;
    let movedTokenIdx: number | null = null;
    let fromStep: number = -1;
    let toStep: number = -1;

    let capturedVictimColor: PlayerColor | null = null;
    let capturedVictimTokenIdx: number | null = null;

    // Detect moves & captures
    gameState.players.forEach((p) => {
      p.tokens.forEach((t, idx) => {
        const key = `${p.color}_${idx}`;
        const prevStep = prevStepsRef.current[key];
        if (prevStep !== undefined) {
          if (t.step > prevStep) {
            movedColor = p.color;
            movedTokenIdx = idx;
            fromStep = prevStep;
            toStep = t.step;
          } else if (t.step === -1 && prevStep >= 0) {
            capturedVictimColor = p.color;
            capturedVictimTokenIdx = idx;
          }
        }
        // Update stored step
        prevStepsRef.current[key] = t.step;
      });
    });

    if (movedColor !== null && movedTokenIdx !== null && toStep > fromStep) {
      const stepsToWalk: number[] = [];
      if (fromStep < 0 && toStep === 0) {
        stepsToWalk.push(0);
      } else {
        const start = Math.max(0, fromStep);
        for (let s = start + 1; s <= toStep; s++) {
          stepsToWalk.push(s);
        }
      }

      if (stepsToWalk.length === 0) return;

      if (hopTimerRef.current) {
        clearTimeout(hopTimerRef.current);
      }

      const mColor = movedColor;
      const mIdx = movedTokenIdx;
      const victimCol = capturedVictimColor;
      const victimIdx = capturedVictimTokenIdx;

      let currentStepIndex = 0;
      const hopInterval = stepsToWalk.length > 4 ? 92 : 108;

      const runHopStep = () => {
        if (currentStepIndex < stepsToWalk.length) {
          const stepVal = stepsToWalk[currentStepIndex];
          const coord = getTokenCoordinates(mColor, stepVal, mIdx);

          setActiveHop({
            color: mColor,
            tokenIndex: mIdx,
            currentCoord: coord,
            isHopping: true,
            hopKey: Date.now() + currentStepIndex,
          });

          if (currentStepIndex % 2 === 0) sound.playTokenHop(currentStepIndex);

          currentStepIndex++;
          hopTimerRef.current = setTimeout(runHopStep, hopInterval);
        } else {
          setActiveHop(null);

          if (victimCol !== null && victimIdx !== null) {
            setVictimSwoosh({ color: victimCol, tokenIndex: victimIdx });
            setTimeout(() => {
              setVictimSwoosh(null);
            }, 450);
          }
        }
      };

      runHopStep();
    }
    // No cleanup here: a state sync (chat, reaction, next turn) arriving mid-hop used to cancel the
    // hop timer and freeze the token on an in-between square. The timer is cleared on unmount instead,
    // and a newer move clears it explicitly above.
  }, [gameState.players]);

  useEffect(() => {
    return () => {
      if (hopTimerRef.current) clearTimeout(hopTimerRef.current);
    };
  }, []);

  // Safety net: if a hop is left set (timer cancelled by an unmount or odd sync), clear it shortly.
  useEffect(() => {
    if (!activeHop) return;
    const watchdog = setTimeout(() => {
      setActiveHop((cur) => (cur && cur.hopKey === activeHop.hopKey ? null : cur));
    }, 450);
    return () => clearTimeout(watchdog);
  }, [activeHop]);

  // Smooth dice roll animation (silky momentum, no screen shake!)
  useEffect(() => {
    if (gameState.diceRolled && gameState.diceValue !== null) {
      setIsRollingAnimation(true);
      const rollTimer = setTimeout(() => setIsRollingAnimation(false), 460);
      return () => clearTimeout(rollTimer);
    }
  }, [gameState.stats.totalRolls, gameState.diceRolled, gameState.diceValue]);

  // Map tokens to coordinates and handle overlapping tokens
  const tokenPlacements = useMemo(() => {
    const list: {
      color: PlayerColor;
      tokenIndex: number;
      token: TokenPosition;
      coord: GridCoord;
      player: LobbyPlayer;
      isLegal: boolean;
      isMine: boolean;
      isHopping: boolean;
      hopKey: number;
      isSwooshing: boolean;
      isRisky: boolean;
    }[] = [];

    gameState.players.forEach((p) => {
      p.tokens.forEach((t, tIdx) => {
        const isHoppingThis =
          activeHop !== null &&
          activeHop.color === p.color &&
          activeHop.tokenIndex === tIdx;

        const isSwooshingThis =
          victimSwoosh !== null &&
          victimSwoosh.color === p.color &&
          victimSwoosh.tokenIndex === tIdx;

        const coord = isHoppingThis
          ? activeHop.currentCoord
          : getTokenCoordinates(p.color, t.step, tIdx);

        const isMine = p.id === userId;
        const isLegal =
          isMyTurn &&
          gameState.diceRolled &&
          isMine &&
          gameState.legalMoves.includes(tIdx);

        // Risk warning: a legal move that lands in front of an opponent gets a ⚠ badge
        let isRisky = false;
        if (isLegal) {
          const target = t.step < 0 ? 0 : t.step + (gameState.diceValue ?? 0);
          isRisky = countThreatsAt(p.color, target, gameState.players) > 0;
        }

        list.push({
          color: p.color,
          tokenIndex: tIdx,
          token: t,
          coord,
          player: p,
          isLegal,
          isMine,
          isHopping: isHoppingThis,
          hopKey: isHoppingThis ? activeHop.hopKey : 0,
          isSwooshing: isSwooshingThis,
          isRisky,
        });
      });
    });

    return list;
  }, [
    gameState.players,
    gameState.currentTurnColor,
    gameState.diceRolled,
    gameState.diceValue,
    gameState.legalMoves,
    userId,
    isMyTurn,
    activeHop,
    victimSwoosh,
  ]);

  // Group tokens occupying the same grid coordinate
  const cellTokenGroups = useMemo(() => {
    const map = new Map<
      string,
      { color: PlayerColor; tokenIndex: number; isLegal: boolean }[]
    >();
    tokenPlacements.forEach((tp) => {
      const key = `${tp.coord.r.toFixed(1)}_${tp.coord.c.toFixed(1)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({
        color: tp.color,
        tokenIndex: tp.tokenIndex,
        isLegal: tp.isLegal,
      });
    });
    return map;
  }, [tokenPlacements]);

  // Helper to check roll permission for a specific player
  const getCanRollForPlayer = (player: LobbyPlayer | undefined) => {
    if (!player) return false;
    const isCurrent = gameState.currentTurnColor === player.color;
    if (!isCurrent || gameState.diceRolled) return false;
    return player.id === userId;
  };

  // Mikasa Companion Dynamic Dialogue
  const mikasaDialogue = useMemo(() => {
    if (gameState.status === 'ended') {
      return 'Great match! Victory crown awarded! 🏆';
    }
    if (isMyTurn) {
      if (!gameState.diceRolled) {
        return 'Your turn! Tap your dice to roll 🎲';
      }
      if (gameState.legalMoves.length === 0) {
        return 'No legal moves available with this roll ⏩';
      }
      return `Rolled ${gameState.diceValue}! Tap your token to move ♟️`;
    }
    return `${activePlayer?.name || 'Player'} is making a move... ⏳`;
  }, [
    gameState.status,
    isMyTurn,
    gameState.diceRolled,
    gameState.legalMoves,
    gameState.diceValue,
    activePlayer,
  ]);

  // Memoized board and token layers: the 500ms timer tick and hop frames no longer
  // re-render the whole board, which was the main source of animation lag.
  const boardLayer = useMemo(
    () =>
      isLight ? (
        <LightLudoBoard boardRotation={boardRotationAngle} players={gameState.players} />
      ) : (
        <DarkLudoBoard boardRotation={boardRotationAngle} players={gameState.players} />
      ),
    [isLight, boardRotationAngle, gameState.players]
  );

  // Soft vignette over the board gives it depth without covering the tokens.
  const boardVignette = (
    <div
      className={`absolute inset-0 pointer-events-none rounded-2xl z-[1] ${
        isLight
          ? 'bg-[radial-gradient(circle_at_50%_45%,transparent_58%,rgba(120,80,40,0.10))]'
          : 'bg-[radial-gradient(circle_at_50%_45%,transparent_55%,rgba(0,0,0,0.35))]'
      }`}
    />
  );

  const tokenLayer = useMemo(
    () => (
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {tokenPlacements.map((item) => {
          const { color, tokenIndex, token, coord, isLegal, isHopping, hopKey, isSwooshing, isRisky } = item;

          const key = `${coord.r.toFixed(1)}_${coord.c.toFixed(1)}`;
          const group = cellTokenGroups.get(key) || [];
          const groupIdx = group.findIndex((g) => g.color === color && g.tokenIndex === tokenIndex);

          let offsetX = 0;
          let offsetY = 0;
          if (group.length > 1 && !isHopping) {
            offsetX = (groupIdx % 2 === 0 ? -1 : 1) * 3.5;
            offsetY = groupIdx >= 2 ? 3.5 : -3.5;
          }

          // Position with transform (GPU-composited) instead of top/left (layout work every frame).
          // Percentages inside translate() refer to the token's own size, which is one board cell.
          return (
            <div
              key={`token_${color}_${tokenIndex}`}
              style={{
                top: 0,
                left: 0,
                width: `${100 / 15}%`,
                height: `${100 / 15}%`,
                transform: `translate3d(calc(${coord.c * 100}% + ${offsetX}px), calc(${coord.r * 100}% + ${offsetY}px), 0) rotate(${-boardRotationAngle}deg)`,
                transition: isHopping
                  ? 'transform 92ms linear'
                  : isSwooshing
                  ? 'transform 260ms ease-out'
                  : 'transform 180ms ease-out',
                willChange: 'transform',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isLegal) {
                  sound.playClick();
                  sound.hapticImpact('light');
                  onMoveToken(tokenIndex);
                }
              }}
              className={`absolute flex items-center justify-center ${
                isLegal
                  ? 'cursor-pointer pointer-events-auto z-40'
                  : isHopping
                  ? 'z-50 pointer-events-none'
                  : 'z-20'
              }`}
            >
              {isLegal && isRisky && (
                <span
                  title="Risky: an opponent can capture here"
                  className="absolute -top-1 -right-1 z-30 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] leading-tight font-black shadow pointer-events-none"
                >
                  ⚠
                </span>
              )}
              <CustomLudoToken
                color={color}
                tokenIndex={tokenIndex}
                isLegal={isLegal}
                isHome={token.step >= MAX_STEP}
                isHopping={isHopping}
                hopKey={hopKey}
                isSwooshing={isSwooshing}
                theme={theme}
                onClick={() => {
                  if (isLegal) {
                    sound.playClick();
                    sound.hapticImpact('light');
                    onMoveToken(tokenIndex);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    ),
    [tokenPlacements, cellTokenGroups, boardRotationAngle, theme, onMoveToken]
  );

  return (
    <div className="flex-1 max-w-[460px] mx-auto w-full p-2 sm:p-3 flex flex-col justify-between gap-2.5 relative">
      {/* Spectators: eye count above the board; tap for names and profiles */}
      <div className="flex justify-end px-1 -mb-1 relative z-30">
        <SpectatorsButton spectators={gameState.spectators ?? []} isLight={isLight} />
      </div>

      {/* Light Mode Subtle Anime & Ludo Stickers in Background */}
      {isLight && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          <div className="absolute -top-3 -right-3 w-28 h-28 rounded-full border-2 border-amber-300/40 opacity-10 flex items-center justify-center rotate-12">
            <img
              src="/assets/mikasa-mascot.jpg"
              alt="Mikasa Watermark"
              className="w-full h-full rounded-full object-cover grayscale"
            />
          </div>
          <span className="cute-sticker absolute top-8 left-4 text-amber-500/20 text-xl font-black">
            🎲
          </span>
          <span className="cute-sticker absolute top-28 right-6 text-rose-500/20 text-lg">
            ⭐
          </span>
          <span className="cute-sticker absolute bottom-24 left-6 text-emerald-500/20 text-xl">
            🍀
          </span>
          <span className="cute-sticker absolute bottom-10 right-8 text-amber-500/20 text-xl">
            👑
          </span>
          <span className="cute-sticker absolute top-1/2 left-2 text-blue-500/15 text-lg">
            ✨
          </span>
          <span className="cute-sticker absolute top-1/3 right-3 text-amber-500/15 text-xl">
            ♟️
          </span>
        </div>
      )}

      {/* Game Moments & Reaction Fountain */}
      <GameMomentBanner moment={activeMoment} floatingEmojis={floatingEmojis} />

      {/* Ludo King Style Big Cool Animated Reaction Overlay (Bounded to Screen) */}
      <BigEmojiReaction reaction={activeQuickReaction || null} />

      {/* Main Board Arena Container */}
      <div className="w-full flex flex-col gap-2.5">
        {/* TOP BAR: Header controls & Mascot Dialogue Pill */}
        <div className="flex items-center justify-between gap-2 w-full px-1 z-10">
        {/* Back Button */}
        {onLeaveRoom && (
          <button
            onClick={() => {
              sound.playClick();
              onLeaveRoom();
            }}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-transform cursor-pointer active:scale-95 shrink-0 ${
              isLight
                ? 'bg-white border-amber-200 text-slate-700 shadow-xs'
                : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/10 text-slate-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Mikasa Companion Live Dialogue Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all flex-1 max-w-sm mx-auto ${
            isLight
              ? 'glass-panel-light text-slate-800'
              : 'glass-panel-dark text-slate-100 shadow-sm'
          }`}
        >
          <img
            src="/assets/mikasa-mascot.jpg"
            alt="Mikasa Mascot"
            className="w-6 h-6 rounded-full object-cover border border-amber-400 shrink-0 shadow-sm"
          />
          <span className="text-[11px] font-bold truncate">
            {mikasaDialogue}
          </span>
        </div>
      </div>

      {/* TOP PLAYERS ROW: Top-Left & Top-Right Stations (name bars stay above the board) */}
      <div className="flex items-start justify-between gap-2 w-full px-1 pb-1 relative z-20">
        <PlayerStation
          player={topLeftPlayer}
          color={topLeftColor}
          position="top-left"
          isCurrentTurn={
            Boolean(topLeftPlayer && gameState.currentTurnColor === topLeftPlayer.color)
          }
          canRoll={getCanRollForPlayer(topLeftPlayer)}
          diceValue={
            topLeftPlayer && gameState.currentTurnColor === topLeftPlayer.color
              ? gameState.diceValue
              : null
          }
          isRolling={
            Boolean(
              isRollingAnimation &&
                topLeftPlayer &&
                gameState.currentTurnColor === topLeftPlayer.color
            )
          }
          secondsLeft={secondsLeft}
          theme={theme}
          userId={userId}
          onRoll={onRollDice}
          onOpenChat={onOpenChat}
        />

        <PlayerStation
          player={topRightPlayer}
          color={topRightColor}
          position="top-right"
          isCurrentTurn={
            Boolean(topRightPlayer && gameState.currentTurnColor === topRightPlayer.color)
          }
          canRoll={getCanRollForPlayer(topRightPlayer)}
          diceValue={
            topRightPlayer && gameState.currentTurnColor === topRightPlayer.color
              ? gameState.diceValue
              : null
          }
          isRolling={
            Boolean(
              isRollingAnimation &&
                topRightPlayer &&
                gameState.currentTurnColor === topRightPlayer.color
            )
          }
          secondsLeft={secondsLeft}
          theme={theme}
          userId={userId}
          onRoll={onRollDice}
          onOpenChat={onOpenChat}
        />
      </div>

      {/* LUDO BOARD CENTERPIECE with Smooth 24px Rounded Corners & Deep 3D Bevels */}
      <div
        className={`relative w-full max-w-[420px] aspect-square mx-auto p-2 sm:p-2.5 rounded-[24px] select-none transition-transform duration-500 z-10 ${
          isMyTurn
            ? isLight
              ? 'ring-4 ring-rose-400/80 shadow-[0_0_30px_rgba(255,20,147,0.35)]'
              : 'ring-4 ring-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.45)]'
            : ''
        } ${
          isLight
            ? 'bg-gradient-to-br from-[#FFFFFF] via-[#F4F6FB] to-[#E2E8F0] border-4 border-slate-300/80 shadow-[0_20px_45px_rgba(14,23,38,0.1)] ring-1 ring-amber-300/40'
            : 'bg-gradient-to-br from-[#1E0836] via-[#120524] to-[#0A0216] border-4 border-purple-500/40 shadow-[0_22px_55px_rgba(0,0,0,0.88)] ring-1 ring-cyan-500/30'
        }`}
      >
        <div
          className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${boardRotationAngle}deg)` }}
        >
          {boardLayer}
          {boardVignette}
          {tokenLayer}
        </div>
      </div>

      {/* BOTTOM SECTION: Your Station (Bottom-Left) & Opponent (Bottom-Right) + In-Game Chat Dock */}
      <div className="flex flex-col gap-2 w-full z-10">
        {/* BOTTOM CONTROLS & CHAT ROW */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {/* In-Game Chat Button positioned at the bottom left above your station */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenChat();
              }}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-sm transition-transform cursor-pointer active:scale-95 ${
                isLight
                  ? 'glass-panel-light text-slate-800'
                  : 'glass-panel-dark text-slate-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[11px] font-bold">Chat</span>
              {unreadChatCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center animate-bounce">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Quick In-Match Emoji React Palette (Ludo King style) - completely hidden when chat is open */}
            {onQuickReact && !isChatOpen && (
              <QuickReactPalette
                onSelectEmoji={onQuickReact}
                theme={theme}
              />
            )}
          </div>
        </div>

        {/* BOTTOM PLAYERS ROW: Your station ALWAYS at Bottom-Left! Dice rolled by clicking directly on it! */}
        <div className="flex items-center justify-between gap-2 px-1">
          <PlayerStation
            player={bottomLeftPlayer}
            color={bottomLeftColor}
            position="bottom-left"
            isCurrentTurn={
              Boolean(
                bottomLeftPlayer &&
                  gameState.currentTurnColor === bottomLeftPlayer.color
              )
            }
            canRoll={getCanRollForPlayer(bottomLeftPlayer)}
            diceValue={
              bottomLeftPlayer &&
              gameState.currentTurnColor === bottomLeftPlayer.color
                ? gameState.diceValue
                : null
            }
            isRolling={
              Boolean(
                isRollingAnimation &&
                  bottomLeftPlayer &&
                  gameState.currentTurnColor === bottomLeftPlayer.color
              )
            }
            secondsLeft={secondsLeft}
            theme={theme}
            userId={userId}
            onRoll={onRollDice}
            onOpenChat={onOpenChat}
          />

          <PlayerStation
            player={bottomRightPlayer}
            color={bottomRightColor}
            position="bottom-right"
            isCurrentTurn={
              Boolean(
                bottomRightPlayer &&
                  gameState.currentTurnColor === bottomRightPlayer.color
              )
            }
            canRoll={getCanRollForPlayer(bottomRightPlayer)}
            diceValue={
              bottomRightPlayer &&
              gameState.currentTurnColor === bottomRightPlayer.color
                ? gameState.diceValue
                : null
            }
            isRolling={
              Boolean(
                isRollingAnimation &&
                  bottomRightPlayer &&
                  gameState.currentTurnColor === bottomRightPlayer.color
              )
            }
            secondsLeft={secondsLeft}
            theme={theme}
            userId={userId}
            onRoll={onRollDice}
            onOpenChat={onOpenChat}
          />
        </div>
      </div>
    </div>
  </div>
  );
};
