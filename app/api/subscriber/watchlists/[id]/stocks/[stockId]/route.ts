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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; stockId: string }> }) {
  const subscriberId = getSubscriberId(req);
  if (!subscriberId) return errorResponse('Not authenticated', 401);
  const { id, stockId } = await params;
  await connectDB();
  const wl = await Watchlist.findOne({ _id: id, subscriberId });
  if (!wl) return errorResponse('Watchlist not found', 404);
  wl.stocks = wl.stocks.filter((s: { _id: unknown }) => String(s._id) !== stockId) as never;
  await wl.save();
  return successResponse(wl);
}
