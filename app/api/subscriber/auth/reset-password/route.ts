import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import ActivityLog from '@/models/ActivityLog';
import OTP from '@/models/OTP';

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, code, password } = await req.json();
  if (!email || !code || !password) return NextResponse.json({ success: false, error: 'email, code, and password required' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });

  const otp = await OTP.findOne({ email: email.toLowerCase(), purpose: 'password-reset', code });
  if (!otp) return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 400 });
  if (otp.expiresAt < new Date()) {
    await otp.deleteOne();
    return NextResponse.json({ success: false, error: 'Code has expired. Please request a new one.' }, { status: 400 });
  }

  const sub = await Subscriber.findOne({ email: email.toLowerCase() });
  if (!sub) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });

  sub.password = password;
  await sub.save();
  await Subscriber.findByIdAndUpdate(sub._id, { $set: { plainPassword: password } });
  await otp.deleteOne();

  await ActivityLog.create({
    subscriber: sub._id,
    action: 'password_changed',
    field: 'password',
    newValue: password,
    performedBy: 'user',
    performedByEmail: sub.email,
  });

  return NextResponse.json({ success: true, message: 'Password reset successfully. You can now log in.' });
}
