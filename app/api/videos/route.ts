import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Video from '@/models/Video';
import { authenticate, requirePermission } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req); if (error) return error;
  await connectDB();
  const videos = await Video.find({}).sort({ createdAt: -1 });
  return successResponse(videos);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(req, 'videos'); if (error) return error;
  await connectDB();
  const { title, youtubeUrl, isActive } = await req.json();
  if (!title) return errorResponse('Title is required');
  if (!youtubeUrl) return errorResponse('YouTube URL is required');
  const video = await Video.create({ title, youtubeUrl, isActive: isActive ?? true });
  return successResponse(video, 'Video added', 201);
}
