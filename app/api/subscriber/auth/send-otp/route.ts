import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Subscriber from '@/models/Subscriber';
import OTP from '@/models/OTP';
import { sendOTPEmail } from '@/lib/email';
import { verifyRecaptcha } from '@/lib/recaptcha';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    console.log('[send-otp] request body:', body);

    const { email, purpose, recaptchaToken } = body;
    const captcha = await verifyRecaptcha(recaptchaToken, 'send_otp');
    if (!captcha.ok) return NextResponse.json({ success: false, error: captcha.reason || 'Captcha verification failed' }, { status: 400 });
    if (!email || !purpose) {
      console.log('[send-otp] missing email or purpose');
      return NextResponse.json({ success: false, error: 'email and purpose required' }, { status: 400 });
    }

    if (!['email-verify', 'password-reset', 'login'].includes(purpose)) {
      console.log('[send-otp] invalid purpose:', purpose);
      return NextResponse.json({ success: false, error: 'Invalid purpose' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const sub = await Subscriber.findOne({ email: normalizedEmail });
    console.log('[send-otp] subscriber lookup result:', Boolean(sub));

    if ((purpose === 'password-reset' || purpose === 'login') && !sub) {
      console.log('[send-otp] no subscriber found for email:', normalizedEmail);
      return NextResponse.json({ success: false, error: 'No account found with this email' }, { status: 404 });
    }

    if (purpose === 'login' && sub && !sub.isActive) {
      console.log('[send-otp] login attempt for deactivated account:', normalizedEmail);
      return NextResponse.json({ success: false, error: 'Account deactivated. Contact support.' }, { status: 403 });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({ email: normalizedEmail, purpose });
    await OTP.create({ email: normalizedEmail, code, purpose, expiresAt });
    console.log('[send-otp] OTP created for', normalizedEmail, 'purpose:', purpose);

    try {
      await sendOTPEmail(normalizedEmail, code, purpose as 'email-verify' | 'password-reset' | 'login');
      console.log('[send-otp] email sent to', normalizedEmail);
      return NextResponse.json({ success: true, message: 'OTP sent to your email' });
    } catch (emailError) {
      console.error('[send-otp] sendOTPEmail failed:', emailError);
      return NextResponse.json({ success: false, error: 'Failed to send email. Please try again.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[send-otp] unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Server error', details: String(error) }, { status: 500 });
  }
}
