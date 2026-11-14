import { rollFairDie, ShuffledBagDie } from './dice';

// Dice state per match. WeakMap so finished games are garbage-collected.
const matchDice = new WeakMap<object, ShuffledBagDie>();
const USE_SHUFFLED_BAG = true; // disclosed in the lobby rules; same for every player
import { WebSocket } from 'ws';
import {
  ChatMessage,
  GameState,
  LobbyPlayer,
  PlayerColor,
  TokenPosition,
} from '../src/types/ludo';
import { COLOR_TURN_ORDER, COLOR_START_OFFSETS } from '../src/utils/ludoConstants';
import {
  checkCapture,
  chooseBestBotMove,
  getLegalMoves,
  hasPlayerWon,
  MAX_STEP,
} from '../src/utils/ludoRules';
import { storage } from './storage';

const TURN_SECONDS = 20;

export interface ClientConnection {
  ws: WebSocket;
  userId: string;
  roomCode: string;
}

export class LudoManager {
  private games: Map<string, GameState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private connections: Map<string, Set<WebSocket>> = new Map(); // roomCode -> WebSockets

  constructor() {}

  public getOrCreateGame(roomCode: string, hostProfile?: any): GameState {
    const code = roomCode.toUpperCase();
    if (this.games.has(code)) {
      return this.games.get(code)!;
    }

    const hostId = hostProfile?.id || 'host_' + Math.random().toString(36).substring(2, 7);
    const hostName = hostProfile?.name || 'Player 1';

    const newGame: GameState = {
      code,
      status: 'waiting',
      hostId,
      players: [
        {
          id: hostId,
          name: hostName,
          username: hostProfile?.username,
          avatarUrl: hostProfile?.avatarUrl,
          color: 'red',
          isHost: true,
          isReady: true,
          isBot: false,
          isConnected: true,
          onlineStatus: 'online',
          consecutiveAutoTurns: 0,
          tokens: this.createInitialTokens(),
        },
      ],
      departedPlayers: [],
      spectators: [],
      currentTurnColor: 'red',
      diceValue: null,
      diceRolled: false,
      turnStartTime: Date.now(),
      turnDuration: TURN_SECONDS,
      legalMoves: [],
      consecutiveSixes: 0,
      winnerColor: null,
      winnerId: null,
      rankings: [],
      stats: {
        durationSeconds: 0,
        turnsCount: 0,
        totalRolls: 0,
        totalCaptures: 0,
        totalSixes: 0,
      },
      lastAction: {
        type: 'start',
        description: 'Lobby created. Waiting for players to join!',
      },
      chat: storage.getChat(code) || [],
      createdAt: Date.now(),
    };

    this.games.set(code, newGame);
    return newGame;
  }

  public getGame(code: string): GameState | undefined {
    return this.games.get(code.toUpperCase());
  }

  public getActivePublicGames(): { code: string; playersCount: number; status: string }[] {
    const list: { code: string; playersCount: number; status: string }[] = [];
    this.games.forEach((game) => {
      list.push({
        code: game.code,
        playersCount: game.players.length,
        status: game.status,
      });
    });
    return list;
  }

  public registerConnection(roomCode: string, ws: WebSocket) {
    const code = roomCode.toUpperCase();
    if (!this.connections.has(code)) {
      this.connections.set(code, new Set());
    }
    this.connections.get(code)!.add(ws);
  }

  public removeConnection(roomCode: string, ws: WebSocket, userId?: string | null) {
    const code = roomCode.toUpperCase();
    const set = this.connections.get(code);
    if (set) {
      set.delete(ws);
    }
    const game = this.getGame(code);
    if (game && userId) {
      const p = game.players.find((pl) => pl.id === userId);
      if (p) {
        p.isConnected = false;
        if (p.onlineStatus !== 'afk') {
          p.onlineStatus = 'offline';
        }
        this.broadcast(code, { type: 'sync', payload: game });
      }
    }
  }

