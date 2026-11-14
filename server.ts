import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { ludoManager } from './server/ludoManager';
import { storage } from './server/storage';
import { validateTelegramInitData, createTelegramSessionToken, validateTelegramSessionToken } from './server/telegramAuth';
import { TelegramBotService } from './server/telegramBot';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT) || 3000;

// Telegram bot (/start and inline mode). Webhook route on Render, so Telegram messages wake the instance.
const telegramBot = new TelegramBotService(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`);
telegramBot.mountWebhook(app);

app.use(express.json({ limit: '8mb' }));

// API: Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'Mikasa ~ Ludo 🎲',
    timestamp: Date.now(),
  });
});

// Telegram Bot API profile/photo cache. The bot token stays server-side only.
const telegramFilePathCache = new Map<string, { path: string; expiresAt: number }>();

async function getTelegramChatProfile(userId: number, botToken: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${userId}`, {
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json() as any;
    if (!response.ok || !payload.ok || !payload.result) return null;
    const chat = payload.result;
    const photoFileId = chat.photo?.small_file_id || chat.photo?.big_file_id;
    return {
      name: [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title,
      username: chat.username,
      photoFileId,
    };
  } catch (error) {
    console.warn('Telegram getChat profile lookup failed; using signed WebApp profile:', error);
    return null;
  }
}

const SHARE_SESSION_ERROR = 'Your Telegram sharing session needs refreshing. Close and reopen the Mini App, then try again.';

// Accept either the signed session issued at login (valid for days, survives WebView reloads)
// or the live WebApp initData. Returns the Telegram user id, or undefined if neither proves identity.
function resolveShareUserId(initData: unknown, sessionToken: unknown, botToken: string): number | undefined {
  if (typeof sessionToken === 'string' && sessionToken) {
    const session = validateTelegramSessionToken(sessionToken, botToken);
    if (session.valid && session.userId) return session.userId;
    console.warn('Result share: session token rejected or expired');
  }
  if (typeof initData === 'string' && initData) {
    const auth = validateTelegramInitData(initData, botToken);
    if (auth.valid && auth.user) return auth.user.id;
    console.warn('Result share: initData rejected:', auth.reason);
  }
  return undefined;
}

// Serves Telegram profile photos without ever exposing TELEGRAM_BOT_TOKEN to the browser.
app.get('/api/telegram/avatar', async (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const fileId = String(req.query.file_id || '');
  if (!botToken || !fileId || fileId.length > 1024) return res.sendStatus(404);

  try {
    let cached = telegramFilePathCache.get(fileId);
    if (!cached || cached.expiresAt < Date.now()) {
      const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`, {
        signal: AbortSignal.timeout(8000),
      });
      const filePayload = await fileResponse.json() as any;
      if (!fileResponse.ok || !filePayload.ok || !filePayload.result?.file_path) return res.sendStatus(404);
      cached = { path: filePayload.result.file_path, expiresAt: Date.now() + 50 * 60 * 1000 };
      telegramFilePathCache.set(fileId, cached);
    }

    const imageResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${cached.path}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!imageResponse.ok) return res.sendStatus(404);
    const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
    res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(imageBytes);
  } catch (error) {
    console.error('Telegram avatar proxy failed:', error);
    res.sendStatus(502);
  }
});

// Proxy Telegram WebApp profile-photo URLs so canvas export remains same-origin and shareable.
app.get('/api/telegram/avatar-url', async (req, res) => {
  const raw = String(req.query.url || '');
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const allowed = host === 't.me' || host === 'telegram.org' || host.endsWith('.telegram.org') || host === 'telegram-cdn.org' || host.endsWith('.telegram-cdn.org') || host === 'telesco.pe' || host.endsWith('.telesco.pe');
    if (parsed.protocol !== 'https:' || !allowed) return res.sendStatus(400);
    const imageResponse = await fetch(parsed.toString(), { signal: AbortSignal.timeout(10000) });
    if (!imageResponse.ok) return res.sendStatus(404);
    const contentType = imageResponse.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return res.sendStatus(415);
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) return res.sendStatus(413);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(bytes);
  } catch {
    res.sendStatus(400);
  }
});

// Prepare a real Telegram-native shareable photo message. The Mini App then calls
// Telegram.WebApp.shareMessage(), which opens Telegram's chat picker with the PNG + caption.
// ---- Hosted result links: share works even when the bot-token route is unavailable ----
// The PNG is kept in memory for 24h behind an unguessable id. Telegram builds a link preview
// (image + text) from the Open Graph tags on /r/:id when the link is sent to a chat.
const sharedResults = new Map<string, { png: Buffer; text: string; at: number }>();
const SHARE_TTL_MS = 24 * 60 * 60 * 1000;
const SHARE_MAX_ITEMS = 150;
// Bot handle and Mini App link come from env so a custom domain/bot works without code edits.
const BOT_USERNAME = (process.env.BOT_USERNAME || process.env.VITE_BOT_USERNAME || 'Ig_MikasaBot').replace(/^@/, '');
const BOT_HANDLE = `@${BOT_USERNAME}`;
const BOT_URL = `https://t.me/${BOT_USERNAME}`;
const MINIAPP_SHORT = process.env.MINIAPP_SHORT_NAME || process.env.VITE_MINIAPP_SHORT || 'ludo';
const MINIAPP_URL = `${BOT_URL}/${MINIAPP_SHORT}`;
const shareHits = new Map<string, number[]>();
const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pruneSharedResults() {
  const now = Date.now();
  for (const [id, item] of sharedResults) if (now - item.at > SHARE_TTL_MS) sharedResults.delete(id);
  while (sharedResults.size > SHARE_MAX_ITEMS) {
    const oldest = sharedResults.keys().next().value;
    if (!oldest) break;
    sharedResults.delete(oldest);
  }
}

function publicOrigin(req: express.Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol).split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

app.post('/api/results/host', (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (shareHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 10) return res.status(429).json({ error: 'Too many shares. Please wait a few minutes.' });

  const { imageBase64, caption } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64) return res.status(400).json({ error: 'Missing image.' });
  const png = Buffer.from(imageBase64, 'base64');
  const isPng = png.length > 8 && png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47;
  if (!isPng || png.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'Invalid result image.' });

  recent.push(now);
  shareHits.set(ip, recent);
  pruneSharedResults();
  const id = crypto.randomBytes(9).toString('hex');
  sharedResults.set(id, { png, text: String(caption || '').slice(0, 900), at: now });
  res.json({ id, url: `${publicOrigin(req)}/r/${id}` });
});

app.get('/r/:id.png', (req, res) => {
  const item = sharedResults.get(req.params.id);
  if (!item) return res.status(404).end();
  res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }).send(item.png);
});

// JSON for the Mini App to show a shared result inside Telegram.
app.get('/api/results/:id', (req, res) => {
  const item = sharedResults.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'This result link has expired.' });
  res.json({ text: item.text, imageUrl: `/r/${req.params.id}.png` });
});

