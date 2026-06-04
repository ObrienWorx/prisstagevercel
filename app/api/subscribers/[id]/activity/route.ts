import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import ActivityLog from '@/models/ActivityLog';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse } from '@/lib/apiResponse';

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const logs = await ActivityLog.find({ subscriber: id }).sort({ createdAt: -1 }).limit(100);
  return successResponse(logs);
}
