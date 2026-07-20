import type { MetadataRoute } from 'next';
import connectDB from '@/lib/mongoose';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';
import Report from '@/models/Report';
import ReportCategory from '@/models/ReportCategory';
import Sector from '@/models/Sector';
import StaticPage from '@/models/StaticPage';
import LearnAndEarn from '@/models/LearnAndEarn';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pristinegaze.com.au';

function u(path: string, lastmod?: Date | string): MetadataRoute.Sitemap[number] {
  return {
    url: `${BASE_URL}${path}`,
    lastModified: lastmod ? new Date(lastmod) : undefined,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.8,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const staticUrls: MetadataRoute.Sitemap = [
    u('/', new Date()),
    u('/about-us'),
    u('/contact-us'),
    u('/subscribe'),
    u('/past-recommendations'),
    u('/search'),
    u('/videos'),
    u('/learn-and-earn'),
  ];

  const blogCatUrls = blogCategories.map((c) => u(`/${c.slug}`, c.updatedAt));

  const blogUrls = blogs.map((b) => {
    const catSlug = (b.category as { slug: string } | null)?.slug || 'uncategorised';
    return u(`/${catSlug}/${b.slug}`, b.updatedAt ?? b.publishedAt);
  });

  const reportCatUrls = reportCategories.map((c) => u(`/category/${c.slug}`, c.updatedAt));

  const reportUrls = reports.map((r) => u(`/reports/${r.slug}`, r.updatedAt));

  const sectorUrls = sectors.map((s) => u(`/sectors/${s.slug}`, s.updatedAt));

  const staticPageUrls = staticPages.map((p) => u(`/${p.slug}`, p.updatedAt));

  const learnUrls = learns.map((l) => u(`/learn-and-earn/${l.slug}`, l.updatedAt));

  return [
    ...staticUrls,
    ...staticPageUrls,
    ...blogCatUrls,
    ...blogUrls,
    ...reportCatUrls,
    ...reportUrls,
    ...sectorUrls,
    ...learnUrls,
  ];
}
