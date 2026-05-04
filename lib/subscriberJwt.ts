import jwt from 'jsonwebtoken';

const SECRET = process.env.SUBSCRIBER_JWT_SECRET!;

export interface SubscriberJWTPayload {
  subscriberId: string;
  email: string;
  name: string;
}

export function signSubscriberToken(payload: SubscriberJWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifySubscriberToken(token: string): SubscriberJWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as SubscriberJWTPayload;
  } catch {
    return null;
  }
}
