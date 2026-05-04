import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectDB();
  const types = await Blog.aggregate([
    { $match: { publishStatus: 'published', blogType: { $nin: [null, ''] } } },
    { $group: { _id: '$blogType', label: { $first: '$blogTypeLabel' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return NextResponse.json({ success: true, data: types });
}
