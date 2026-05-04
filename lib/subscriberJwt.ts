import jwt from 'jsonwebtoken';

export interface SubscriberJWTPayload {
  subscriberId: string;
  email: string;
  name: string;
}

function secret() {
  const s = process.env.SUBSCRIBER_JWT_SECRET;
  if (!s) throw new Error('SUBSCRIBER_JWT_SECRET is not set');
  return s;
}

export function signSubscriberToken(payload: SubscriberJWTPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: '30d' });
}

export function verifySubscriberToken(token: string): SubscriberJWTPayload | null {
  try {
    return jwt.verify(token, secret()) as SubscriberJWTPayload;
  } catch {
    return null;
  }
}
