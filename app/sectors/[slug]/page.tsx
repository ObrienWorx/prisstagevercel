import connectDB from '@/lib/mongoose';
import Sector from '@/models/Sector';
import Report from '@/models/Report';
import ReportCategory from '@/models/ReportCategory';
import SiteLayout from '@/components/SiteLayout';
import ContentListing from '@/components/ContentListing';
import { toReportListItem, LISTING_PER_PAGE } from '@/lib/listItems';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P) {
  const { slug } = await params;
  await connectDB();
  const sector = await Sector.findOne({ slug }).lean() as any;
  if (!sector) return { title: 'Sector Not Found – PristineGaze' };
  return { title: `${sector.name} Research – PristineGaze` };
}

export default async function SectorPage({ params }: P) {
  const { slug } = await params;
  await connectDB();

  const sector = await Sector.findOne({ slug }).lean() as any;
  if (!sector) notFound();

  const reportFilter: Record<string, unknown> = { sector: sector._id, publishStatus: 'published' };
  const [reports, total, latestReports, allSectors, allReportCats] = await Promise.all([
    Report.find(reportFilter)
      .select('title slug featuredImage createdAt recommendation')
      .sort({ createdAt: -1 })
      .limit(LISTING_PER_PAGE)
      .lean() as Promise<any[]>,
    Report.countDocuments(reportFilter),
    Report.find({ publishStatus: 'published' })
      .select('title slug featuredImage createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean() as Promise<any[]>,
    Sector.find({}).select('name slug').sort({ name: 1 }).lean(),
    ReportCategory.find({ status: 'active' }).select('name slug').sort({ name: 1 }).lean(),
  ]);

  const items = reports.map(toReportListItem);

  const latestItems = latestReports.map((r: any) => ({
    _id: r._id.toString(),
    title: r.title,
    slug: r.slug,
    featuredImage: r.featuredImage,
    href: `/reports/${r.slug}`,
  }));

  return (
    <SiteLayout>
      <ContentListing
        title={sector.name}
        items={items}
        latestItems={latestItems}
        sidebarType="report"
        latestLabel="Latest Reports"
        sectors={(allSectors as any[]).map((s: any) => ({ name: s.name, slug: s.slug, href: `/sectors/${s.slug}` }))}
        categories={(allReportCats as any[]).map((c: any) => ({ name: c.name, slug: c.slug, href: `/${c.slug}` }))}
        loadMore={{ endpoint: '/api/public/reports', query: { sector: sector.slug }, total, perPage: LISTING_PER_PAGE }}
      />
    </SiteLayout>
  );
}
