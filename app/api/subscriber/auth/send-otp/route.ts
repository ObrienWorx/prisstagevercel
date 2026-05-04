import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import OTP from '@/models/OTP';
import { sendOTPEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, purpose } = await req.json();
  if (!email || !purpose) return NextResponse.json({ success: false, error: 'email and purpose required' }, { status: 400 });
  if (!['email-verify', 'password-reset', 'login'].includes(purpose)) return NextResponse.json({ success: false, error: 'Invalid purpose' }, { status: 400 });

  const sub = await Subscriber.findOne({ email: email.toLowerCase() });
  if ((purpose === 'password-reset' || purpose === 'login') && !sub) return NextResponse.json({ success: false, error: 'No account found with this email' }, { status: 404 });
  if (purpose === 'login' && sub && !sub.isActive) return NextResponse.json({ success: false, error: 'Account deactivated. Contact support.' }, { status: 403 });

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await OTP.deleteMany({ email: email.toLowerCase(), purpose });
  await OTP.create({ email: email.toLowerCase(), code, purpose, expiresAt });

  try {
    await sendOTPEmail(email.toLowerCase(), code, purpose as 'email-verify' | 'password-reset' | 'login');
    return NextResponse.json({ success: true, message: 'OTP sent to your email' });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to send email. Please try again.' }, { status: 500 });
  }
}
