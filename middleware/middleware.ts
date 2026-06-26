
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie
  const token = request.cookies.get('token')?.value;

  // Pages that don't need auth
  const publicPaths = ['/OnlyAdminPanel', '/api/auth/login'];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  // If it's a public page, allow through
  if (isPublic) {
    // If already logged in and trying to visit login, redirect to dashboard
    if (pathname === '/OnlyAdminPanel' && token) {
      const user = verifyToken(token);
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // For protected pages: check if token exists and is valid
  if (!token) {
    return NextResponse.redirect(new URL('/OnlyAdminPanel', request.url));
  }

  const user = verifyToken(token);
  if (!user) {
    // Token is invalid/expired — clear it and redirect to login
    const response = NextResponse.redirect(new URL('/OnlyAdminPanel', request.url));
    response.cookies.delete('token');
    return response;
  }

  // Token is valid — allow through
  return NextResponse.next();
}

// Apply middleware to these routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/users/:path*',
    '/categories/:path*',
    '/sectors/:path*',
    '/products/:path*',
    '/reports/:path*',
    '/blogs/:path*',
    '/OnlyAdminPanel',
  ],
};