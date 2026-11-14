import fs from 'fs';
import path from 'path';
import { ChatMessage, MatchStats, PlayerColor, PlayerProfile } from '../src/types/ludo';

export interface SavedMatch {
  id: string;
  code: string;
  players: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    color: PlayerColor;
    isBot: boolean;
  }[];
  winnerColor: PlayerColor;
  winnerId: string;
  stats: MatchStats;
  endedAt: number;
}

interface DBData {
  users: Record<string, PlayerProfile>;
  matches: SavedMatch[];
  chatHistory: Record<string, ChatMessage[]>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'ludo-db.json');

class StorageManager {
  private data: DBData = {
    users: {},
    matches: [],
    chatHistory: {},
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (e) {
      console.warn('Using in-memory store due to file init issue:', e);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  public getOrCreateUser(profile: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    isTelegram: boolean;
  }): PlayerProfile {
    if (this.data.users[profile.id]) {
      const user = this.data.users[profile.id];
      user.name = profile.name || user.name;
      if (profile.username) user.username = profile.username;
      if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
      this.save();
      return user;
    }

    const newUser: PlayerProfile = {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      isTelegram: profile.isTelegram,
      gamesPlayed: 0,
      wins: 0,
      captures: 0,
    };
    this.data.users[profile.id] = newUser;
    this.save();
    return newUser;
  }

  public getUser(id: string): PlayerProfile | null {
    return this.data.users[id] || null;
  }

  public recordMatchEnd(match: SavedMatch) {
    this.data.matches.unshift(match);
    if (this.data.matches.length > 50) {
      this.data.matches.pop();
    }

    // Update stats for human players
    match.players.forEach((p) => {
      if (p.isBot) return;
      const user = this.data.users[p.id];
      if (user) {
        user.gamesPlayed = (user.gamesPlayed || 0) + 1;
        if (p.id === match.winnerId) {
          user.wins = (user.wins || 0) + 1;
        }
      }
    });

    this.save();
  }

  public addCapture(userId: string) {
    const user = this.data.users[userId];
    if (user) {
      user.captures = (user.captures || 0) + 1;
      this.save();
    }
  }

  public getMatches(): SavedMatch[] {
    return this.data.matches.slice(0, 20);
  }

  public saveChat(roomCode: string, messages: ChatMessage[]) {
    this.data.chatHistory[roomCode] = messages.slice(-100);
    this.save();
  }

  public getChat(roomCode: string): ChatMessage[] {
    return this.data.chatHistory[roomCode] || [];
  }
}

export const storage = new StorageManager();
