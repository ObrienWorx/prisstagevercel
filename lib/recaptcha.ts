const SECRET = process.env.RECAPTCHA_SECRET_KEY;
const MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5');

export interface RecaptchaResult {
  ok: boolean;
  reason?: string;
  score?: number;
}

interface SiteVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

export async function verifyRecaptcha(
  token: string | undefined | null,
  expectedAction?: string,
): Promise<RecaptchaResult> {
  if (!SECRET) return { ok: true };
  if (!token) return { ok: false, reason: 'Captcha verification required. Please reload and try again.' };

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: SECRET, response: token }),
    });
    const data = (await res.json()) as SiteVerifyResponse;

    if (!data.success) return { ok: false, reason: 'Captcha verification failed. Please try again.' };
    if (expectedAction && data.action && data.action !== expectedAction) {
      return { ok: false, reason: 'Captcha action mismatch. Please try again.', score: data.score };
    }
    if (typeof data.score === 'number' && data.score < MIN_SCORE) {
      return { ok: false, reason: 'Suspicious activity detected. Please try again.', score: data.score };
    }
    return { ok: true, score: data.score };
  } catch {
    return { ok: true, reason: 'Captcha service unavailable — skipped' };
  }
}
