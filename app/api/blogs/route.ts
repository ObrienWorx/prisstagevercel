import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import '@/models/BlogCategory';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { normalizeBlogCategories } from '@/lib/blogCategories';
import { normalizeBlogTags } from '@/lib/blogTags';
import { dateRangeFilter } from '@/lib/dateRange';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req); if (error) return error;
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));
    const search = sp.get('search')?.trim();
    const category = sp.get('category')?.trim();
    const dateFrom = sp.get('dateFrom')?.trim();
    const dateTo = sp.get('dateTo')?.trim();
    const filter: Record<string, unknown> = {};
    if (search) filter.title = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (category) filter.$or = [{ category }, { categories: category }];
    const createdAt = dateRangeFilter(dateFrom, dateTo);
    if (createdAt) filter.createdAt = createdAt;
    const [items, total] = await Promise.all([
      Blog.find(filter)
        .select('-content') // omit heavy HTML body; fetched on demand via /api/blogs/[id]
        .populate('category', 'name slug')
        .populate('categories', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Blog.countDocuments(filter),
    ]);
    return successResponse({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'blogs'); if (error) return error;
  await connectDB();
  const { title, slug, content, featuredImage, tags, authorName, category, categories, publishStatus, metaTitle, metaDescription, metaImage } = await req.json();
  if (!title) return errorResponse('Title is required');
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (await Blog.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const categoryIds = normalizeBlogCategories(categories, category);
  const blog = await Blog.create({ title, slug: finalSlug, content, featuredImage, tags: normalizeBlogTags(tags), authorName, category: categoryIds[0] || null, categories: categoryIds, publishStatus: publishStatus || 'draft', metaTitle, metaDescription, metaImage });
  await blog.populate('category', 'name slug');
  await blog.populate('categories', 'name slug');
  return successResponse(blog, 'Blog created', 201);
}
