import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import OTP from '@/models/OTP';
import { sendOTPEmail } from '@/lib/email';
import { verifyRecaptcha } from '@/lib/recaptcha';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  await connectDB();
  const { name, email, phone, recaptchaToken } = await req.json();
  const captcha = await verifyRecaptcha(recaptchaToken, 'register');
  if (!captcha.ok) return NextResponse.json({ success: false, error: captcha.reason || 'Captcha verification failed' }, { status: 400 });
  if (!name || !email || !phone) return NextResponse.json({ success: false, error: 'Name, email, and phone are required' }, { status: 400 });
  if (await Subscriber.findOne({ email: email.toLowerCase() })) return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });

  await Subscriber.create({ name, email: email.toLowerCase().trim(), phone: phone.trim(), isEmailVerified: false });

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await OTP.deleteMany({ email: email.toLowerCase(), purpose: 'email-verify' });
  await OTP.create({ email: email.toLowerCase(), code, purpose: 'email-verify', expiresAt });

  try {
    await sendOTPEmail(email.toLowerCase(), code, 'email-verify');
    return NextResponse.json({ success: true, message: 'Account created. Check your email for the verification code.', data: { email: email.toLowerCase() } }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Account created but failed to send verification email. Please use resend OTP.' }, { status: 500 });
  }
}
