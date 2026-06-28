
import { NextResponse } from 'next/server';

export function successResponse(data: unknown, message = 'Success', status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function paginatedResponse(
  data: unknown,
  meta: { total: number; page: number; pages: number } & Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json({ success: true, data, ...meta }, { status });
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}