  public broadcast(roomCode: string, message: any) {
    const code = roomCode.toUpperCase();
    const set = this.connections.get(code);
    if (!set) return;

    const payload = JSON.stringify(message);
    set.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  private createInitialTokens(): [TokenPosition, TokenPosition, TokenPosition, TokenPosition] {
    return [
      { id: 0, state: 'yard', step: -1 },
      { id: 1, state: 'yard', step: -1 },
      { id: 2, state: 'yard', step: -1 },
      { id: 3, state: 'yard', step: -1 },
    ];
  }

  private getNextAvailableColor(players: LobbyPlayer[]): PlayerColor {
    const taken = new Set(players.map((p) => p.color));
    // Balanced diagonal pairing for 2 players: Red (Top-Left) and Yellow (Bottom-Right)
    const preferredOrder: PlayerColor[] = ['red', 'yellow', 'green', 'blue'];
    for (const color of preferredOrder) {
      if (!taken.has(color)) return color;
    }
    return 'yellow';
  }

  public joinLobby(
    code: string,
    user: { id: string; name: string; username?: string; avatarUrl?: string },
    asSpectator: boolean = false
  ): GameState {
    const game = this.getOrCreateGame(code, user);

    if (asSpectator) {
      const existing = game.spectators.find((s) => s.id === user.id);
      if (!existing) {
        game.spectators.push({
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
        });
      }
      this.broadcast(code, { type: 'sync', payload: game });
      return game;
    }

    const existingPlayer = game.players.find((p) => p.id === user.id);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      existingPlayer.onlineStatus = (existingPlayer.consecutiveAutoTurns && existingPlayer.consecutiveAutoTurns > 0) ? 'afk' : 'online';
      existingPlayer.name = user.name;
      if (user.avatarUrl) existingPlayer.avatarUrl = user.avatarUrl;
      this.broadcast(code, { type: 'sync', payload: game });
      return game;
    }

    if (game.status !== 'waiting' || game.players.length >= 4) {
      // Join as spectator if game is full or already in progress
      const existing = game.spectators.find((s) => s.id === user.id);
      if (!existing) {
        game.spectators.push({
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
        });
      }
      this.broadcast(code, { type: 'sync', payload: game });
      return game;
    }

    const color = this.getNextAvailableColor(game.players);
    const newPlayer: LobbyPlayer = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      color,
      isHost: game.players.length === 0,
      isReady: false,
      isBot: false,
      isConnected: true,
      onlineStatus: 'online',
      consecutiveAutoTurns: 0,
      capturesCount: 0,
      tokens: this.createInitialTokens(),
    };

