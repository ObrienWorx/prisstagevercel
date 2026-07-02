import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import LearnAndEarn from '@/models/LearnAndEarn';
import { successResponse } from '@/lib/apiResponse';

export async function GET(_req: NextRequest) {
  await connectDB();
  const items = await LearnAndEarn.find({ publishStatus: 'published' })
    .select('title slug description featuredImage chapters')
    .sort({ createdAt: -1 })
    .lean();
  return successResponse(items);
}
