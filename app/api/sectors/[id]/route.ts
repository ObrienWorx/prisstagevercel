import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Sector from '@/models/Sector';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await authenticate(req);
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const sector = await Sector.findById(id);
  if (!sector) return errorResponse('Sector not found', 404);
  return successResponse(sector);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'sectors');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const { name, slug, featuredImage, icon, description } = await req.json();

  const sector = await Sector.findById(id);
  if (!sector) return errorResponse('Sector not found', 404);

  if (name) sector.name = name;
  if (slug) {
    const finalSlug = slugify(slug);
    const existing = await Sector.findOne({ slug: finalSlug, _id: { $ne: id } });
    if (existing) return errorResponse('A sector with this slug already exists');
    sector.slug = finalSlug;
  }
  if (featuredImage !== undefined) sector.featuredImage = featuredImage;
  if (icon !== undefined) sector.icon = icon;
  if (description !== undefined) sector.description = description;

  await sector.save();
  return successResponse(sector, 'Sector updated successfully');
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requirePermission(req, 'sectors');
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const sector = await Sector.findById(id);
  if (!sector) return errorResponse('Sector not found', 404);

  await sector.deleteOne();
  return successResponse(null, 'Sector deleted successfully');
}
