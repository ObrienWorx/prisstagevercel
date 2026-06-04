import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Pick from '@/models/Pick';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

type P = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const pick = await Pick.findByIdAndUpdate(id, { $set: body }, { new: true });
  if (!pick) return errorResponse('Pick not found', 404);
  return successResponse(pick, 'Pick updated');
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const pick = await Pick.findByIdAndDelete(id);
  if (!pick) return errorResponse('Pick not found', 404);
  return successResponse(null, 'Pick deleted');
}
