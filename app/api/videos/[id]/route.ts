import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Video from '@/models/Video';
import { requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

type P = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: P) {
  const { error } = await requirePermission(req, 'videos'); if (error) return error;
  await connectDB(); const { id } = await params;
  const body = await req.json();
  const video = await Video.findById(id);
  if (!video) return errorResponse('Not found', 404);
  const { title, youtubeUrl, isActive } = body;
  Object.assign(video, { title, youtubeUrl, isActive });
  await video.save();
  return successResponse(video, 'Video updated');
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { error } = await requirePermission(req, 'videos'); if (error) return error;
  await connectDB(); const { id } = await params;
  const video = await Video.findById(id);
  if (!video) return errorResponse('Not found', 404);
  await video.deleteOne();
  return successResponse(null, 'Video deleted');
}
