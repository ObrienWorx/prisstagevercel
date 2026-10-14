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
    .select('title slug description authModalTitle authModalSubtitle publishStatus chapters createdAt sortOrder')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  return successResponse(items);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'blogs');
  if (error) return error;
  await connectDB();
  const { title, slug, description, featuredImage, authModalTitle, authModalSubtitle, publishStatus, chapters } = await req.json();
  if (!title) return errorResponse('Title is required');
  const finalSlug = slug ? slugify(slug) : slugify(title);
  if (await LearnAndEarn.findOne({ slug: finalSlug })) return errorResponse('Slug already exists');
  const item = await LearnAndEarn.create({
    title, slug: finalSlug, description: description || '', featuredImage: featuredImage || '',
    authModalTitle: authModalTitle || '',
    authModalSubtitle: authModalSubtitle || '',
    publishStatus: publishStatus || 'draft',
    chapters: (chapters || []).map((c: any, i: number) => {
      const contentsList = Array.isArray(c.contents) && c.contents.length > 0
        ? c.contents.map((cnt: any) => typeof cnt === 'string' ? cnt : String(cnt || ''))
        : (c.content ? [String(c.content)] : ['']);
      return {
        title: c.title,
        slug: slugify(c.slug || c.title),
        content: contentsList[0] || c.content || '',
        contents: contentsList,
        quizQuestions: c.quizQuestions || [],
        order: i,
      };
    }),
  });
  if (authModalTitle !== undefined || authModalSubtitle !== undefined) {
    await LearnAndEarn.collection.updateOne(
      { _id: item._id },
      { $set: { authModalTitle: authModalTitle || '', authModalSubtitle: authModalSubtitle || '' } }
    );
  }
  return successResponse(item, 'Created successfully');
}
