import connectDB from '@/lib/mongoose';
import StaticPage from '@/models/StaticPage';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';
import ReportCategory from '@/models/ReportCategory';
import Report from '@/models/Report';
import Sector from '@/models/Sector';
import SiteLayout from '@/components/SiteLayout';
import { notFound } from 'next/navigation';
import ContentListing from '@/components/ContentListing';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P) {
  const { slug } = await params;
  const normalSlug = slug.toLowerCase();
  await connectDB();

  const page = await StaticPage.findOne({ slug: normalSlug, isPublished: true }).lean() as any;
  if (page) return {
    title: page.metaTitle || `${page.title} – PristineGaze`,
    description: page.metaDescription || '',
  };

  const blogCat = await BlogCategory.findOne({ slug: normalSlug, status: 'active' }).lean() as any;
  if (blogCat) return {
    title: `${blogCat.name} – PristineGaze`,
    description: blogCat.description || `Browse all ${blogCat.name} articles on PristineGaze.`,
  };

  const reportCat = await ReportCategory.findOne({ slug: normalSlug, status: 'active' }).lean() as any;
  if (reportCat) return {
    title: `${reportCat.name} – PristineGaze`,
    description: reportCat.description || `Browse all ${reportCat.name} reports on PristineGaze.`,
  };

  return { title: 'Not Found – PristineGaze' };
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function excerpt(html: string, len = 160) {
  return html ? html.replace(/<[^>]+>/g, '').slice(0, len) + '…' : '';
}

export default async function CatchAllPage({ params }: P) {
  const { slug } = await params;
  const normalSlug = slug.toLowerCase();
  await connectDB();

  // ── 1. Static page ────────────────────────────────────────────────────────
  const page = await StaticPage.findOne({ slug: normalSlug, isPublished: true }).lean() as any;
  if (page) {
    return (
      <SiteLayout>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #101251 100%)', color: '#fff', padding: '4rem 0 3rem' }}>
          <div className="container">
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
              {page.title}
            </h1>
          </div>
        </div>
        <div className="site-section">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-12">
                <div className="static-page-content" dangerouslySetInnerHTML={{ __html: page.content }} />
              </div>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // ── 2. Blog category listing ──────────────────────────────────────────────
  const blogCat = await BlogCategory.findOne({ slug: normalSlug, status: 'active' }).lean() as any;
  if (blogCat) {
    const [blogs, latestBlogs, allBlogCats] = await Promise.all([
      Blog.find({ category: blogCat._id, publishStatus: 'published' })
        .select('title slug featuredImage createdAt metaDescription content')
        .sort({ createdAt: -1 })
        .lean() as Promise<any[]>,
      Blog.find({ publishStatus: 'published' })
        .populate('category', 'slug')
        .select('title slug featuredImage createdAt category')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean() as Promise<any[]>,
      BlogCategory.find({ status: 'active' }).select('name slug').sort({ name: 1 }).lean(),
    ]);

    const items = blogs.map((b: any) => ({
      _id: b._id.toString(),
      title: b.title,
      slug: b.slug,
      featuredImage: b.featuredImage,
      date: fmtDate(b.createdAt),
      excerpt: b.metaDescription || excerpt(b.content || '', 120),
      href: `/${blogCat.slug}/${b.slug}`,
      cta: `Read ${blogCat.name} »`,
    }));

    const latestItems = latestBlogs.map((b: any) => ({
      _id: b._id.toString(),
      title: b.title,
      slug: b.slug,
      featuredImage: b.featuredImage,
      href: b.category?.slug ? `/${b.category.slug}/${b.slug}` : `#`,
    }));

    return (
      <SiteLayout>
        <ContentListing
          title={blogCat.name}
          items={items}
          latestItems={latestItems}
          sidebarType="blog"
          latestLabel={`Latest ${blogCat.name}`}
          categories={(allBlogCats as any[]).map((c: any) => ({ name: c.name, slug: c.slug, href: `/${c.slug}` }))}
        />
      </SiteLayout>
    );
  }

  // ── 3. Report category listing ────────────────────────────────────────────
  const reportCat = await ReportCategory.findOne({ slug: normalSlug, status: 'active' }).lean() as any;
  if (reportCat) {
    const [reports, latestReports, allSectors, allReportCats] = await Promise.all([
      Report.find({ category: reportCat._id, publishStatus: 'published' })
        .populate('sector', 'name slug')
        .select('title slug featuredImage createdAt sector')
        .sort({ createdAt: -1 })
        .lean() as Promise<any[]>,
      Report.find({ publishStatus: 'published' })
        .select('title slug featuredImage createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean() as Promise<any[]>,
      Sector.find({}).select('name slug').sort({ name: 1 }).lean(),
      ReportCategory.find({ status: 'active' }).select('name slug').sort({ name: 1 }).lean(),
    ]);

    const items = reports.map((r: any) => ({
      _id: r._id.toString(),
      title: r.title,
      slug: r.slug,
      featuredImage: r.featuredImage,
      date: fmtDate(r.createdAt),
      href: `/reports/${r.slug}`,
      cta: 'Read Report »',
    }));

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
          title={reportCat.name}
          items={items}
          latestItems={latestItems}
          sidebarType="report"
          latestLabel="Latest Reports"
          sectors={(allSectors as any[]).map((s: any) => ({ name: s.name, slug: s.slug, href: `/sectors/${s.slug}` }))}
          categories={(allReportCats as any[]).map((c: any) => ({ name: c.name, slug: c.slug, href: `/${c.slug}` }))}
        />
      </SiteLayout>
    );
  }

  notFound();
}
