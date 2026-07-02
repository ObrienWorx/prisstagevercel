import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import Sector from '@/models/Sector';
import ReportCategory from '@/models/ReportCategory';
import '@/models/Product';
import SiteLayout from '@/components/SiteLayout';
import ContentListing from '@/components/ContentListing';
import { fmtDate } from '@/lib/dates';
import { notFutureDated } from '@/lib/reportVisibility';

export const dynamic = 'force-dynamic';

const PER_PAGE = 12;

type P = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ searchParams }: P) {
  const { q } = await searchParams;
  return {
    title: q ? `Search: "${q}" – PristineGaze` : 'Search – PristineGaze',
  };
}

export default async function SearchPage({ searchParams }: P) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() || '';
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  await connectDB();

  const [latestReports, allSectors, allReportCats] = await Promise.all([
    Report.find({ publishStatus: 'published', ...notFutureDated() })
      .select('title slug featuredImage createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean() as Promise<any[]>,
    Sector.find({}).select('name slug').sort({ name: 1 }).lean(),
    ReportCategory.find({ status: 'active' }).select('name slug').sort({ name: 1 }).lean(),
  ]);

  let results: any[] = [];
  let totalCount = 0;

  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    const filter: any = { publishStatus: 'published', ...notFutureDated(), $or: [{ title: regex }, { upsellTicker: regex }, { ticker: regex }] };
    totalCount = await Report.countDocuments(filter);
    results = await Report.find(filter)
      .select('title slug featuredImage createdAt publishedAt recommendation')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean() as any[];
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  const items = results.map((r: any) => ({
    _id: r._id.toString(),
    title: r.title,
    slug: r.slug,
    featuredImage: r.featuredImage,
    date: fmtDate(r.publishedAt ?? r.createdAt),
    href: `/reports/${r.slug}`,
    cta: 'Read Report »',
    recommendation: r.recommendation || '',
  }));

  const latestItems = latestReports.map((r: any) => ({
    _id: r._id.toString(),
    title: r.title,
    featuredImage: r.featuredImage,
    href: `/reports/${r.slug}`,
  }));

  const title = query
    ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for "${query}"`
    : 'Search Reports';

  return (
    <SiteLayout>
      <ContentListing
        title={title}
        items={items}
        latestItems={latestItems}
        sidebarType="report"
        latestLabel="Latest Reports"
        emptyMessage={query ? `No reports found for "${query}". Try a different keyword.` : 'Enter a search term in the header to find reports.'}
        sectors={(allSectors as any[]).map((s: any) => ({ name: s.name, slug: s.slug, href: `/sectors/${s.slug}` }))}
        categories={(allReportCats as any[]).map((c: any) => ({ name: c.name, slug: c.slug, href: `/${c.slug}` }))}
        pagination={query && totalPages > 1 ? { page, totalPages, basePath: '/search', query: `q=${encodeURIComponent(query)}` } : undefined}
      />
    </SiteLayout>
  );
}
