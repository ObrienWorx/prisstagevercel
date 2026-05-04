// lib/jwt.ts
// Helper functions for creating and verifying JWT tokens

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('Please define JWT_SECRET in your .env.local file');
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

// Create a JWT token (expires in 7 days)
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify a JWT token and return the payload
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}