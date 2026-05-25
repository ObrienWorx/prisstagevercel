import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    await connectDB();

    const query: Record<string, unknown> = { publishStatus: 'published' };
    if (categorySlug) {
      const cat = await BlogCategory.findOne({ slug: categorySlug, status: 'active' });
      if (cat) query.$or = [{ category: cat._id }, { categories: cat._id }];
      else return successResponse([]);
    }

    const blogs = await Blog.find(query)
      .populate('category', 'name slug')
      .populate('categories', 'name slug')
      .select('title slug featuredImage tags authorName category categories createdAt metaDescription')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return successResponse(blogs);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}
