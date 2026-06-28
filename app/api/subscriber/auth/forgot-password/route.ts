import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import OTP from '@/models/OTP';
import { sendOTPEmail } from '@/lib/email';
import { verifyRecaptcha } from '@/lib/recaptcha';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, recaptchaToken } = await req.json();
  const captcha = await verifyRecaptcha(recaptchaToken, 'forgot_password');
  if (!captcha.ok) return NextResponse.json({ success: false, error: captcha.reason || 'Captcha verification failed' }, { status: 400 });
  if (!email) return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });

  const sub = await Subscriber.findOne({ email: email.toLowerCase() });
  if (!sub) return NextResponse.json({ success: false, error: 'No account found with this email' }, { status: 404 });

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'password-reset' });
  await OTP.create({ email: email.toLowerCase(), code, purpose: 'password-reset', expiresAt });

  try {
    await sendOTPEmail(email.toLowerCase(), code, 'password-reset');
    return NextResponse.json({ success: true, message: 'Reset code sent to your email' });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to send email. Please try again.' }, { status: 500 });
  }
}
