import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Portfolio from '@/models/Portfolio';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { successResponse, errorResponse } from '@/lib/apiResponse';

function getSubscriberId(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : req.cookies.get('subscriber_token')?.value ?? '';
  return verifySubscriberToken(token)?.subscriberId ?? null;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const subscriberId = getSubscriberId(req);
  if (!subscriberId) return errorResponse('Not authenticated', 401);
  const { id } = await params;
  await connectDB();
  const portfolio = await Portfolio.findOneAndDelete({ _id: id, subscriberId });
  if (!portfolio) return errorResponse('Portfolio not found', 404);
  return successResponse({ deleted: true });
}
