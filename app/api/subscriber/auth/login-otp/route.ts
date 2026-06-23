import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import OTP from '@/models/OTP';
import { signSubscriberToken } from '@/lib/subscriberJwt';

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ success: false, error: 'email and code required' }, { status: 400 });

  const otp = await OTP.findOne({ email: email.toLowerCase(), purpose: 'login', code });
  if (!otp) return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 400 });
  if (otp.expiresAt < new Date()) {
    await otp.deleteOne();
    return NextResponse.json({ success: false, error: 'Code has expired. Please request a new one.' }, { status: 400 });
  }

  const sub = await Subscriber.findOneAndUpdate(
    { email: email.toLowerCase() },
    { isEmailVerified: true },
    { returnDocument: 'after' }
  );
  if (!sub) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
  if (!sub.isActive) return NextResponse.json({ success: false, error: 'Account deactivated. Contact support.' }, { status: 403 });

  await otp.deleteOne();

  const token = signSubscriberToken({ subscriberId: sub._id.toString(), email: sub.email, name: sub.name });
  const res = NextResponse.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      subscriber: { id: sub._id, name: sub.name, email: sub.email },
      requiresPasswordSetup: !sub.password,
    },
  });
  res.cookies.set('subscriber_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}
