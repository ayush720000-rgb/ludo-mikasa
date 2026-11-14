import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface AuthResult {
  valid: boolean;
  user?: TelegramUser;
  reason?: string;
}

/**
 * Validates Telegram WebApp initData string using HMAC-SHA256
 * Telegram standard documentation:
 * 1. Parse query string
 * 2. Extract 'hash' param
 * 3. Sort all remaining keys alphabetically
 * 4. Build data_check_string = "key=value\nkey2=value2..."
 * 5. secret_key = HMAC_SHA256("WebAppData", bot_token)
 * 6. calculated_hash = HMAC_SHA256(secret_key, data_check_string)
 */
export function validateTelegramInitData(initData: string, botToken?: string): AuthResult {
  if (!initData) {
    return { valid: false, reason: 'initData is empty' };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const userRaw = params.get('user');

    if (!userRaw) {
      return { valid: false, reason: 'No user object found in initData' };
    }

    const user: TelegramUser = JSON.parse(userRaw);

    // If botToken is configured, verify HMAC signature
    if (botToken && botToken.trim() !== '' && botToken !== 'your_telegram_bot_token_here') {
      if (!hash) {
        return { valid: false, reason: 'Missing hash parameter' };
      }

      // Collect and sort all keys except 'hash'
      const checkItems: string[] = [];
      params.forEach((val, key) => {
        if (key !== 'hash') {
          checkItems.push(`${key}=${val}`);
        }
      });
      checkItems.sort();
      const dataCheckString = checkItems.join('\n');

      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        return { valid: false, reason: 'HMAC signature mismatch' };
      }
    }

    return { valid: true, user };
  } catch (err: any) {
    return { valid: false, reason: err.message || 'Failed to parse initData' };
  }
}


/** Issue a short-lived server-signed session after a valid Telegram initData check. */
export function createTelegramSessionToken(userId: number, botToken: string, ttlSeconds = 7 * 24 * 60 * 60): string {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString('base64url');
  const signature = crypto.createHmac('sha256', botToken).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/** Validate a previously issued session without depending on Telegram WebView initData freshness. */
export function validateTelegramSessionToken(token: string, botToken: string): { valid: boolean; userId?: number } {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return { valid: false };
    const expected = crypto.createHmac('sha256', botToken).update(payload).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return { valid: false };
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(data.userId) || !Number.isSafeInteger(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) return { valid: false };
    return { valid: true, userId: data.userId };
  } catch {
    return { valid: false };
  }
}
