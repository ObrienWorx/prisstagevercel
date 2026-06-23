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
    const heroImage = typeof body.heroImage === 'string' ? body.heroImage.trim() : '';
    const videoSectionTitle = typeof body.videoSectionTitle === 'string' ? body.videoSectionTitle.trim() : '';
    const videoSectionDescription = typeof body.videoSectionDescription === 'string' ? body.videoSectionDescription.trim() : '';
    const videoSectionButtonText = typeof body.videoSectionButtonText === 'string' ? body.videoSectionButtonText.trim() : '';
    const videoSectionButtonHref = typeof body.videoSectionButtonHref === 'string' ? body.videoSectionButtonHref.trim() : '';
    const videoSectionYoutubeUrl = typeof body.videoSectionYoutubeUrl === 'string' ? body.videoSectionYoutubeUrl.trim() : '';
    const tickerLeadPdf = typeof body.tickerLeadPdf === 'string' ? body.tickerLeadPdf.trim() : '';
    const blogLeadPdf = typeof body.blogLeadPdf === 'string' ? body.blogLeadPdf.trim() : '';

    const settings = await HomepageSetting.findOneAndUpdate(
      { key: 'homepage' },
      {
        key: 'homepage',
        heroImage,
        videoSectionTitle,
        videoSectionDescription,
        videoSectionButtonText,
        videoSectionButtonHref,
        videoSectionYoutubeUrl,
        tickerLeadPdf,
        blogLeadPdf,
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    return successResponse(settings, 'Homepage settings saved');
  } catch (err) {
    console.error('[PUT /api/homepage-settings]', err);
    return errorResponse('Save failed', 500);
  }
}
