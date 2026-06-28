import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import LeadSubmission from '@/models/LeadSubmission';
import HomepageSetting from '@/models/HomepageSetting';
import { sendLeadMagnetEmail } from '@/lib/email';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { verifyRecaptcha } from '@/lib/recaptcha';

async function resolveLeadMagnet(source: string) {
  const hp = await HomepageSetting.findOne({ key: 'homepage' }).select('tickerLeadPdf blogLeadPdf').lean() as
    | { tickerLeadPdf?: string; blogLeadPdf?: string } | null;
  const pdf = source === 'Ticker' ? hp?.tickerLeadPdf : hp?.blogLeadPdf;
  return { pdf: pdf || '' };
}

const CRM_HOOK_URL = 'https://pristinealliance.pristinegaze.com.au/api/hook-testing';
async function pushToCrm(lead: { name: string; email: string; phone: string; postalCode: string; source: string; sourceUrl: string }) {
  await fetch(CRM_HOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name_1: lead.name,
      email_1: lead.email,
      phone_1: lead.phone,
      number_1: lead.postalCode,
      source: lead.source,
      current_url: lead.sourceUrl,
      user: 0,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, phone, postalCode, source, consent, sourceUrl, recaptchaToken } = await req.json();
    const captcha = await verifyRecaptcha(recaptchaToken, 'lead');
    if (!captcha.ok) return errorResponse(captcha.reason || 'Captcha verification failed', 400);
    if (!name || !email || !phone || !postalCode) return errorResponse('All fields are required', 400);
    if (!consent) return errorResponse('Consent is required', 400);

    const normalisedSource = source || 'general';

    if (normalisedSource !== 'contact-us') {
      const existing = await LeadSubmission.findOne({
        source: { $ne: 'contact-us' },
        $or: [{ email: email.toLowerCase().trim() }, { phone }],
      });
      if (existing) {
        return successResponse({ alreadyExists: true }, 'We have already sent you the Free Report.', 200);
      }
    }

    const lead = await LeadSubmission.create({
      name, email, phone, postalCode,
      source: normalisedSource,
      consent,
    });

    try {
      const { pdf } = await resolveLeadMagnet(normalisedSource);
      if (pdf) await sendLeadMagnetEmail(email, name, pdf);
    } catch (mailErr) {
      console.error('Lead magnet email failed:', mailErr);
    }

    try {
      await pushToCrm({ name, email, phone, postalCode, source: normalisedSource, sourceUrl: sourceUrl || '' });
    } catch (crmErr) {
      console.error('CRM push failed:', crmErr);
    }

    return successResponse(lead, 'Submitted successfully', 201);
  } catch (e: unknown) {
    return errorResponse(e instanceof Error ? e.message : 'Server error', 500);
  }
}
