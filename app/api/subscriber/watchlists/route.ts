import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Watchlist from '@/models/Watchlist';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { successResponse, errorResponse } from '@/lib/apiResponse';

function getSubscriberId(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : req.cookies.get('subscriber_token')?.value ?? '';
  return verifySubscriberToken(token)?.subscriberId ?? null;
}

export async function GET(req: NextRequest) {
  const subscriberId = getSubscriberId(req);
  if (!subscriberId) return errorResponse('Not authenticated', 401);
  await connectDB();
  const watchlists = await Watchlist.find({ subscriberId }).lean();
  return successResponse(watchlists);
}

export async function POST(req: NextRequest) {
  const subscriberId = getSubscriberId(req);
  if (!subscriberId) return errorResponse('Not authenticated', 401);
  const { name } = await req.json();
  if (!name?.trim()) return errorResponse('Watchlist name is required', 400);
  await connectDB();
  const watchlist = await Watchlist.create({ subscriberId, name: name.trim(), stocks: [] });
  return successResponse(watchlist, 'Created', 201);
}
