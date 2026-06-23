import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(to: string, otp: string, purpose: 'email-verify' | 'password-reset' | 'login') {
  const isReset = purpose === 'password-reset';
  const isLogin = purpose === 'login';
  const subject = isReset ? 'Reset Your Password – PristineGaze' : isLogin ? 'Your Login Code – PristineGaze' : 'Verify Your Email – PristineGaze';
  const title = isReset ? 'Password Reset Code' : isLogin ? 'Login Verification Code' : 'Email Verification Code';
  const body = isReset
    ? 'You requested a password reset. Use the code below to set a new password.'
    : isLogin
    ? 'You requested to log in with a one-time code. Use the code below to sign in.'
    : 'Welcome to PristineGaze! Use the code below to verify your email address.';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
              PRISTINE GAZE
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">${title}</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">${body}</p>
            <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;margin-bottom:12px;">Your verification code</div>
              <div style="font-size:48px;font-weight:800;color:#0f172a;letter-spacing:12px;line-height:1;">${otp}</div>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-align:center;">
              This code expires in <strong style="color:#64748b;">10 minutes</strong>. Do not share it with anyone.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:28px 0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
              If you didn't request this, you can safely ignore this email.<br>
              © 2026 Pristine Gaze Pty. Ltd. · <a href="https://pristinegaze.com.au" style="color:#3b82f6;text-decoration:none;">pristinegaze.com.au</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'PristineGaze <no-reply@pristinegaze.com.au>',
    to,
    subject,
    html,
  });
}

// The lead-magnet email body is the project's template.html. Cache the file read and
// MINIFY it: the builder export is ~290KB of indented nested tables, which exceeds
// Gmail's ~102KB clipping limit ("[Message clipped]"). Collapsing whitespace between
// tags drops it to ~66KB without changing how it renders.
let cachedTemplate: string | null | undefined;
function loadLeadTemplate(): string | null {
  if (cachedTemplate !== undefined) return cachedTemplate;
  try {
    cachedTemplate = readFileSync(path.join(process.cwd(), 'template.html'), 'utf8')
      .replace(/>\s+</g, '><')   // drop whitespace between tags (incl. newlines)
      .replace(/\s{2,}/g, ' ');  // collapse remaining runs of whitespace
  } catch {
    cachedTemplate = null;
  }
  return cachedTemplate;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Sent automatically to a lead after they submit a capture form. The "Download PDF"
// button DOWNLOADS the configured lead-magnet PDF (served with an attachment header).
export async function sendLeadMagnetEmail(to: string, name: string, pdfUrl: string) {
  const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://pristinegaze.com.au').replace(/\/$/, '');
  // Route uploaded files through /api/download so they download instead of opening inline.
  // External (absolute) URLs are linked as-is.
  const href = /^https?:\/\//i.test(pdfUrl)
    ? pdfUrl
    : `${base}/api/download?file=${encodeURIComponent(pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`)}`;
  const safeName = escapeHtml((name || '').trim());
  const subject = 'Your Free Report – PristineGaze';

  const template = loadLeadTemplate();
  let html: string;
  if (template) {
    html = template
      // Point both (mso + non-mso) "Download PDF" buttons at the download link.
      .replace(/https:\/\/pristinegaze\.com\.au\/subscribe"/g, `${href}"`)
      // Personalise the greeting ("Dear Ryan," -> the submitted name).
      .replace(/Dear\s+Ryan,/g, `Dear ${safeName || 'Investor'},`);
  } else {
    const greeting = safeName ? `Dear ${safeName},` : 'Dear Investor,';
    html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;">
      <p>${greeting}</p><p>Thank you for your interest. Download your complimentary report below.</p>
      <p><a href="${href}" style="display:inline-block;background:#0049ac;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;">Download PDF</a></p>
      <p>Or copy this link: <a href="${href}">${href}</a></p>
      <p style="color:#888;font-size:12px;">© Pristine Gaze Pty. Ltd.</p></body></html>`;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'PristineGaze <no-reply@pristinegaze.com.au>',
    to,
    subject,
    html,
  });
}
