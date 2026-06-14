import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Sector from '@/models/Sector';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { slugify } from '@/lib/slugify';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req);
  if (error) return error;

  await connectDB();
  const sectors = await Sector.find({}).sort({ createdAt: -1 });
  return successResponse(sectors);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'sectors');
  if (error) return error;

  await connectDB();
  const { name, slug, featuredImage, icon, description } = await req.json();

  if (!name) return errorResponse('Name is required');

  const finalSlug = slug ? slugify(slug) : slugify(name);
  const existing = await Sector.findOne({ slug: finalSlug });
  if (existing) return errorResponse('A sector with this slug already exists');

  const sector = await Sector.create({ name, slug: finalSlug, featuredImage: featuredImage || '', icon: icon || '', description: description || '' });
  return successResponse(sector, 'Sector created successfully', 201);
}
