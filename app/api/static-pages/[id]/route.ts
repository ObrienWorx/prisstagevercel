import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import StaticPage from '@/models/StaticPage';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const page = await StaticPage.findById(id);
  if (!page) return errorResponse('Page not found', 404);
  return successResponse(page);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const body = await req.json();
  const page = await StaticPage.findById(id);
  if (!page) return errorResponse('Page not found', 404);
  if (body.slug && body.slug !== page.slug) {
    const exists = await StaticPage.findOne({ slug: body.slug.toLowerCase(), _id: { $ne: id } });
    if (exists) return errorResponse('Slug already in use');
  }
  Object.assign(page, {
    title: body.title ?? page.title,
    slug: body.slug ? body.slug.toLowerCase().trim() : page.slug,
    content: body.content ?? page.content,
    metaTitle: body.metaTitle ?? page.metaTitle,
    metaDescription: body.metaDescription ?? page.metaDescription,
    isPublished: body.isPublished ?? page.isPublished,
    showInFooter: body.showInFooter ?? page.showInFooter,
    footerColumn: body.footerColumn ?? page.footerColumn,
  });
  await page.save();
  return successResponse(page, 'Page updated');
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requireAdmin(req); if (error) return error;
  await connectDB(); const { id } = await params;
  const page = await StaticPage.findById(id);
  if (!page) return errorResponse('Page not found', 404);
  await page.deleteOne();
  return successResponse(null, 'Page deleted');
}
