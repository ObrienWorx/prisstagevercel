import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import HomepageSetting from '@/models/HomepageSetting';
import { requireAdmin } from '@/middleware/authMiddleware';
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  await connectDB();
  const settings = await HomepageSetting.findOneAndUpdate(
    { key: 'homepage' },
    { $setOnInsert: { key: 'homepage' } },
    { returnDocument: 'after', upsert: true }
  );

  return successResponse(settings);
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const heroSlides = Array.isArray(body.heroSlides)
      ? body.heroSlides
          .map((s: { image?: unknown; title?: unknown; link?: unknown }) => ({
            image: typeof s?.image === 'string' ? s.image.trim() : '',
            title: typeof s?.title === 'string' ? s.title.trim() : '',
            link: typeof s?.link === 'string' ? s.link.trim() : '',
          }))
          .filter((s: { image: string }) => s.image)
      : [];
    // Keep the legacy single field in sync with the first slide.
    const heroImage = heroSlides[0]?.image || (typeof body.heroImage === 'string' ? body.heroImage.trim() : '');
    const videoSectionTitle = typeof body.videoSectionTitle === 'string' ? body.videoSectionTitle.trim() : '';
    const videoSectionDescription = typeof body.videoSectionDescription === 'string' ? body.videoSectionDescription.trim() : '';
    const videoSectionButtonText = typeof body.videoSectionButtonText === 'string' ? body.videoSectionButtonText.trim() : '';
    const videoSectionButtonHref = typeof body.videoSectionButtonHref === 'string' ? body.videoSectionButtonHref.trim() : '';
    const videoSectionYoutubeUrl = typeof body.videoSectionYoutubeUrl === 'string' ? body.videoSectionYoutubeUrl.trim() : '';
    const tickerLeadPdf = typeof body.tickerLeadPdf === 'string' ? body.tickerLeadPdf.trim() : '';
    const blogLeadPdf = typeof body.blogLeadPdf === 'string' ? body.blogLeadPdf.trim() : '';
    const blogPopupTitle = typeof body.blogPopupTitle === 'string' ? body.blogPopupTitle.trim() : '';
    const blogPopupButtonText = typeof body.blogPopupButtonText === 'string' ? body.blogPopupButtonText.trim() : '';
    const blogPopupSuccessText = typeof body.blogPopupSuccessText === 'string' ? body.blogPopupSuccessText.trim() : '';
    const blogPromoHeading = typeof body.blogPromoHeading === 'string' ? body.blogPromoHeading.trim() : '';
    const blogPromoLead = typeof body.blogPromoLead === 'string' ? body.blogPromoLead.trim() : '';
    const blogPromoSubtitle = typeof body.blogPromoSubtitle === 'string' ? body.blogPromoSubtitle.trim() : '';
    const blogPromoItems = Array.isArray(body.blogPromoItems) ? body.blogPromoItems.map((x: unknown) => String(x).trim()).filter(Boolean) : [];
    const blogPromoButtonText = typeof body.blogPromoButtonText === 'string' ? body.blogPromoButtonText.trim() : '';
    const blogPromoPopupTitle = typeof body.blogPromoPopupTitle === 'string' ? body.blogPromoPopupTitle.trim() : '';
    const blogPromoPopupButtonText = typeof body.blogPromoPopupButtonText === 'string' ? body.blogPromoPopupButtonText.trim() : '';
    const blogPromoPopupSuccessText = typeof body.blogPromoPopupSuccessText === 'string' ? body.blogPromoPopupSuccessText.trim() : '';

    const settings = await HomepageSetting.findOneAndUpdate(
      { key: 'homepage' },
      {
        key: 'homepage',
        heroImage,
        heroSlides,
        videoSectionTitle,
        videoSectionDescription,
        videoSectionButtonText,
        videoSectionButtonHref,
        videoSectionYoutubeUrl,
        tickerLeadPdf,
        blogLeadPdf,
        blogPopupTitle,
        blogPopupButtonText,
        blogPopupSuccessText,
        blogPromoHeading,
        blogPromoLead,
        blogPromoSubtitle,
        blogPromoItems,
        blogPromoButtonText,
        blogPromoPopupTitle,
        blogPromoPopupButtonText,
        blogPromoPopupSuccessText,
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    return successResponse(settings, 'Homepage settings saved');
  } catch (err) {
    console.error('[PUT /api/homepage-settings]', err);
    return errorResponse('Save failed', 500);
  }
}
