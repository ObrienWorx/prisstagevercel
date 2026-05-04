// lib/apiResponse.ts
// Standardized API response helpers — keeps all responses consistent

import { NextResponse } from 'next/server';

// Success response: { success: true, data: {...}, message: "..." }
export function successResponse(data: unknown, message = 'Success', status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

// Error response: { success: false, error: "..." }
export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}