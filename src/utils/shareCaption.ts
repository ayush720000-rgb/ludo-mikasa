import { BOT_HANDLE } from './botConfig';
import { GameState, LobbyPlayer } from '../types/ludo';

const SMALL = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ';
/** Small-caps letters for labels (same look as the Mikasa bot messages). */
export const smallCaps = (text: string) =>
  text.replace(/[a-z]/gi, (ch) => SMALL[ch.toLowerCase().charCodeAt(0) - 97]);

const PLACES = ['🥇', '🥈', '🥉', '4.'];
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nameOf = (p?: LobbyPlayer) => (p?.name?.trim() || 'Player').slice(0, 32);

/** Final ranking, including players who left mid-match. */
export function getRankedPlayers(gameState: GameState): LobbyPlayer[] {
  const departed = (gameState.departedPlayers || []).filter((d) => !gameState.players.some((a) => a.id === d.id));
  return [...gameState.players, ...departed].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

/**
 * Result caption in the bot's pink/bunny theme: small-caps labels, blockquotes and bullets.
 * format 'html' is for Telegram prepared messages (supports <blockquote>);
 * 'text' is plain text for link sharing.
 */
export function buildMatchShareCaption(gameState: GameState, format: 'html' | 'text' = 'html', bot = BOT_HANDLE): string {
  const seconds = Math.max(0, Math.round(gameState.stats?.durationSeconds ?? 0));
  const duration = `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
  const ranked = getRankedPlayers(gameState);
  const html = format === 'html';
  const title = 'mikasa ludo · match results';
  const e = (v: string) => (html ? esc(v) : v);

  const info = [
    `• ${smallCaps('room')}: ${e(gameState.code)}`,
    `• ${smallCaps('duration')}: ${duration}`,
    `• ${smallCaps('captures')}: ${gameState.stats?.totalCaptures ?? 0}`,
    `• ${smallCaps('winner')}: ${PLACES[0]} ${e(nameOf(ranked[0]))}`,
  ];
  const board = ranked.map((p, i) => `${PLACES[i] ?? `${i + 1}.`} ${e(nameOf(p))}`);
  const quote = (lines: string[]) =>
    html ? `<blockquote>${lines.join('\n')}</blockquote>` : lines.map((l) => `▎${l}`).join('\n');

  const text = [
    html ? `🎀 <b>${smallCaps(title)}</b>` : `🎀 ${smallCaps(title)}`,
    quote(info),
    html ? `<b>${smallCaps('rankings')}</b>` : smallCaps('rankings'),
    quote(board),
    `🐰 ${bot}`,
  ].join('\n');
  return text;
}