// Shared result link. Telegram's crawler reads the Open Graph tags for the preview.
// Real visitors (opened from a chat) are sent into the Mini App, so the result opens inside Telegram.
app.get('/r/:id', (req, res) => {
  const item = sharedResults.get(req.params.id);
  if (!item) return res.status(404).send('This result link has expired.');
  const origin = publicOrigin(req);
  const image = `${origin}/r/${req.params.id}.png`;
  const text = escapeHtml(item.text);
  const appLink = `${MINIAPP_URL}?startapp=result_${encodeURIComponent(req.params.id)}`;
  const appLinkJs = JSON.stringify(appLink);
  res.set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mikasa Ludo - Match Results</title>
<meta property="og:type" content="website"><meta property="og:title" content="Mikasa Ludo - Match Results">
<meta property="og:description" content="${text}"><meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${escapeHtml(appLink)}">
</head>
<body style="margin:0;background:#1a0b2e;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:16px">
<img src="${image}" alt="Match results" style="max-width:100%;border-radius:16px">
<p style="white-space:pre-line">${text}</p>
<p><a style="color:#ff8fb8" href="${escapeHtml(appLink)}">Open in Mikasa Ludo</a></p>
<script>location.replace(${appLinkJs});</script></body></html>`);
});

app.post('/api/results/prepare-share', async (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const { initData, sessionToken, imageBase64, caption } = req.body || {};
  if (!botToken) return res.status(503).json({ error: 'Telegram result sharing is not configured.' });
  const userId = resolveShareUserId(initData, sessionToken, botToken);
  if (!userId) return res.status(401).json({ error: SHARE_SESSION_ERROR });
  const auth = { user: { id: userId } };
  if (typeof imageBase64 !== 'string' || imageBase64.length > 6 * 1024 * 1024) return res.status(413).json({ error: 'The result image is missing or too large.' });

  let temporaryMessageId: number | undefined;
  try {
    const bytes = Buffer.from(imageBase64, 'base64');
    if (!bytes.length || bytes.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'The result image is too large.' });

    // Upload once to Telegram to obtain a reusable file_id for InlineQueryResultCachedPhoto.
    const uploadForm = new FormData();
    uploadForm.append('chat_id', String(auth.user.id));
    uploadForm.append('photo', new Blob([bytes], { type: 'image/png' }), 'mikasa-ludo-results.png');
    const uploadResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST', body: uploadForm, signal: AbortSignal.timeout(20000),
    });
    const uploadPayload = await uploadResponse.json() as any;
    if (!uploadResponse.ok || !uploadPayload.ok || !uploadPayload.result?.photo?.length) {
      const description = String(uploadPayload.description || 'Telegram could not upload the result image.');
      return res.status(502).json({ error: description.includes('chat not found') || description.includes('bot was blocked')
        ? `Open ${BOT_HANDLE} and press Start once, then try sharing again.` : description });
    }
    temporaryMessageId = uploadPayload.result.message_id;
    const photoSizes = uploadPayload.result.photo;
    const photoFileId = photoSizes[photoSizes.length - 1]?.file_id;
    if (!photoFileId) throw new Error('Telegram did not return a reusable photo file ID.');

    const inlineResult = {
      type: 'photo',
      id: `ludo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      photo_file_id: photoFileId,
      caption: String(caption || '🎲 Mikasa Ludo — Match Results').slice(0, 1024),
      ...(req.body?.parseMode === 'HTML' ? { parse_mode: 'HTML' } : {}),
    };
    const preparedResponse = await fetch(`https://api.telegram.org/bot${botToken}/savePreparedInlineMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        result: inlineResult,
        allow_user_chats: true,
        allow_group_chats: true,
        allow_channel_chats: true,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const preparedPayload = await preparedResponse.json() as any;
    if (!preparedResponse.ok || !preparedPayload.ok || !preparedPayload.result?.id) {
      const description = String(preparedPayload.description || 'Telegram could not prepare the shareable result.');
      throw new Error(description);
    }

    // The prepared inline message now owns a reusable Telegram file reference; remove the
    // temporary private-chat upload so the user only sees the chosen destination share.
    await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: auth.user.id, message_id: temporaryMessageId }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
    return res.json({ success: true, preparedMessageId: preparedPayload.result.id });
  } catch (error) {
    if (temporaryMessageId) {
      await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: auth.user.id, message_id: temporaryMessageId }),
      }).catch(() => {});
    }
    console.error('Preparing Telegram result share failed:', error);
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Could not prepare the result image for Telegram sharing.' });
  }
});

// Send a generated match-result PNG to the authenticated player's Telegram private chat.
// This is the reliable fallback when Telegram's WebView cannot share local image files.
app.post('/api/results/share', async (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const { initData, sessionToken, imageBase64, caption } = req.body || {};
  if (!botToken) return res.status(503).json({ error: 'Result image delivery is not configured.' });
  let telegramUserId: number | undefined;
  if (typeof sessionToken === 'string' && sessionToken) {
    const session = validateTelegramSessionToken(sessionToken, botToken);
    if (session.valid) telegramUserId = session.userId;
  }
  // Backward-compatible fallback for clients that have not yet stored a signed session.
  if (!telegramUserId && typeof initData === 'string' && initData) {
    const auth = validateTelegramInitData(initData, botToken);
    if (auth.valid && auth.user) telegramUserId = auth.user.id;
  }
  if (!telegramUserId) return res.status(401).json({ error: 'Your Telegram sharing session needs refreshing. Close and reopen the Mini App, then try again.' });
  if (typeof imageBase64 !== 'string' || imageBase64.length > 6 * 1024 * 1024) {
    return res.status(413).json({ error: 'The result image is missing or too large.' });
  }

  try {
    const bytes = Buffer.from(imageBase64, 'base64');
    if (!bytes.length || bytes.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'The result image is too large.' });
    const form = new FormData();
    form.append('chat_id', String(telegramUserId));
    form.append('caption', String(caption || '🎲 Mikasa Ludo — Match Results').slice(0, 1024));
    form.append('photo', new Blob([bytes], { type: 'image/png' }), 'mikasa-ludo-results.png');
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(15000),
    });
    const telegramPayload = await telegramResponse.json() as any;
    if (!telegramResponse.ok || !telegramPayload.ok) {
      const description = String(telegramPayload.description || 'Telegram could not deliver the image.');
      return res.status(502).json({ error: description.includes('chat not found') || description.includes('bot was blocked')
        ? `Start a private chat with ${BOT_HANDLE} first, then try sharing again.`
        : description });
    }
    return res.json({ success: true, message: 'Result image sent to your Mikasa bot chat. You can forward it anywhere.' });
  } catch (error) {
    console.error('Result image delivery failed:', error);
    return res.status(502).json({ error: 'Could not send the result image. Please try again.' });
  }
});

// API: Authenticate Telegram WebApp user or Guest user
app.post('/api/auth/telegram', async (req, res) => {
  const { initData, guestProfile } = req.body || {};
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (initData) {
    if (!botToken) {
      return res.status(503).json({ error: 'Telegram profile lookup requires TELEGRAM_BOT_TOKEN.' });
    }

    const authResult = validateTelegramInitData(initData, botToken);
    if (!authResult.valid || !authResult.user) {
      return res.status(401).json({ error: 'Telegram authentication failed.' });
    }

    const user = authResult.user;
    // Telegram Bot API can return the current chat name, username and profile-photo file_id
    // when the player has opened the bot / is reachable by the bot. Signed initData remains
    // the trusted fallback when getChat does not expose the photo.
    const botProfile = await getTelegramChatProfile(user.id, botToken);
    const photoUrl = botProfile?.photoFileId
      ? `/api/telegram/avatar?file_id=${encodeURIComponent(botProfile.photoFileId)}`
      : user.photo_url?.startsWith('https://')
        ? `/api/telegram/avatar-url?url=${encodeURIComponent(user.photo_url)}`
        : undefined;

    const profile = storage.getOrCreateUser({
      id: 'tg_' + user.id,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Telegram Player',
      username: botProfile?.username || user.username,
      avatarUrl: photoUrl,
      isTelegram: true,
    });
    // Refresh profile fields in case Telegram name/photo changed since the previous session.
    profile.name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || profile.name;
    profile.username = botProfile?.username || user.username || profile.username;
    profile.avatarUrl = photoUrl;
    return res.json({ success: true, profile, sessionToken: createTelegramSessionToken(user.id, botToken) });
  }

  // Guest / browser fallback. Never trust a client-supplied Telegram identity as authenticated.
  if (guestProfile && guestProfile.id && !String(guestProfile.id).startsWith('tg_')) {
    const profile = storage.getOrCreateUser({
      id: guestProfile.id,
      name: guestProfile.name || 'Mikasa Player',
      username: guestProfile.username,
      avatarUrl: guestProfile.avatarUrl,
      isTelegram: false,
    });
    return res.json({ success: true, profile });
  }

  const fallbackId = 'guest_' + Math.random().toString(36).substring(2, 8);
  const fallbackProfile = storage.getOrCreateUser({
    id: fallbackId,
    name: 'Player ' + fallbackId.substring(6),
    isTelegram: false,
  });
  return res.json({ success: true, profile: fallbackProfile });
});

// API: List active public lobbies
app.get('/api/lobbies', (_req, res) => {
  res.json({ lobbies: ludoManager.getActivePublicGames() });
});

// API: Create new lobby
app.post('/api/lobbies', (req, res) => {
  const { hostProfile } = req.body;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const game = ludoManager.getOrCreateGame(code, hostProfile);
  res.json({ code: game.code });
});

// API: Get lobby details
app.get('/api/lobbies/:code', (req, res) => {
  const game = ludoManager.getGame(req.params.code);
  if (!game) {
    return res.status(404).json({ error: 'Lobby not found' });
  }
  res.json({ game });
});

// API: Player profile stats
app.get('/api/stats/:userId', (req, res) => {
  const user = storage.getUser(req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ profile: user });
});

// API: Match history
app.get('/api/matches', (_req, res) => {
  res.json({ matches: storage.getMatches() });
});

// WebSocket Server initialization
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: string | null = null;
  let currentUserId: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      switch (msg.type) {
        case 'join_lobby': {
          const { code, user, asSpectator } = msg.payload;
          const room = (code as string).toUpperCase();
          const uid = user.id as string;
          currentRoom = room;
          currentUserId = uid;
          ludoManager.registerConnection(room, ws);
          const game = ludoManager.joinLobby(room, user, asSpectator);
          ws.send(JSON.stringify({ type: 'init_state', payload: game }));
          break;
        }

        case 'update_profile': {
          if (!currentRoom || !currentUserId) return;
          const profile = msg.payload || {};
          if (profile.id !== currentUserId) return;
          const name = String(profile.name || '').trim().slice(0, 64) || 'Telegram Player';
          ludoManager.joinLobby(currentRoom, {
            id: currentUserId,
            name,
            username: typeof profile.username === 'string' ? profile.username : undefined,
            avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : undefined,
          });
          break;
        }

        case 'leave_lobby': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.leaveMatch(currentRoom, currentUserId);
          currentRoom = null;
          currentUserId = null;
          break;
        }

        case 'select_color': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.selectColor(currentRoom, currentUserId, msg.payload.color);
          break;
        }

        case 'toggle_ready': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.toggleReady(currentRoom, currentUserId);
          break;
        }

        case 'add_bot': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.addBot(currentRoom, currentUserId);
          break;
        }

        case 'remove_bot': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.removeBot(currentRoom, currentUserId, msg.payload?.botId);
          break;
        }

        case 'start_game': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.startGame(currentRoom, currentUserId);
          break;
        }

        case 'roll_dice': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.rollDice(currentRoom, currentUserId);
          break;
        }

        case 'move_token': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.moveToken(currentRoom, currentUserId, msg.payload.tokenIndex);
          break;
        }

        case 'send_chat': {
          if (!currentRoom) return;
          const { sender, text, replyTo } = msg.payload;
          ludoManager.handleChatMessage(currentRoom, sender, text, replyTo);
          break;
        }

        case 'react_chat': {
          if (!currentRoom || !currentUserId) return;
          const { messageId, emoji, user } = msg.payload;
          ludoManager.handleChatReaction(
            currentRoom,
            messageId,
            emoji,
            user || { id: currentUserId }
          );
          break;
        }

        case 'quick_reaction': {
          if (!currentRoom || !currentUserId) return;
          const { emoji } = msg.payload;
          ludoManager.handleQuickReaction(currentRoom, currentUserId, emoji);
          break;
        }

        case 'rematch': {
          if (!currentRoom || !currentUserId) return;
          ludoManager.rematch(currentRoom, currentUserId);
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }
      }
    } catch (e) {
      console.error('WS Error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      ludoManager.removeConnection(currentRoom, ws, currentUserId);
    }
  });
});

// Mount Vite or serve static
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`🎲 Mikasa ~ Ludo running on http://localhost:${port}`);
  });
}

startServer();
