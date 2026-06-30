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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const subscriberId = getSubscriberId(req);
  if (!subscriberId) return errorResponse('Not authenticated', 401);
  const { id } = await params;
  const { symbol, companyName } = await req.json();
  if (!symbol) return errorResponse('symbol is required', 400);

  await connectDB();
  const wl = await Watchlist.findOne({ _id: id, subscriberId });
  if (!wl) return errorResponse('Watchlist not found', 404);

  const sym = symbol.trim().toUpperCase();
  const already = wl.stocks.some((s: { symbol: string }) => s.symbol === sym);
  if (already) return errorResponse(`${sym} is already in this watchlist`, 409);

  wl.stocks.push({ symbol: sym, companyName: companyName || sym } as never);
  await wl.save();
  return successResponse(wl);
}
