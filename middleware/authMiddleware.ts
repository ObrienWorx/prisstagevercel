import { NextRequest } from 'next/server';
import { verifyToken, JWTPayload } from '@/lib/jwt';
import { errorResponse } from '@/lib/apiResponse';

export const ALL_MODULES = [
  'reports', 'blogs', 'report-categories', 'blog-categories',
  'sectors', 'products', 'categories', 'users', 'subscribers', 'orders', 'transactions', 'videos',
] as const;

export type Module = (typeof ALL_MODULES)[number];

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  return req.cookies.get('token')?.value ?? null;
}

export async function authenticate(req: NextRequest) {
  const token = getToken(req);
  if (!token) return { user: null, error: errorResponse('No token provided. Please login.', 401) };
  const user = verifyToken(token);
  if (!user) return { user: null, error: errorResponse('Invalid or expired token.', 401) };
  return { user, error: null };
}

export async function requireAdmin(req: NextRequest) {
  const { user, error } = await authenticate(req);
  if (error) return { user: null, error };
  if (user!.role !== 'admin') return { user: null, error: errorResponse('Admin access required.', 403) };
  return { user, error: null };
}

export async function requirePermission(req: NextRequest, module: Module) {
  const { user, error } = await authenticate(req);
  if (error) return { user: null, error };
  if (user!.role === 'admin') return { user, error: null };
  if (!user!.permissions.includes(module)) {
    return { user: null, error: errorResponse(`Access denied for module: ${module}.`, 403) };
  }
  return { user, error: null };
}
