import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import ActivityLog from '@/models/ActivityLog';
import { verifySubscriberToken } from '@/lib/subscriberJwt';

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  return req.cookies.get('subscriber_token')?.value ?? null;
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  const payload = verifySubscriberToken(token);
  if (!payload) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  const { password } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  await connectDB();
  const sub = await Subscriber.findById(payload.subscriberId);
  if (!sub) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
  if (sub.password) {
    return NextResponse.json({ success: false, error: 'A password is already set. Use change/reset password instead.' }, { status: 400 });
  }

  sub.password = password;
  await sub.save();
  await Subscriber.findByIdAndUpdate(sub._id, { $set: { plainPassword: password } });

  await ActivityLog.create({
    subscriber: sub._id,
    action: 'password_changed',
    field: 'password',
    newValue: password,
    performedBy: 'user',
    performedByEmail: sub.email,
  });

  return NextResponse.json({ success: true, message: 'Password set successfully.' });
}
