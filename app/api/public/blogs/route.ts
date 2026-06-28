import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { toBlogListItem, LISTING_PER_PAGE } from '@/lib/listItems';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category') || '';
    const paged = searchParams.has('page');

    await connectDB();

    const query: Record<string, unknown> = { publishStatus: 'published' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cat: any = null;
    if (categorySlug) {
      cat = await BlogCategory.findOne({ slug: categorySlug, status: 'active' }).lean();
      if (cat) query.$or = [{ category: cat._id }, { categories: cat._id }];
      else return successResponse(paged ? { items: [], total: 0, page: 1, pages: 0 } : []);
    }

    if (paged) {
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(48, Math.max(1, parseInt(searchParams.get('limit') || String(LISTING_PER_PAGE), 10)));
      const [docs, total] = await Promise.all([
        Blog.find(query).select('title slug featuredImage tags authorName createdAt metaDescription content').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Blog.countDocuments(query),
      ]);
      return successResponse({ items: docs.map((b) => toBlogListItem(b, cat?.slug || '', cat?.name || '')), total, page, pages: Math.ceil(total / limit) });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
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
