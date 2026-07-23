import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import LearnAndEarn from '@/models/LearnAndEarn';
import { requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function PUT(req: NextRequest) {
  const { error } = await requirePermission(req, 'blogs');
  if (error) return error;
  try {
    await connectDB();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) return errorResponse('ids array is required');

    await LearnAndEarn.bulkWrite(
      ids.map((id: string, index: number) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
      }))
    );
    return successResponse(null, 'Order updated');
  } catch (err: unknown) {
    return errorResponse(err instanceof Error ? err.message : 'Reorder failed', 500);
  }
}
