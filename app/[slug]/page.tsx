import connectDB from '@/lib/mongoose';
import StaticPage from '@/models/StaticPage';
import Blog from '@/models/Blog';
import SiteLayout from '@/components/SiteLayout';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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

  const blogTypeInfo = await Blog.findOne({ blogType: normalSlug, publishStatus: 'published' })
    .select('blogTypeLabel').lean() as any;
  if (blogTypeInfo) return {
    title: `${blogTypeInfo.blogTypeLabel || normalSlug} – PristineGaze`,
    description: `Browse all ${blogTypeInfo.blogTypeLabel || normalSlug} articles on PristineGaze.`,
  };

  return { title: 'Not Found – PristineGaze' };
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function excerpt(html: string, len = 160) {
  return html ? html.replace(/<[^>]+>/g, '').slice(0, len) + '…' : '';
}

export default async function CatchAllPage({ params }: P) {
  const { slug } = await params;
  const normalSlug = slug.toLowerCase();
  await connectDB();

  // ── 1. Static page ───────────────────────────────────────────────────────
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

  // ── 2. Blog type listing ─────────────────────────────────────────────────
  const blogTypeInfo = await Blog.findOne({ blogType: normalSlug, publishStatus: 'published' })
    .select('blogTypeLabel').lean() as any;

  if (blogTypeInfo) {
    const [blogs, latestAll] = await Promise.all([
      Blog.find({ blogType: normalSlug, publishStatus: 'published' })
        .select('title slug featuredImage blogTypeLabel createdAt metaDescription content')
        .sort({ createdAt: -1 })
        .lean() as Promise<any[]>,
      Blog.find({ publishStatus: 'published' })
        .select('title slug featuredImage blogType blogTypeLabel createdAt')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean() as Promise<any[]>,
    ]);

    const label = blogTypeInfo.blogTypeLabel || normalSlug;
    const featured = blogs.slice(0, 2);
    const rest = blogs.slice(2);

    return (
      <SiteLayout>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="blog-listing-hero">
          <div className="container">
            <div className="blog-hero-label">PristineGaze Insights</div>
            <h1 className="blog-hero-title">{label}</h1>
            <p className="blog-hero-sub">
              {blogs.length} article{blogs.length !== 1 ? 's' : ''} &bull; Updated daily
            </p>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="site-section">
          <div className="container">
            <div className="row g-4">
              {/* Main column */}
              <div className="col-lg-8">

                {/* Featured pair */}
                {featured.length > 0 && (
                  <div className="row g-3 mb-4">
                    {featured.map((b: any) => (
                      <div className="col-md-6" key={b._id.toString()}>
                        <Link href={`/blogs/${b.slug}`} className="blog-featured-card">
                          <div className="blog-featured-img">
                            {b.featuredImage
                              ? <img src={b.featuredImage} alt={b.title} />
                              : <div className="blog-featured-placeholder" />}
                          </div>
                          <div className="blog-featured-body">
                            <div className="blog-featured-meta">{fmtDate(b.createdAt)}</div>
                            <h2 className="blog-featured-title">{b.title}</h2>
                            <p className="blog-featured-excerpt">{b.metaDescription || excerpt(b.content || '', 120)}</p>
                            <span className="blog-featured-cta">Read More →</span>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Remaining list */}
                {rest.length > 0 && (
                  <div className="blog-list-stack">
                    {rest.map((b: any) => (
                      <Link href={`/blogs/${b.slug}`} className="blog-list-item" key={b._id.toString()}>
                        <div className="blog-list-thumb">
                          {b.featuredImage
                            ? <img src={b.featuredImage} alt={b.title} />
                            : <div className="blog-list-placeholder" />}
                        </div>
                        <div className="blog-list-body">
                          <div className="blog-list-meta">{fmtDate(b.createdAt)}</div>
                          <h3 className="blog-list-title">{b.title}</h3>
                          <p className="blog-list-excerpt">{b.metaDescription || excerpt(b.content || '', 100)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {blogs.length === 0 && (
                  <div className="text-center py-5">
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
                    <p style={{ color: '#64748b', fontSize: 15 }}>No articles published yet. Check back soon.</p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="col-lg-4">
                <div className="blog-sidebar-card">
                  <div className="blog-sidebar-heading">Latest Exclusive Insights</div>
                  <div className="blog-sidebar-list">
                    {latestAll.map((b: any) => (
                      <Link href={`/blogs/${b.slug}`} className="blog-sidebar-item" key={b._id.toString()}>
                        <div className="blog-sidebar-thumb">
                          {b.featuredImage
                            ? <img src={b.featuredImage} alt={b.title} />
                            : <div className="blog-sidebar-placeholder" />}
                        </div>
                        <div className="blog-sidebar-body">
                          {b.blogTypeLabel && <div className="blog-sidebar-type">{b.blogTypeLabel}</div>}
                          <div className="blog-sidebar-title">{b.title}</div>
                          <div className="blog-sidebar-date">{fmtDate(b.createdAt)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  notFound();
}
