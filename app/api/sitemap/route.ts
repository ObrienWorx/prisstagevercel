import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';
import Report from '@/models/Report';
import ReportCategory from '@/models/ReportCategory';
import Sector from '@/models/Sector';
import StaticPage from '@/models/StaticPage';
import LearnAndEarn from '@/models/LearnAndEarn';
import { authenticate } from '@/middleware/authMiddleware';
import { errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pristinegaze.com.au';

function url(path: string, lastmod?: Date | string) {
  const loc = `${BASE_URL}${path}`;
  const mod = lastmod ? new Date(lastmod).toISOString().split('T')[0] : undefined;
  return `  <url>\n    <loc>${loc}</loc>${mod ? `\n    <lastmod>${mod}</lastmod>` : ''}\n  </url>`;
}

export async function GET(req: NextRequest) {
  const { error } = await authenticate(req);
  if (error) return error;

  try {
    await connectDB();

    const [blogs, blogCategories, reports, reportCategories, sectors, staticPages, learns] =
      await Promise.all([
        Blog.find({ publishStatus: 'published' })
          .populate<{ category: { slug: string } | null }>('category', 'slug')
          .select('slug category updatedAt publishedAt')
          .lean(),
        BlogCategory.find({ status: 'active' }).select('slug updatedAt').lean(),
        Report.find({ publishStatus: 'published' }).select('slug updatedAt').lean(),
        ReportCategory.find({ status: 'active' }).select('slug updatedAt').lean(),
        Sector.find().select('slug updatedAt').lean(),
        StaticPage.find({ isPublished: true }).select('slug updatedAt').lean(),
        LearnAndEarn.find({ publishStatus: 'published' }).select('slug updatedAt').lean(),
      ]);

    const staticUrls = [
      url('/'),
      url('/about-us'),
      url('/contact-us'),
      url('/subscribe'),
      url('/past-recommendations'),
      url('/search'),
      url('/videos'),
      url('/learn-and-earn'),
    ];

    const blogCatUrls = blogCategories.map((c) => url(`/${c.slug}`, c.updatedAt));

    const blogUrls = blogs.map((b) => {
      const catSlug = (b.category as { slug: string } | null)?.slug || 'uncategorised';
      return url(`/${catSlug}/${b.slug}`, b.updatedAt);
    });

    const reportCatUrls = reportCategories.map((c) => url(`/category/${c.slug}`, c.updatedAt));

    const reportUrls = reports.map((r) => url(`/reports/${r.slug}`, r.updatedAt));

    const sectorUrls = sectors.map((s) => url(`/sectors/${s.slug}`, s.updatedAt));

    const staticPageUrls = staticPages.map((p) => url(`/${p.slug}`, p.updatedAt));

    const learnUrls = learns.map((l) => url(`/learn-and-earn/${l.slug}`, l.updatedAt));

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticUrls,
      ...staticPageUrls,
      ...blogCatUrls,
      ...blogUrls,
      ...reportCatUrls,
      ...reportUrls,
      ...sectorUrls,
      ...learnUrls,
      '</urlset>',
    ].join('\n');

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': 'attachment; filename="sitemap.xml"',
      },
    });
  } catch (err) {
    console.error('Sitemap generation error:', err);
    return errorResponse('Failed to generate sitemap', 500);
  }
}
