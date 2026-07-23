import connectDB from '@/lib/mongoose';
import Sector from '@/models/Sector';
import Report from '@/models/Report';
import ReportCategory from '@/models/ReportCategory';
import SiteLayout from '@/components/SiteLayout';
import ContentListing from '@/components/ContentListing';
import { toReportListItem, LISTING_PER_PAGE } from '@/lib/listItems';
import { notFutureDated } from '@/lib/reportVisibility';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySubscriberToken } from '@/lib/subscriberJwt';

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

  const cookieStore = await cookies();
  const token = cookieStore.get('subscriber_token')?.value;
  const isLoggedIn = token ? verifySubscriberToken(token) !== null : false;

  const reportFilter: Record<string, unknown> = { sector: sector._id, publishStatus: 'published', ...notFutureDated() };
  const [reports, total, latestReports, allSectors, allReportCats] = await Promise.all([
    Report.find(reportFilter)
      .select('title slug featuredImage createdAt publishedAt recommendation')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(LISTING_PER_PAGE)
      .lean() as Promise<any[]>,
    Report.countDocuments(reportFilter),
    Report.find({ publishStatus: 'published', ...notFutureDated() })
      .select('title slug featuredImage createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean() as Promise<any[]>,
    Sector.find({}).select('name slug icon').sort({ name: 1 }).lean(),
    ReportCategory.find({ status: 'active' }).select('name slug icon').sort({ name: 1 }).lean(),
  ]);

  const items = reports.map((r: any) => {
    const item = toReportListItem(r);
    return isLoggedIn ? item : { ...item, recommendation: '' };
  });

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
        sectors={(allSectors as any[]).map((s: any) => ({ name: s.name, slug: s.slug, href: `/sectors/${s.slug}`, icon: s.icon }))}
        categories={(allReportCats as any[]).map((c: any) => ({ name: c.name, slug: c.slug, href: `/category/${c.slug}`, icon: c.icon }))}
        loadMore={{ endpoint: '/api/public/reports', query: { sector: sector.slug }, total, perPage: LISTING_PER_PAGE }}
      />
    </SiteLayout>
  );
}
