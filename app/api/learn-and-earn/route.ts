import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import LearnAndEarn from '@/models/LearnAndEarn';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req);
  if (error) return error;
  await connectDB();
  const items = await LearnAndEarn.find({})
    .select('title slug description publishStatus chapters createdAt sortOrder')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  return successResponse(items);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'blogs');
  if (error) return error;
  await connectDB();
  const { title, slug, description, featuredImage, publishStatus, chapters } = await req.json();
  if (!title) return errorResponse('Title is required');
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (await LearnAndEarn.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const item = await LearnAndEarn.create({
    title, slug: finalSlug, description: description || '', featuredImage: featuredImage || '',
    publishStatus: publishStatus || 'draft',
    chapters: (chapters || []).map((c: any, i: number) => ({
      title: c.title, slug: slugify(c.slug || c.title), content: c.content || '',
      quizQuestions: c.quizQuestions || [], order: i,
    })),
  });
  return successResponse(item, 'Created successfully');
}
