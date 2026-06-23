import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import LeadSubmission from '@/models/LeadSubmission';
import HomepageSetting from '@/models/HomepageSetting';
import { sendLeadMagnetEmail } from '@/lib/email';
import { successResponse, errorResponse } from '@/lib/apiResponse';

// Two lead-magnet PDFs are configured in Homepage Settings: one for the homepage "Ticker"
// unlock form, one for blog-category "claim your free copy" forms.
async function resolveLeadMagnet(source: string) {
  const hp = await HomepageSetting.findOne({ key: 'homepage' }).select('tickerLeadPdf blogLeadPdf').lean() as
    | { tickerLeadPdf?: string; blogLeadPdf?: string } | null;
  const pdf = source === 'Ticker' ? hp?.tickerLeadPdf : hp?.blogLeadPdf;
  return { pdf: pdf || '' };
}

// Mirror the lead into the Pristine Alliance CRM (which also syncs it to Brevo).
// Field names match the CRM controller's $request->*_1 keys. Best-effort.
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
    const { name, email, phone, postalCode, source, consent, sourceUrl } = await req.json();
    if (!name || !email || !phone || !postalCode) return errorResponse('All fields are required', 400);
    if (!consent) return errorResponse('Consent is required', 400);

    const normalisedSource = source || 'general';

    // One free report per person: block resubmission if this email OR phone already
    // submitted a lead-magnet form. Contact-us is excluded (and never blocks others).
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

    // Best-effort: email the lead the configured PDF for this source. Never fail the
    // submission if the mail/config is missing.
    try {
      const { pdf } = await resolveLeadMagnet(normalisedSource);
      if (pdf) await sendLeadMagnetEmail(email, name, pdf);
    } catch (mailErr) {
      console.error('Lead magnet email failed:', mailErr);
    }

    // Best-effort: mirror the new lead into the CRM / Brevo. Never fail the submission.
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
