import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import OTP from '@/models/OTP';
import { signSubscriberToken } from '@/lib/subscriberJwt';
import { sendOTPEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
  const sub = await Subscriber.findOne({ email: email.toLowerCase() });
  if (!sub) return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  if (!sub.isActive) return NextResponse.json({ success: false, error: 'Account deactivated. Contact support.' }, { status: 403 });
  if (!sub.password) return NextResponse.json({ success: false, error: 'This account has no password. Please use OTP login.' }, { status: 400 });
  const match = await sub.comparePassword(password);
  if (!match) return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });

  if (!sub.isEmailVerified) {
    // Resend OTP automatically
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.deleteMany({ email: sub.email, purpose: 'email-verify' });
    await OTP.create({ email: sub.email, code, purpose: 'email-verify', expiresAt });
    try { await sendOTPEmail(sub.email, code, 'email-verify'); } catch {}
    return NextResponse.json({
      success: false,
      error: 'Email not verified',
      data: { requiresVerification: true, email: sub.email },
    }, { status: 403 });
  }

  const token = signSubscriberToken({ subscriberId: sub._id.toString(), email: sub.email, name: sub.name });
  const res = NextResponse.json({ success: true, message: 'Login successful', data: { token, subscriber: { id: sub._id, name: sub.name, email: sub.email } } });
  res.cookies.set('subscriber_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}
