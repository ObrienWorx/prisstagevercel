import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import LeadSubmission from '@/models/LeadSubmission';
import { authenticate } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req);
  if (error) return error;
  try {
    await connectDB();
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));
    const limit = 20;
    const search = (req.nextUrl.searchParams.get('search') ?? '').trim();
    const filter = search
      ? (() => {
          const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          return { $or: [{ name: rx }, { email: rx }, { phone: rx }, { source: rx }] };
        })()
      : {};
    const [leads, total] = await Promise.all([
      LeadSubmission.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      LeadSubmission.countDocuments(filter),
    ]);
    return successResponse({ leads, total, page, pages: Math.ceil(total / limit) });
  } catch (e: unknown) {
    return errorResponse(e instanceof Error ? e.message : 'Server error', 500);
  }
}
