export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type TokenState = 'yard' | 'track' | 'home_run' | 'finished';

export interface TokenPosition {
  id: number; // 0, 1, 2, 3
  state: TokenState;
  step: number; // 0 to 56 (56 = Center Home)
}

export interface PlayerProfile {
  id: string; // telegram user id or guest id
  name: string;
  username?: string;
  avatarUrl?: string;
  isTelegram: boolean;
  gamesPlayed: number;
  wins: number;
  captures: number;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  color: PlayerColor;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  isConnected: boolean;
  onlineStatus?: 'online' | 'afk' | 'offline'; // Green = online, Yellow = afk, Grey = offline
  consecutiveAutoTurns?: number; // Tracks consecutive AFK turns
  score?: number; // Match performance score
  rank?: number; // 1 = 1st, 2 = 2nd, 3 = 3rd, 4 = 4th
  gamesWon?: number;
  totalGames?: number;
  capturesCount?: number;
  tokens: [TokenPosition, TokenPosition, TokenPosition, TokenPosition];
}

export interface Spectator {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatReplyPreview {
  id: string;
  senderName: string;
  text: string;
}

export interface ChatReactionUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderColor?: PlayerColor;
  isSpectator: boolean;
  text: string;
  timestamp: number;
  replyTo?: ChatReplyPreview;
  reactions: Record<string, ChatReactionUser[]>; // emoji -> array of users who reacted
}

export interface MatchStats {
  durationSeconds: number;
  turnsCount: number;
  totalRolls: number;
  totalCaptures: number;
  totalSixes: number;
}

export interface GameState {
  code: string;
  status: 'waiting' | 'in_progress' | 'ended';
  hostId: string;
  players: LobbyPlayer[];
  /** Players who forfeited/AFK-quit; retained for final ranking cards. */
  departedPlayers?: LobbyPlayer[];
  spectators: Spectator[];
  currentTurnColor: PlayerColor;
  diceValue: number | null;
  diceRolled: boolean;
  turnStartTime: number;
  turnDuration: number; // e.g. 20 seconds
  legalMoves: number[]; // token indices 0..3 that can move
  consecutiveSixes: number;
  winnerColor: PlayerColor | null;
  winnerId: string | null;
  rankings: PlayerColor[];
  stats: MatchStats;
  lastAction?: {
    type: 'roll' | 'move' | 'capture' | 'home' | 'pass' | 'start' | 'timeout';
    description: string;
    color?: PlayerColor;
    tokenIndex?: number;
    extraTurn?: boolean;
  };
  chat: ChatMessage[];
  createdAt: number;
}

export interface QuickReactionEvent {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: PlayerColor;
  avatarUrl?: string;
  emoji: string;
  timestamp: number;
}

export interface WSMessage {
  type:
    | 'init_state'
    | 'join_lobby'
    | 'leave_lobby'
    | 'select_color'
    | 'toggle_ready'
    | 'add_bot'
    | 'remove_bot'
    | 'start_game'
    | 'roll_dice'
    | 'move_token'
    | 'turn_timeout'
    | 'rematch'
    | 'send_chat'
    | 'react_chat'
    | 'quick_reaction'
    | 'error'
    | 'sync';
  payload?: any;
}
