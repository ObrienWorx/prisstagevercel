import connectDB from '@/lib/mongoose';
import StaticPage from '@/models/StaticPage';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';
import ReportCategory from '@/models/ReportCategory';
import Report from '@/models/Report';
import Sector from '@/models/Sector';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ContentListing from '@/components/ContentListing';
import { normalizeBlogTags } from '@/lib/blogTags';

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

function cleanExcerpt(html: string, len = 160) {
  if (!html) return '';

  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > len ? `${text.slice(0, len).trim()}...` : text;
}

export default async function CatchAllPage({ params }: P) {
  const { slug } = await params;
  const normalSlug = slug.toLowerCase();
  await connectDB();

  // ── 1. Static page ────────────────────────────────────────────────────────
  const page = await StaticPage.findOne({ slug: normalSlug, isPublished: true }).lean() as any;
  if (page) {
    if (page.slug === 'about-us') {
      return (
        <SiteLayout>
          <section className="homepage-hero">
            <div className="container position-relative">
              <div className="row align-items-start g-5">
                <div className="col-lg-6">
                  <h1 className="homepage-hero-title">{page.title}</h1>
                  <p className="homepage-hero-lead">
                    At Pristine Gaze, we offer independent equity research through technology-powered, in-depth analysis and insights on a range of listed stocks.
                  </p>
                  <ul className="homepage-hero-list">
                    <li>Actionable stock ideas for informed Buy, Hold, and Sell decisions</li>
                    <li>Value, Growth, and Hybrid strategies tailored to market opportunities</li>
                    <li>Research grounded in discipline, risk management, and margin of safety</li>
                  </ul>
                  <div className="homepage-hero-actions">
                    <Link href="/subscribe" className="homepage-hero-btn">Start your free Trial</Link>
                    <Link href="/reports" className="homepage-hero-btn">Get Sample Report</Link>
                  </div>
                  <div className="homepage-hero-trust">
                    <div><span className="homepage-hero-check">✓</span> 7-Days Free Trial, no credit card required</div>
                    <div><span className="homepage-hero-check">✓</span> Trusted by 10K+ Investors</div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="homepage-hero-media">
                    <img src="/Stock-Editorial-1.webp" alt="Market research and analytics" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="site-section">
            <div className="container">
              <div className="row justify-content-center mb-5">
                <div className="col-lg-10 text-center">
                  <p className="section-label">Why Choose Pristine Gaze?</p>
                </div>
              </div>
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="about-feature-card">
                    <h3>Expertise and Innovation</h3>
                    <p>Our team comprises seasoned analysts with extensive experience in the Australian, US and Canadian markets. With a strong foundation in financial regulations and research techniques, we provide insights that meet the highest standards.</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="about-feature-card">
                    <h3>Client-Centric Service</h3>
                    <p>Our research is available via an intuitive web and mobile platform, designed for ease of access and personalized user experience. Whether you’re a long-term investor or exploring short-term gains, Pristine Gaze’s recommendations can help guide your investment choices effectively.</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="about-feature-card">
                    <h3>Data-Driven Insights</h3>
                    <p>Leveraging the latest in data science, we offer our clients a seamless research experience on our proprietary platform, where data-driven insights support informed, independent decision-making.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="site-section about-methodology-section">
            <div className="container">
              <div className="row align-items-center g-5">
                <div className="col-lg-6">
                  <div className="about-methodology-image">
                    <img src="/world-map.jpg" alt="Stock analysis methodology" />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="about-methodology-body">
                    <h2>Our Stock Analysis Methodology</h2>
                    <p>While Pristine Gaze’s research is primarily geared towards identifying long-term investment opportunities, we recognize the value of seizing short-term profit potentials when appropriate. Our analysis method is designed to highlight stocks that have reached their full potential or present temporary retracements, providing investors with options to capitalize on these moments.</p>
                    <p>With a focus on quality data and well-structured research, we aim to guide our clients in making strategic decisions that align with their financial goals.</p>
                    <Link href="/contact-us" className="homepage-hero-btn about-methodology-btn">Get In touch with our expert</Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

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
      Blog.find({
        publishStatus: 'published',
        $or: [{ category: blogCat._id }, { categories: blogCat._id }],
      })
        .select('title slug featuredImage tags authorName createdAt metaDescription content')
        .sort({ createdAt: -1 })
        .lean() as Promise<any[]>,
      Blog.find({ publishStatus: 'published' })
        .populate('category', 'slug')
        .populate('categories', 'slug')
        .select('title slug featuredImage createdAt category categories')
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
      tags: normalizeBlogTags(b.tags),
      authorName: b.authorName || '',
      date: fmtDate(b.createdAt),
      excerpt: b.metaDescription || cleanExcerpt(b.content || '', 120),
      href: `/${blogCat.slug}/${b.slug}`,
      cta: `Read ${blogCat.name} »`,
    }));

    const latestItems = latestBlogs.map((b: any) => ({
      _id: b._id.toString(),
      title: b.title,
      slug: b.slug,
      featuredImage: b.featuredImage,
      href: b.category?.slug
        ? `/${b.category.slug}/${b.slug}`
        : b.categories?.[0]?.slug
          ? `/${b.categories[0].slug}/${b.slug}`
          : `#`,
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
        .select('title slug featuredImage createdAt sector recommendation')
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
      recommendation: r.recommendation || '',
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
