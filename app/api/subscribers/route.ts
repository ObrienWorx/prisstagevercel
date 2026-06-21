import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import ActivityLog from '@/models/ActivityLog';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse, paginatedResponse, escapeRegex } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').trim();
  const pageParam = searchParams.get('page');

  const filter: Record<string, unknown> = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  // No page param → full list (used by dropdowns / legacy callers)
  if (!pageParam) {
    const subscribers = await Subscriber.find(filter).select('-password').sort({ createdAt: -1 });
    return successResponse(subscribers);
  }

  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const total = await Subscriber.countDocuments(filter);
  const subscribers = await Subscriber.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  return paginatedResponse(subscribers, { total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const { name, email, password, phone, isActive } = await req.json();
  if (!name || !email || !password) return errorResponse('name, email, and password are required');
  if (password.length < 6) return errorResponse('Password must be at least 6 characters');
  if (await Subscriber.findOne({ email: email.toLowerCase() })) return errorResponse('Email already registered');
  const sub = await Subscriber.create({ name, email: email.toLowerCase().trim(), password, plainPassword: password, phone, isActive });
  await ActivityLog.create({
    subscriber: sub._id,
    action: 'created',
    field: 'account',
    newValue: sub.email,
    performedBy: 'admin',
    performedByEmail: user!.email,
  });
  const obj = sub.toObject() as unknown as Record<string, unknown>;
  delete obj.password;
  return successResponse(obj, 'Subscriber created', 201);
}
