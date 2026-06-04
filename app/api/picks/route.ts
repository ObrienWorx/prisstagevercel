import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Pick from '@/models/Pick';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const picks = await Pick.find({}).sort({ displayOrder: 1, createdAt: -1 });
  return successResponse(picks);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const { ticker, convictionLevel, potentialReturn, capType, entryPrice, isActive, displayOrder } = await req.json();
  if (!ticker || potentialReturn == null || !capType || entryPrice == null)
    return errorResponse('ticker, potentialReturn, capType, and entryPrice are required');
  const pick = await Pick.create({ ticker, convictionLevel, potentialReturn, capType, entryPrice, isActive, displayOrder });
  return successResponse(pick, 'Pick created', 201);
}
