import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    await connectDB();

    const query: Record<string, unknown> = { publishStatus: 'published' };
    if (type) query.blogType = type;

    const blogs = await Blog.find(query)
      .select('title slug featuredImage blogType blogTypeLabel createdAt metaDescription')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return successResponse(blogs);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}
