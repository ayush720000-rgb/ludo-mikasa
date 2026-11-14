/**
 * Telegram bot + Mini App settings. Override via Vite env vars at build time:
 *   VITE_BOT_USERNAME  - bot handle without the @ (default Ig_MikasaBot)
 *   VITE_MINIAPP_SHORT - Mini App short name set in BotFather (default ludo)
 *   VITE_PUBLIC_URL    - custom domain for result links, e.g. https://play.example.com
 * Share links are built from these, so changing them updates every share surface.
 */
const env = (import.meta as any).env || {};

export const BOT_USERNAME: string = (env.VITE_BOT_USERNAME || 'Ig_MikasaBot').replace(/^@/, '');
export const BOT_HANDLE = `@${BOT_USERNAME}`;
export const BOT_URL = `https://t.me/${BOT_USERNAME}`;
export const MINIAPP_SHORT_NAME: string = env.VITE_MINIAPP_SHORT || 'ludo';
export const MINIAPP_URL = `${BOT_URL}/${MINIAPP_SHORT_NAME}`;
export const PUBLIC_URL: string = (env.VITE_PUBLIC_URL || '').replace(/\/$/, '');
