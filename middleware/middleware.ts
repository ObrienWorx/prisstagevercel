
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('token')?.value;

  const publicPaths = ['/OnlyAdminPanel', '/api/auth/login'];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    if (pathname === '/OnlyAdminPanel' && token) {
      const user = verifyToken(token);
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/OnlyAdminPanel', request.url));
  }

  const user = verifyToken(token);
  if (!user) {
    const response = NextResponse.redirect(new URL('/OnlyAdminPanel', request.url));
    response.cookies.delete('token');
    return response;
  }

  return NextResponse.next();
}

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