import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import HomepageSetting from '@/models/HomepageSetting';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectDB();
  const s = await HomepageSetting.findOne({ key: 'homepage' }).lean() as any;
  return NextResponse.json({
    blogPopupTitle: s?.blogPopupTitle || 'Please fill the details to Unlock the Exclusive ASX Stock Report',
    blogPopupButtonText: s?.blogPopupButtonText || 'Unlock the Ticker',
    blogPopupSuccessText: s?.blogPopupSuccessText || 'You will receive the detailed Stock Report on your submitted email.',
    blogPromoHeading: s?.blogPromoHeading || 'Some ASX Opportunities Are Still Flying Under the Radar.',
    blogPromoLead: s?.blogPromoLead || 'Download our Complimentary Research Report featuring 5 ASX-listed companies poised to grow this year.',
    blogPromoSubtitle: s?.blogPromoSubtitle || "What's in the Complimentary Report?",
    blogPromoItems: s?.blogPromoItems?.length ? s.blogPromoItems : [
      '5 high-potential ASX stocks selected by our experts',
      'Technical and fundamental analysis explained in a simple format',
      'General research opinions and market outlook on each company',
      'Key business highlights, sector trends, and growth drivers',
      'Insights designed to help investors make more informed decisions',
    ],
    blogPromoButtonText: s?.blogPromoButtonText || 'Claim your Free Copy',
    blogPromoPopupTitle: s?.blogPromoPopupTitle || 'Please fill the details to Unlock the Exclusive ASX Stock Report',
    blogPromoPopupButtonText: s?.blogPromoPopupButtonText || 'Unlock the Report',
    blogPromoPopupSuccessText: s?.blogPromoPopupSuccessText || 'You will receive the detailed Stock Report on your submitted email.',
  });
}
