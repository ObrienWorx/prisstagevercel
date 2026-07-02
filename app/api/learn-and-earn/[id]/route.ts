import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import LearnAndEarn from '@/models/LearnAndEarn';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await authenticate(req);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await LearnAndEarn.findById(id).lean();
  if (!item) return errorResponse('Not found', 404);
  return successResponse(item);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'blogs');
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const item = await LearnAndEarn.findById(id);
  if (!item) return errorResponse('Not found', 404);

  if (body.title !== undefined) item.title = body.title;
  if (body.slug !== undefined) {
    const finalSlug = slugify(body.slug);
    const existing = await LearnAndEarn.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (existing) return errorResponse('Slug already exists');
    item.slug = finalSlug;
  }
  if (body.description !== undefined) item.description = body.description;
  if (body.featuredImage !== undefined) item.featuredImage = body.featuredImage;
  if (body.publishStatus !== undefined) item.publishStatus = body.publishStatus;
  if (body.chapters !== undefined) {
    item.chapters = body.chapters.map((c: any, i: number) => ({
      title: c.title, slug: slugify(c.slug || c.title), content: c.content || '',
      quizQuestions: c.quizQuestions || [], order: i,
    }));
  }

  await item.save();
  return successResponse(item, 'Updated successfully');
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'blogs');
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await LearnAndEarn.findById(id);
  if (!item) return errorResponse('Not found', 404);
  await item.deleteOne();
  return successResponse(null, 'Deleted successfully');
}
