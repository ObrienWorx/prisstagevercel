import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import { deleteUploadedFiles } from '@/lib/deleteUploadedFile';
import '@/models/BlogCategory';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { normalizeBlogCategories } from '@/lib/blogCategories';
import { normalizeBlogTags } from '@/lib/blogTags';
import { slugify } from '@/lib/slugify';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await authenticate(req);
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const blog = await Blog.findById(id).populate('category', 'name slug').populate('categories', 'name slug');
  if (!blog) return errorResponse('Blog not found', 404);
  return successResponse(blog);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'blogs');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { title, slug, content, featuredImage, tags, authorName, category, categories, publishStatus, metaTitle, metaDescription, metaImage } = body;

  const blog = await Blog.findById(id);
  if (!blog) return errorResponse('Blog not found', 404);

  if (title) blog.title = title;
  if (slug) {
    const finalSlug = slugify(slug);
    const existing = await Blog.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (existing) return errorResponse('A blog with this slug already exists');
    blog.slug = finalSlug;
  }
  if (content !== undefined) blog.content = content;
  if (featuredImage !== undefined) blog.featuredImage = featuredImage;
  if (tags !== undefined) blog.tags = normalizeBlogTags(tags);
  if (authorName !== undefined) blog.authorName = authorName;
  if (categories !== undefined || category !== undefined) {
    const categoryIds = normalizeBlogCategories(categories, category);
    const categoryObjectIds = categoryIds.map(categoryId => new Types.ObjectId(categoryId));
    blog.categories = categoryObjectIds;
    blog.category = categoryObjectIds[0] ?? null;
  }
  if (publishStatus) blog.publishStatus = publishStatus;
  if (metaTitle !== undefined) blog.metaTitle = metaTitle;
  if (metaDescription !== undefined) blog.metaDescription = metaDescription;
  if (metaImage !== undefined) blog.metaImage = metaImage;

  await blog.save();
  await blog.populate('category', 'name slug');
  const populated = await blog.populate('categories', 'name slug');
  return successResponse(populated, 'Blog updated successfully');
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'blogs');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const blog = await Blog.findById(id);
  if (!blog) return errorResponse('Blog not found', 404);

  await deleteUploadedFiles(blog.featuredImage, blog.metaImage);
  await blog.deleteOne();
  return successResponse(null, 'Blog deleted successfully');
}
