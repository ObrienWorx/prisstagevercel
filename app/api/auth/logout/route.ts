// app/api/auth/logout/route.ts
// POST /api/auth/logout — Clears the auth cookie

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  // Delete the auth cookie
  response.cookies.delete('token');

  return response;
}