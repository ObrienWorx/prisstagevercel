
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  const expire = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  };
  // admin token AND subscriber token — both are httpOnly so only the server
  // can clear them. Without this, server-rendered pages still see the
  // subscriber as logged in after "logout".
  response.cookies.set('token', '', expire);
  response.cookies.set('subscriber_token', '', expire);

  return response;
}