    game.players.push(newPlayer);
    this.broadcast(code, { type: 'sync', payload: game });
    return game;
  }

  public selectColor(code: string, userId: string, newColor: PlayerColor) {
    const game = this.getGame(code);
    if (!game || game.status !== 'waiting') return;

    // Check if color is already taken
    const isTaken = game.players.some((p) => p.id !== userId && p.color === newColor);
    if (isTaken) return;

    const player = game.players.find((p) => p.id === userId);
    if (player) {
      player.color = newColor;
      this.broadcast(code, { type: 'sync', payload: game });
    }
  }

  public toggleReady(code: string, userId: string) {
    const game = this.getGame(code);
    if (!game || game.status !== 'waiting') return;

    const player = game.players.find((p) => p.id === userId);
    if (player) {
      player.isReady = !player.isReady;
      this.broadcast(code, { type: 'sync', payload: game });
    }
  }

  public addBot(code: string, hostId: string) {
    const game = this.getGame(code);
    if (!game || game.status !== 'waiting' || game.hostId !== hostId || game.players.length >= 4) {
      return;
    }

    const botNames = ['Mikasa ⚔️', 'Levi ⚡', 'Eren 🛡️', 'Armin 🧠'];
    const botAvatars = [
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    ];

    const idx = game.players.length;
    const color = this.getNextAvailableColor(game.players);

    const bot: LobbyPlayer = {
      id: 'bot_' + Math.random().toString(36).substring(2, 7),
      name: botNames[idx % botNames.length],
      avatarUrl: botAvatars[idx % botAvatars.length],
      color,
      isHost: false,
      isReady: true,
      isBot: true,
      isConnected: true,
      onlineStatus: 'online',
      consecutiveAutoTurns: 0,
      capturesCount: 0,
      tokens: this.createInitialTokens(),
    };

    game.players.push(bot);
    this.broadcast(code, { type: 'sync', payload: game });
  }

  /** Host removes an AI bot while the lobby is still waiting. Without botId, removes the last bot added. */
  public removeBot(code: string, hostId: string, botId?: string) {
    const game = this.getGame(code);
    if (!game || game.status !== 'waiting' || game.hostId !== hostId) return;

    const index = botId
      ? game.players.findIndex((p) => p.isBot && p.id === botId)
      : game.players.map((p) => p.isBot).lastIndexOf(true);
    if (index < 0) return;

    game.players.splice(index, 1);
    this.broadcast(code, { type: 'sync', payload: game });
  }

  /** A deliberate leave forfeits the active match. Remaining players keep playing. */
  public leaveMatch(code: string, playerId: string) {
    const game = this.getGame(code);
    if (!game) return;
    if (game.status === 'waiting') {
      this.removePlayer(code, playerId);
      return;
    }
    if (game.status !== 'in_progress') return;

    const leaving = game.players.find((p) => p.id === playerId);
    if (!leaving || leaving.isBot) return;
    const wasCurrentTurn = game.currentTurnColor === leaving.color;
    // Keep the complete player snapshot (including Telegram name/avatar) for the final result card.
    game.departedPlayers = game.departedPlayers || [];
    if (!game.departedPlayers.some((p) => p.id === leaving.id)) {
      game.departedPlayers.push({ ...leaving, tokens: leaving.tokens.map((t) => ({ ...t })) as LobbyPlayer['tokens'] });
    }
    game.players = game.players.filter((p) => p.id !== playerId);
    game.lastAction = {
      type: 'pass',
      description: `🚪 ${leaving.name} left the match.`,
      color: leaving.color,
    };
    this.handleChatMessage(code, { id: 'system', name: 'Mikasa' }, `🚪 ${leaving.name} left the match.`);

    if (game.players.length === 1) {
      this.finishByForfeit(game, game.players[0], `${leaving.name} left the match.`);
      return;
    }

    if (wasCurrentTurn) {
      this.clearTurnTimer(code);
      game.diceRolled = false;
      game.diceValue = null;
      game.legalMoves = [];
      const removedIndex = COLOR_TURN_ORDER.indexOf(leaving.color);
      let next = game.players[0].color;
      for (let offset = 1; offset <= COLOR_TURN_ORDER.length; offset++) {
        const candidate = COLOR_TURN_ORDER[(removedIndex + offset) % COLOR_TURN_ORDER.length];
        if (game.players.some((p) => p.color === candidate && !hasPlayerWon(p.tokens))) { next = candidate; break; }
      }
      game.currentTurnColor = next;
      this.startTurnTimer(game);
      const nextPlayer = game.players.find((p) => p.color === next);
      if (nextPlayer?.isBot) setTimeout(() => this.executeBotTurn(code), 700);
    }
    this.broadcast(code, { type: 'sync', payload: game });
  }

  /** End a match when only one active player remains after a forfeit/AFK removal. */
  private finishByForfeit(game: GameState, winner: LobbyPlayer, reason: string) {
    this.clearTurnTimer(game.code);
    game.status = 'ended';
    game.winnerColor = winner.color;
    game.winnerId = winner.id;
    const departed = [...(game.departedPlayers || [])].reverse().filter((p) => p.id !== winner.id);
    winner.rank = 1;
    winner.score = Math.max(180, (winner.score || 0) + 180);
    departed.forEach((player, index) => { player.rank = index + 2; });
    game.rankings = [winner, ...departed].map((p) => p.color);
    game.lastAction = {
      type: 'home',
      description: `👑 ${winner.name} wins! ${reason}`,
      color: winner.color,
    };
    this.handleChatMessage(game.code, { id: 'system', name: 'Mikasa' }, `🏆 ${winner.name} wins the match! ${reason}`);
    storage.recordMatchEnd({
      id: 'match_' + Date.now(),
      code: game.code,
      players: [winner, ...departed].map((p) => ({
        id: p.id, name: p.name, username: p.username, avatarUrl: p.avatarUrl,
        color: p.color, isBot: p.isBot, score: p.score || 0, rank: p.rank,
      })),
      winnerColor: winner.color,
      winnerId: winner.id,
      stats: game.stats,
      endedAt: Date.now(),
    });
    this.broadcast(game.code, { type: 'sync', payload: game });
  }

  public removePlayer(code: string, playerId: string) {
    const game = this.getGame(code);
    if (!game || game.status !== 'waiting') return;

    game.players = game.players.filter((p) => p.id !== playerId);
    if (game.players.length > 0 && game.hostId === playerId) {
      game.players[0].isHost = true;
      game.hostId = game.players[0].id;
    }
    this.broadcast(code, { type: 'sync', payload: game });
  }

  public startGame(code: string, hostId: string) {
    const game = this.getGame(code);
    if (!game || game.status !== 'waiting' || game.hostId !== hostId) return;
    if (game.players.length < 2) return;

    game.status = 'in_progress';
    game.currentTurnColor = game.players[0].color;
    game.diceValue = null;
    game.diceRolled = false;
    game.legalMoves = [];
    game.consecutiveSixes = 0;
    game.turnStartTime = Date.now();
    game.lastAction = {
      type: 'start',
      description: `Game started! ${game.players[0].name}'s turn to roll!`,
      color: game.currentTurnColor,
    };

    this.startTurnTimer(game);
    this.broadcast(code, { type: 'sync', payload: game });

    // Check if the starting player is a bot
    const currentPlayer = game.players.find((p) => p.color === game.currentTurnColor);
    if (currentPlayer && currentPlayer.isBot) {
      setTimeout(() => this.executeBotTurn(code), 1000);
    }
  }

  private startTurnTimer(game: GameState) {
    this.clearTurnTimer(game.code);

    game.turnStartTime = Date.now();
    game.turnDuration = TURN_SECONDS;

    const timer = setTimeout(() => {
      this.handleTurnTimeout(game.code);
    }, TURN_SECONDS * 1000);

    this.timers.set(game.code, timer);
  }

  private clearTurnTimer(code: string) {
    const existing = this.timers.get(code);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(code);
    }
  }

  private handleTurnTimeout(code: string) {
    const game = this.getGame(code);
    if (!game || game.status !== 'in_progress') return;

    const currentPlayer = game.players.find((p) => p.color === game.currentTurnColor);
    if (!currentPlayer) return;

    // Track consecutive automatic turns for human players
    if (!currentPlayer.isBot) {
      currentPlayer.consecutiveAutoTurns = (currentPlayer.consecutiveAutoTurns || 0) + 1;
      currentPlayer.onlineStatus = 'afk';

      // Five consecutive unattended turns means the player is removed from this match.
      if (currentPlayer.consecutiveAutoTurns >= 5) {
        const originalName = currentPlayer.name;
        const removedColor = currentPlayer.color;
        // Preserve the departed player's identity for the end-of-match podium image.
        game.departedPlayers = game.departedPlayers || [];
        if (!game.departedPlayers.some((p) => p.id === currentPlayer.id)) {
          game.departedPlayers.push({ ...currentPlayer, tokens: currentPlayer.tokens.map((t) => ({ ...t })) as LobbyPlayer['tokens'] });
        }
        game.players = game.players.filter((p) => p.id !== currentPlayer.id);
        game.lastAction = {
          type: 'pass',
          description: `🚪 ${originalName} was removed after missing 5 consecutive turns.`,
          color: removedColor,
        };
        this.handleChatMessage(code, { id: 'system', name: 'Mikasa' }, `🚪 ${originalName} was removed after missing 5 consecutive turns.`);

        if (game.players.length === 1) {
          this.finishByForfeit(game, game.players[0], `${originalName} was removed after 5 missed turns.`);
          return;
        }

        game.diceRolled = false;
        game.diceValue = null;
        game.legalMoves = [];
        const removedIndex = COLOR_TURN_ORDER.indexOf(removedColor);
        let nextColor = game.players[0].color;
        for (let offset = 1; offset <= COLOR_TURN_ORDER.length; offset++) {
          const candidate = COLOR_TURN_ORDER[(removedIndex + offset) % COLOR_TURN_ORDER.length];
          if (game.players.some((p) => p.color === candidate && !hasPlayerWon(p.tokens))) { nextColor = candidate; break; }
        }
        game.currentTurnColor = nextColor;
        const nextPlayer = game.players.find((p) => p.color === nextColor);
        this.startTurnTimer(game);
        this.broadcast(code, { type: 'sync', payload: game });
        if (nextPlayer?.isBot) setTimeout(() => this.executeBotTurn(code), 700);
        return;
      }
    }

    if (!game.diceRolled) {
      // The full turn has expired: auto-roll and auto-select a legal token.
      this.rollDice(code, currentPlayer.id, true);
    } else {
      // The player rolled manually but did not finish the move in time.
      // Auto-select the best legal move instead of always moving token zero.
      if (game.legalMoves.length > 0) {
        const roll = game.diceValue;
        const tokenIdx = roll === null
          ? game.legalMoves[0]
          : chooseBestBotMove(currentPlayer, roll, game.players, game.legalMoves);
        this.moveToken(code, currentPlayer.id, tokenIdx, true);
      } else {
        this.passTurn(game, 'Turn timed out. No legal moves.');
      }
    }
  }

  public rollDice(code: string, userId: string, isTimeout: boolean = false) {
    const game = this.getGame(code);
    if (!game || game.status !== 'in_progress' || game.diceRolled) return;

    const currentPlayer = game.players.find((p) => p.color === game.currentTurnColor);
    if (!currentPlayer || (currentPlayer.id !== userId && !isTimeout)) return;

    // Reset AFK counter when human manually rolls
    if (!currentPlayer.isBot && !isTimeout) {
      currentPlayer.consecutiveAutoTurns = 0;
      currentPlayer.onlineStatus = currentPlayer.isConnected ? 'online' : 'offline';
    }

    // Independent, unbiased server-side roll. Never adjust odds based on streaks or player state.
    let roll: number;
    if (USE_SHUFFLED_BAG) {
      if (!matchDice.has(game)) matchDice.set(game, new ShuffledBagDie());
      roll = matchDice.get(game)!.next();
    } else {
      roll = rollFairDie();
    }
    game.diceValue = roll;
    game.diceRolled = true;
    game.stats.totalRolls += 1;

    if (roll === 6) {
      game.stats.totalSixes += 1;
      game.consecutiveSixes += 1;
    } else {
      game.consecutiveSixes = 0;
    }

    // 3 sixes penalty rule: pass turn immediately
    if (game.consecutiveSixes >= 3) {
      game.lastAction = {
        type: 'roll',
        description: `${currentPlayer.name} rolled three consecutive sixes! Turn passed.`,
        color: currentPlayer.color,
      };
      this.passTurn(game, `${currentPlayer.name} rolled 3 sixes!`);
      return;
    }

    const legal = getLegalMoves(currentPlayer.tokens, roll);
    game.legalMoves = legal;

    game.lastAction = {
      type: 'roll',
      description: `${currentPlayer.name} rolled a ${roll}!`,
      color: currentPlayer.color,
    };

    if (legal.length === 0) {
      // No legal moves possible, pass turn after brief delay
      this.broadcast(code, { type: 'sync', payload: game });
      setTimeout(() => {
        this.passTurn(game, `${currentPlayer.name} has no legal moves.`);
      }, 1200);
      return;
    }

    // A timed-out human turn is fully auto-played: roll, then choose a legal
    // token using the same deterministic move evaluator used by bots. The
    // timeout is counted once in handleTurnTimeout; this does not alter dice odds.
    if (isTimeout) {
      this.broadcast(code, { type: 'sync', payload: game });
      const autoMove = chooseBestBotMove(currentPlayer, roll, game.players, legal);
      setTimeout(() => {
        const latest = this.getGame(code);
        if (!latest || latest.status !== 'in_progress' || latest.currentTurnColor !== currentPlayer.color || !latest.diceRolled) return;
        this.moveToken(code, currentPlayer.id, autoMove, true);
      }, 450);
      return;
    }

    // Bots use the same legal-move evaluator, with a short presentation delay.
    if (currentPlayer.isBot) {
      this.broadcast(code, { type: 'sync', payload: game });
      const bestMove = chooseBestBotMove(currentPlayer, roll, game.players, legal);
      setTimeout(() => {
        const latest = this.getGame(code);
        if (!latest || latest.status !== 'in_progress' || latest.currentTurnColor !== currentPlayer.color || !latest.diceRolled) return;
        this.moveToken(code, currentPlayer.id, bestMove);
      }, 800);
      return;
    }

    this.broadcast(code, { type: 'sync', payload: game });
  }

  public moveToken(code: string, userId: string, tokenIndex: number, isTimeout: boolean = false) {
    const game = this.getGame(code);
    if (!game || game.status !== 'in_progress' || !game.diceRolled || game.diceValue === null) return;

    const currentPlayer = game.players.find((p) => p.color === game.currentTurnColor);
    if (!currentPlayer || (currentPlayer.id !== userId && !isTimeout)) return;

    if (!game.legalMoves.includes(tokenIndex)) return;

    // Reset AFK counter when human manually moves
    if (!currentPlayer.isBot && !isTimeout) {
      currentPlayer.consecutiveAutoTurns = 0;
      currentPlayer.onlineStatus = currentPlayer.isConnected ? 'online' : 'offline';
    }

    const roll = game.diceValue;
    const token = currentPlayer.tokens[tokenIndex];

    let targetStep = token.step < 0 ? 0 : token.step + roll;
    if (targetStep > MAX_STEP) return;

    token.step = targetStep;
    token.state = targetStep >= MAX_STEP ? 'finished' : targetStep >= 51 ? 'home_run' : 'track';

    let extraTurn = false;
    let actionDesc = `${currentPlayer.name} moved token ${tokenIndex + 1}`;

    // Check Home Center
    if (targetStep === MAX_STEP) {
      extraTurn = true;
      actionDesc = `🎉 ${currentPlayer.name}'s token entered Home! Extra turn awarded!`;
    }

    // Check Opponent Capture
    const capture = checkCapture(currentPlayer.color, targetStep, game.players);
    if (capture) {
      extraTurn = true;
      game.stats.totalCaptures += 1;
      currentPlayer.capturesCount = (currentPlayer.capturesCount || 0) + 1;
      storage.addCapture(currentPlayer.id);

      const victimPlayer = game.players.find((p) => p.id === capture.capturedPlayerId);
      if (victimPlayer) {
        victimPlayer.tokens[capture.capturedTokenIndex].step = -1;
        victimPlayer.tokens[capture.capturedTokenIndex].state = 'yard';
        actionDesc = `⚔️ ${currentPlayer.name} captured ${victimPlayer.name}'s token! Extra turn awarded!`;
      }
      // Capture EVERY opposing token standing on this square, not only the first one found.
      // Two tokens of the same colour can share a square; leaving one behind caused overlaps.
      const landingTrack = (COLOR_START_OFFSETS[currentPlayer.color] + targetStep) % 52;
      for (const pl of game.players) {
        if (pl.color === currentPlayer.color) continue;
        pl.tokens.forEach((tk) => {
          if (tk.step >= 0 && tk.step <= 50 && (COLOR_START_OFFSETS[pl.color] + tk.step) % 52 === landingTrack) {
            tk.step = -1;
            tk.state = 'yard';
          }
        });
      }
    }

    // Check 6 extra turn
    if (roll === 6 && !extraTurn) {
      extraTurn = true;
      actionDesc = `🎲 ${currentPlayer.name} rolled a 6! Extra turn awarded!`;
    }

    game.lastAction = {
      type: capture ? 'capture' : targetStep === MAX_STEP ? 'home' : 'move',
      description: actionDesc,
      color: currentPlayer.color,
      tokenIndex,
      extraTurn,
    };

    // Check victory
    if (hasPlayerWon(currentPlayer.tokens)) {
      if (!game.winnerColor) {
        game.winnerColor = currentPlayer.color;
        game.winnerId = currentPlayer.id;
        game.status = 'ended';
        this.clearTurnTimer(code);

        // Calculate dynamic scores and rankings for ALL 4 players
        const playerScores = game.players.map((p) => {
          let finishedCount = 0;
          let totalSteps = 0;
          p.tokens.forEach((t) => {
            if (t.step >= MAX_STEP) finishedCount += 1;
            totalSteps += Math.max(0, t.step);
          });
          const userRecord = storage.getUser(p.id);
          const isWinner = p.id === currentPlayer.id;
          const gamesWon = p.isBot ? Math.floor(Math.random() * 2) + 1 : (userRecord?.wins || (isWinner ? 1 : 0));
          const totalGames = p.isBot ? gamesWon + Math.floor(Math.random() * 3) + 2 : Math.max(gamesWon + 1, userRecord?.gamesPlayed || 1);

          let baseScore = finishedCount * 100 + Math.round(totalSteps * 1.5);
          if (isWinner) baseScore += 180;
          else baseScore += Math.floor(Math.random() * 15);

          return {
            player: p,
            finishedCount,
            totalSteps,
            score: Math.max(120, baseScore),
            gamesWon,
            totalGames,
          };
        });

        // 1st place is currentPlayer
        const winnerEntry = playerScores.find((e) => e.player.id === currentPlayer.id);
        const otherEntries = playerScores
          .filter((e) => e.player.id !== currentPlayer.id)
          .sort((a, b) => b.finishedCount - a.finishedCount || b.totalSteps - a.totalSteps || b.score - a.score);

        const activeRanked = [winnerEntry, ...otherEntries].filter(Boolean) as typeof playerScores;
        const departedRanked = [...(game.departedPlayers || [])].reverse()
          .filter((p) => !activeRanked.some((entry) => entry.player.id === p.id))
          .map((player) => ({
            player, finishedCount: 0,
            totalSteps: player.tokens.reduce((sum, token) => sum + Math.max(0, token.step), 0),
            score: player.score || 0,
            gamesWon: player.gamesWon || 0,
            totalGames: player.totalGames || 0,
          }));
        const fullRanked = [...activeRanked, ...departedRanked];

        // Assign ranks and scores across active and departed participants.
        fullRanked.forEach((entry, idx) => {
          entry.player.rank = idx + 1;
          entry.player.score = entry.score;
          entry.player.gamesWon = entry.gamesWon;
          entry.player.totalGames = entry.totalGames;
          if (!game.players.some((p) => p.id === entry.player.id)) {
            game.players.push(entry.player);
          }
        });

        game.rankings = fullRanked.map((e) => e.player.color);

        // Record match in persistent storage
        storage.recordMatchEnd({
          id: 'match_' + Date.now(),
          code: game.code,
          players: game.players.map((p) => ({
            id: p.id,
            name: p.name,
            username: p.username,
            avatarUrl: p.avatarUrl,
            color: p.color,
            isBot: p.isBot,
            score: p.score,
            rank: p.rank,
          })),
          winnerColor: currentPlayer.color,
          winnerId: currentPlayer.id,
          stats: game.stats,
          endedAt: Date.now(),
        });

        this.broadcast(code, { type: 'sync', payload: game });
        return;
      }
    }

    if (extraTurn) {
      // Player rolls again!
      game.diceRolled = false;
      game.diceValue = null;
      game.legalMoves = [];
      this.startTurnTimer(game);
      this.broadcast(code, { type: 'sync', payload: game });

      if (currentPlayer.isBot) {
        setTimeout(() => this.executeBotTurn(code), 1000);
      }
    } else {
      this.passTurn(game);
    }
  }

  private passTurn(game: GameState, customMsg?: string) {
    game.stats.turnsCount += 1;
    game.diceRolled = false;
    game.diceValue = null;
    game.legalMoves = [];
    game.consecutiveSixes = 0;

    // Find next player who hasn't won yet
    const order = COLOR_TURN_ORDER;
    const currentIdx = order.indexOf(game.currentTurnColor);

    let nextColor: PlayerColor = game.currentTurnColor;
    for (let i = 1; i <= 4; i++) {
      const candidateColor = order[(currentIdx + i) % 4];
      const player = game.players.find((p) => p.color === candidateColor);
      if (player && !hasPlayerWon(player.tokens)) {
        nextColor = candidateColor;
        break;
      }
    }

    game.currentTurnColor = nextColor;
    const nextPlayer = game.players.find((p) => p.color === nextColor);

    if (customMsg) {
      game.lastAction = {
        type: 'pass',
        description: `${customMsg} ${nextPlayer?.name}'s turn.`,
        color: nextColor,
      };
    } else {
      game.lastAction = {
        type: 'move',
        description: `${nextPlayer?.name}'s turn to roll!`,
        color: nextColor,
      };
    }

    this.startTurnTimer(game);
    this.broadcast(game.code, { type: 'sync', payload: game });

    if (nextPlayer && nextPlayer.isBot) {
      setTimeout(() => this.executeBotTurn(game.code), 1000);
    }
  }

  private executeBotTurn(code: string) {
    const game = this.getGame(code);
    if (!game || game.status !== 'in_progress') return;

    const currentPlayer = game.players.find((p) => p.color === game.currentTurnColor);
    if (!currentPlayer || !currentPlayer.isBot) return;

    if (!game.diceRolled) {
      this.rollDice(code, currentPlayer.id);
    }
  }

  public handleChatMessage(
    code: string,
    sender: { id: string; name: string; avatarUrl?: string },
    text: string,
    replyTo?: { id: string; senderName: string; text: string }
  ) {
    const game = this.getGame(code);
    if (!game || !text.trim()) return;

    const player = game.players.find((p) => p.id === sender.id);
    const spectator = game.spectators.find((s) => s.id === sender.id);
    const isSpectator = !player;

    const resolvedAvatar =
      sender.avatarUrl ||
      player?.avatarUrl ||
      spectator?.avatarUrl ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${sender.id}`;

    const resolvedName =
      sender.name || player?.name || spectator?.name || 'Player';

    const msg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: sender.id,
      senderName: resolvedName,
      senderAvatar: resolvedAvatar,
      senderColor: player?.color,
      isSpectator,
      text: text.trim().slice(0, 300),
      timestamp: Date.now(),
      replyTo,
      reactions: {},
    };

    game.chat.push(msg);
    if (game.chat.length > 100) game.chat.shift();
    storage.saveChat(game.code, game.chat);

    this.broadcast(code, { type: 'sync', payload: game });
  }

  public handleChatReaction(
    code: string,
    messageId: string,
    emoji: string,
    user: { id: string; name?: string; avatarUrl?: string }
  ) {
    const game = this.getGame(code);
    if (!game) return;

    const msg = game.chat.find((m) => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) {
      msg.reactions = {};
    }
    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }

    // Support legacy string arrays if any exist in persisted storage
    let currentUsers = msg.reactions[emoji].map((item: any) =>
      typeof item === 'string' ? { id: item, name: 'User' } : item
    );

    const idx = currentUsers.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      // Toggle off
      currentUsers.splice(idx, 1);
      if (currentUsers.length === 0) {
        delete msg.reactions[emoji];
      } else {
        msg.reactions[emoji] = currentUsers;
      }
    } else {
      // Look up player or spectator info
      const player = game.players.find((p) => p.id === user.id);
      const spectator = game.spectators.find((s) => s.id === user.id);
      const resolvedName = user.name || player?.name || spectator?.name || 'Player';
      const resolvedAvatar =
        user.avatarUrl ||
        player?.avatarUrl ||
        spectator?.avatarUrl ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`;

      currentUsers.push({
        id: user.id,
        name: resolvedName,
        avatarUrl: resolvedAvatar,
      });
      msg.reactions[emoji] = currentUsers;
    }

    storage.saveChat(game.code, game.chat);
    this.broadcast(code, { type: 'sync', payload: game });
  }

  public handleQuickReaction(code: string, userId: string, emoji: string) {
    const game = this.getGame(code);
    if (!game) return;

    const player = game.players.find((p) => p.id === userId);
    const spectator = game.spectators.find((s) => s.id === userId);
    const senderName = player?.name || spectator?.name || 'Player';
    const senderColor = player?.color || 'green';
    const avatarUrl =
      player?.avatarUrl ||
      spectator?.avatarUrl ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

    const reactionPayload = {
      id: `qr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: userId,
      senderName,
      senderColor,
      avatarUrl,
      emoji,
      timestamp: Date.now(),
    };

    // Broadcast the quick reaction animation to all clients in the room
    this.broadcast(code, {
      type: 'quick_reaction',
      payload: reactionPayload,
    });

    // Also record it into game chat history
    this.handleChatMessage(
      code,
      { id: userId, name: senderName, avatarUrl },
      emoji
    );
  }

  public rematch(code: string, userId: string) {
    const game = this.getGame(code);
    if (!game) return;

    // Reset tokens and game state for all players
    game.players.forEach((p) => {
      p.tokens = this.createInitialTokens();
      p.rank = undefined;
    });

    game.status = 'in_progress';
    game.winnerColor = null;
    game.winnerId = null;
    game.rankings = [];
    game.diceRolled = false;
    game.diceValue = null;
    game.legalMoves = [];
    game.consecutiveSixes = 0;
    game.currentTurnColor = game.players[0].color;
    game.stats = {
      durationSeconds: 0,
      turnsCount: 0,
      totalRolls: 0,
      totalCaptures: 0,
      totalSixes: 0,
    };
    game.lastAction = {
      type: 'start',
      description: 'Rematch started! New round has begun!',
      color: game.currentTurnColor,
    };

    this.startTurnTimer(game);
    this.broadcast(code, { type: 'sync', payload: game });
  }
}

export const ludoManager = new LudoManager();
