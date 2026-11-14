import { Telegraf } from 'telegraf';
import crypto from 'node:crypto';
import type express from 'express';

// Telegram bot for Mikasa Ludo. Lets people open the Mini App from /start or inline mode
// (@bot in any chat) and wakes the instance when a message arrives (webhook mode on Render).
const WEBHOOK_PATH = '/telegram-webhook';
// The Mini App belongs to this bot. Inline results send t.me/<handle>/<short name>.
const MINIAPP_HANDLE = (process.env.MINIAPP_BOT_USERNAME || 'Ig_MikasaBot').replace(/^@/, '');
const MINIAPP_SHORT = process.env.LUDO_MINIAPP_SHORT || 'ludo';

function isValidBotToken(token?: string): boolean {
  if (!token) return false;
  const clean = token.trim();
  return /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(clean);
}

export class TelegramBotService {
  private bot: Telegraf | null = null;
  private appUrl: string;
  private publicUrl: string | null;
  private webhookSecret = '';

  constructor(appUrl: string) {
    this.appUrl = appUrl || 'https://t.me';
    this.publicUrl = (process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || '').trim() || null;
    const rawToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!isValidBotToken(rawToken)) {
      console.log('[TelegramBot] No valid TELEGRAM_BOT_TOKEN. Running as Mini App only.');
      return;
    }

    const token = rawToken!.trim();
    this.bot = new Telegraf(token);
    this.webhookSecret = crypto.createHash('sha256').update(token).digest('hex');
    this.bot.catch((err: unknown) => {
      console.log('[TelegramBot] Update error:', err instanceof Error ? err.message : String(err));
    });
    this.setupHandlers(this.bot);

    this.bot.telegram
      .getMe()
      .then((me) => {
        console.log(`Telegram Bot @${me.username} connected.`);
        if (this.publicUrl) {
          // Telegram wakes the instance with each message (webhook).
          const url = this.publicUrl.replace(/\/+$/, '') + WEBHOOK_PATH;
          return this.bot!.telegram
            .setWebhook(url, { secret_token: this.webhookSecret, drop_pending_updates: false })
            .then(() => console.log('Telegram Bot webhook set to ' + url));
        }
        return this.bot!.launch({ dropPendingUpdates: true }).then(() =>
          console.log('Telegram Bot polling launched successfully.')
        );
      })
      .catch((err: unknown) => {
        this.bot = null;
        console.log('[TelegramBot] Could not start:', err instanceof Error ? err.message : String(err));
      });
  }

  /** Mounts the webhook route. Call before express.json(): Telegraf reads the raw body itself. */
  public mountWebhook(app: express.Express): void {
    if (!this.bot || !this.publicUrl) return;
    app.use(this.bot.webhookCallback(WEBHOOK_PATH, { secretToken: this.webhookSecret }));
  }

  private setupHandlers(bot: Telegraf) {
    bot.command('start', async (ctx) => {
      const firstName = ctx.from.first_name || 'Player';
      await ctx.reply(
        `🎲 Welcome, *${firstName}*!\n\nRoll the dice with friends. Create a lobby, invite people, or play against the bot.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🎲 Play Ludo', web_app: { url: this.appUrl } }]],
          },
        }
      );
    });

    // Inline mode: @bot in any chat shows the Mikasa image; tapping it sends the Mini App link.
    bot.on('inline_query', async (ctx) => {
      const miniAppLink = `https://t.me/${MINIAPP_HANDLE}/${MINIAPP_SHORT}`;
      const image = `${this.appUrl.replace(/\/+$/, '')}/assets/mikasa-mascot.jpg`;

      await ctx.answerInlineQuery([
        {
          type: 'article',
          id: 'ludo_mini_app',
          title: 'Play Ludo',
          description: 'Send the Ludo Mini App to this chat',
          thumbnail_url: image,
          thumbnail_width: 256,
          thumbnail_height: 256,
          input_message_content: {
            message_text: `🎲 Roll the dice with me on Mikasa Ludo!\n${miniAppLink}`,
          },
          reply_markup: {
            inline_keyboard: [[{ text: '🎲 Play Ludo', url: miniAppLink }]],
          },
        },
      ]);
    });
  }

  public getBot(): Telegraf | null {
    return this.bot;
  }
}
