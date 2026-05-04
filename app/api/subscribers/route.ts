import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const subscribers = await Subscriber.find({}).select('-password').sort({ createdAt: -1 });
  return successResponse(subscribers);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  await connectDB();
  const { name, email, password, phone, isActive } = await req.json();
  if (!name || !email || !password) return errorResponse('name, email, and password are required');
  if (password.length < 6) return errorResponse('Password must be at least 6 characters');
  if (await Subscriber.findOne({ email: email.toLowerCase() })) return errorResponse('Email already registered');
  const sub = await Subscriber.create({ name, email: email.toLowerCase().trim(), password, phone, isActive });
  const obj = sub.toObject() as unknown as Record<string, unknown>;
  delete obj.password;
  return successResponse(obj, 'Subscriber created', 201);
}
