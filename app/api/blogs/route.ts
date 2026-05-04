import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import '@/models/BlogCategory';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req); if (error) return error;
  try {
    await connectDB();
    const blogs = await Blog.find({}).populate('category', 'name slug').sort({ createdAt: -1 });
    return successResponse(blogs);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'blogs'); if (error) return error;
  await connectDB();
  const { title, slug, content, featuredImage, category, publishStatus, metaTitle, metaDescription, metaImage } = await req.json();
  if (!title) return errorResponse('Title is required');
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (await Blog.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const blog = await Blog.create({ title, slug: finalSlug, content, featuredImage, category: category || null, publishStatus: publishStatus || 'draft', metaTitle, metaDescription, metaImage });
  await blog.populate('category', 'name slug');
  return successResponse(blog, 'Blog created', 201);
}
