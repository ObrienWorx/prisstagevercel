import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import Product from '@/models/Product';
import Sector from '@/models/Sector';
import ReportCategory from '@/models/ReportCategory';
import UserProduct from '@/models/UserProduct';
import SiteLayout from '@/components/SiteLayout';
import ContentListing from '@/components/ContentListing';
import SidebarLoginForm from '@/components/SidebarLoginForm';
import ReportSidebar from '@/components/ReportSidebar';
import SaleSidebarWidget from '@/components/SaleSidebarWidget';
import ProductCardImage from '@/components/ProductCardImage';
import { toReportListItem, LISTING_PER_PAGE } from '@/lib/listItems';
import { notFutureDated } from '@/lib/reportVisibility';
import { fmtDate } from '@/lib/dates';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySubscriberToken } from '@/lib/subscriberJwt';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P) {
  const { slug } = await params;
  await connectDB();
  const product = await Product.findOne({ slug, isActive: true }).lean() as any;
  if (product) return { title: `${product.name} – PristineGaze Research` };
  const r = await Report.findOne({ slug, publishStatus: 'published', ...notFutureDated() }).lean() as any;
  if (!r) return { title: 'Report Not Found – PristineGaze' };
  return { title: `${r.title} – PristineGaze`, description: r.metaDescription || r.title };
}

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  Low: { bg: '#dcfce7', text: '#15803d' },
  Medium: { bg: '#fef9c3', text: '#854d0e' },
  High: { bg: '#ffedd5', text: '#c2410c' },
  'Very High': { bg: '#fee2e2', text: '#991b1b' },
};

export default async function ReportSlugPage({ params }: P) {
  const { slug } = await params;
  await connectDB();

  const product = await Product.findOne({ slug, isActive: true }).lean() as any;

  if (product) {
    if (product.bundledProducts?.length > 0) {
      const bundledProducts = await Product.find({
        _id: { $in: product.bundledProducts },
        isActive: true,
      })
        .select('name slug featuredImage shortDescription riskRating durationValue durationType')
        .sort({ sortOrder: 1, name: 1 })
        .lean() as any[];

      return (
        <SiteLayout>

          <div className="cl-hero">
            <div className="cl-hero-overlay" />
            <div className="container" style={{ position: 'relative', zIndex: 2 }}>
              <h1 className="cl-hero-title">{product.name}</h1>
            </div>
          </div>

          <div className="site-section">
            <div className="container">
              <h2 className="h4 fw-bold mb-4">What&apos;s included</h2>
              {bundledProducts.length === 0 ? (
                <div className="text-muted">No products in this bundle yet.</div>
              ) : (
                <div className="row g-4">
                  {bundledProducts.map((p) => {
                    const rc = p.riskRating ? RISK_COLORS[p.riskRating] : null;
                    return (
                      <div className="col-md-6 col-lg-4" key={p._id.toString()}>
                        <Link href={`/reports/${p.slug}`} className="text-decoration-none">
                          <div className="product-card h-100">
                            <ProductCardImage src={p.featuredImage} alt={p.name} />
                            <div className="product-card-body">
                              <div className="product-card-name">{p.name}</div>
                              {p.durationValue && (
                                <div className="product-card-duration">{p.durationValue} {p.durationType} access</div>
                              )}
                              {rc && (
                                <div className="risk-badge" style={{ background: rc.bg, color: rc.text }}>
                                  Risk: {p.riskRating}
                                </div>
                              )}
                              {p.shortDescription && (
                                <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>{p.shortDescription}</p>
                              )}
                              <span className="btn-subscribe">VIEW REPORTS →</span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SiteLayout>
      );
    }

    const reportFilter: Record<string, unknown> = { product: product._id, publishStatus: 'published', ...notFutureDated() };
    const [reports, total, latestReports, allSectors, allReportCats] = await Promise.all([
      Report.find(reportFilter)
        .select('title slug featuredImage createdAt publishedAt recommendation')
        .sort({ createdAt: -1 })
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

    let hasProductAccess = false;
    const cookieStore = await cookies();
    const token = cookieStore.get('subscriber_token')?.value;
    if (token) {
      const payload = verifySubscriberToken(token);
      if (payload) {
        const up = await UserProduct.findOne({
          subscriber: payload.subscriberId,
          product: product._id,
          isActive: true,
          expiryDate: { $gt: new Date() },
        }).lean();
        hasProductAccess = !!up;
      }
    }

    const items = reports
      .map(toReportListItem)
      .map((it) => (hasProductAccess ? it : { ...it, recommendation: '' }));

    const latestItems = latestReports.map((r: any) => ({
      _id: r._id.toString(),
      title: r.title,
      featuredImage: r.featuredImage,
      href: `/reports/${r.slug}`,
    }));

    return (
      <SiteLayout>
        <ContentListing
          title={product.name}
          items={items}
          latestItems={latestItems}
          sidebarType="report"
          latestLabel="Latest Reports"
          emptyMessage="No reports published for this product yet."
          sectors={(allSectors as any[]).map((s: any) => ({ name: s.name, slug: s.slug, href: `/sectors/${s.slug}`, icon: s.icon }))}
          categories={(allReportCats as any[]).map((c: any) => ({ name: c.name, slug: c.slug, href: `/${c.slug}`, icon: c.icon }))}
          loadMore={{ endpoint: '/api/public/reports', query: { product: String(product._id) }, total, perPage: LISTING_PER_PAGE }}
        />
      </SiteLayout>
    );
  }

  const report = await Report.findOne({ slug, publishStatus: 'published', ...notFutureDated() })
    .populate('sector', 'name slug')
    .populate('product', 'name slug regularPrice salePrice saleOverPrice saleEndDate shortDescription features featuredImage saleBanner saleOverBanner riskRating durationValue durationType plans')
    .populate('category', 'name slug')
    .lean() as any;

  if (!report) notFound();

  let hasAccess = !!report.featured || !report.product;
  let isLoggedIn = false;

  const cookieStore = await cookies();
  const token = cookieStore.get('subscriber_token')?.value;

  if (token) {
    const payload = verifySubscriberToken(token);
    if (payload) {
      isLoggedIn = true;
      const query: Record<string, unknown> = {
        subscriber: payload.subscriberId,
        isActive: true,
        expiryDate: { $gt: new Date() },
      };
      if (report.product) query.product = report.product._id;
      const up = await UserProduct.findOne(query).lean();
      hasAccess = !!up;
    }
  }

  const excerpt = report.content ? report.content.replace(/<[^>]+>/g, '').slice(0, 400) : '';

  const [allSectors, allReportCats, latestReports] = await Promise.all([
    Sector.find({}).select('name slug icon').sort({ name: 1 }).lean() as Promise<any[]>,
    ReportCategory.find({ status: 'active' }).select('name slug icon').sort({ name: 1 }).lean() as Promise<any[]>,
    Report.find({ publishStatus: 'published', ...notFutureDated() }).select('title slug featuredImage createdAt').sort({ createdAt: -1 }).limit(5).lean() as Promise<any[]>,
  ]);
  const sidebarSectors = allSectors.map((s: any) => ({ name: s.name, slug: s.slug, href: `/sectors/${s.slug}`, icon: s.icon }));
  const sidebarCategories = allReportCats.map((c: any) => ({ name: c.name, slug: c.slug, href: `/${c.slug}`, icon: c.icon }));
  const sidebarLatest = latestReports.map((r: any) => ({ _id: r._id.toString(), title: r.title, featuredImage: r.featuredImage, href: `/reports/${r.slug}` }));

  return (
    <SiteLayout>
      <div className="text-white py-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div className="container">
          <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
            {report.category && (
              <Link href={`/${report.category.slug}`} className="badge rounded-pill text-bg-info text-decoration-none">
                {report.category.name}
              </Link>
            )}
            {(report.upsellTicker || report.ticker) && (
              <span className="badge rounded-pill text-bg-success">
                📈 {[report.upsellTicker, report.ticker].filter(Boolean).join(': ')}
              </span>
            )}
          </div>

          <h1 className="display-6 fw-bold mb-3">{report.title}</h1>

          <div className="d-flex align-items-center flex-wrap gap-2 small text-white-50">
            <span>Published {fmtDate(report.publishedAt ?? report.createdAt)}</span>
            {report.product && (
              <Link href={`/reports/${report.product.slug}`} className="badge rounded-pill text-bg-light text-decoration-none">
                {report.product.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="site-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-9">

              {hasAccess ? (
                report.pdfUrl ? (
                  <iframe src={report.pdfUrl} width="100%" height="1000px" style={{ border: 0 }} />
                ) : (
                  <div className="tiptap-prose" dangerouslySetInnerHTML={{ __html: report.content }} />
                )
              ) : (
                <div>
                  {excerpt && (
                    <div className="position-relative overflow-hidden mb-4" style={{ maxHeight: 180 }}>
                      <div className="text-secondary" style={{ filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none' }}>
                        {excerpt}
                      </div>
                      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'linear-gradient(to bottom, transparent 0%, #f1f5f9 80%)' }} />
                    </div>
                  )}

                  <div className="text-white text-center rounded-4 p-4 p-md-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                    <div className="display-4 mb-3">🔒</div>
                    <h3 className="fw-bold mb-3">
                      {isLoggedIn ? 'Subscription required' : 'Subscribers only'}
                    </h3>
                    <p className="text-white-50 mx-auto mb-4" style={{ maxWidth: 420 }}>
                      {isLoggedIn
                        ? report.product
                          ? `You need an active ${report.product.name} subscription to read this report.`
                          : 'You need an active subscription to read this report.'
                        : 'Sign in with your subscriber account or subscribe to access this research report.'}
                    </p>

                    {report.product && (
                      <div className="d-inline-block rounded-3 px-4 py-3 mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="small text-white-50 mb-1">Required subscription</div>
                        <div className="fs-5 fw-bold">{report.product.name}</div>
                        <div className="fs-4 fw-bold text-info mt-1">
                          A${((report.product.salePrice ?? report.product.regularPrice) || 0).toFixed(2)}
                        </div>
                      </div>
                    )}

                    <div className="d-flex gap-2 justify-content-center flex-wrap">
                      <Link
                        href={report.product ? `/subscribe/${report.product.slug}` : '/subscribe'}
                        className="btn btn-primary fw-bold px-4"
                      >
                        {isLoggedIn ? 'Subscribe Now →' : 'View Plans →'}
                      </Link>
                      {!isLoggedIn && (
                        <Link href="/member-account" className="btn btn-outline-light fw-semibold px-4">
                          Sign In
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="col-lg-3 d-none d-lg-block">
              <div className="position-sticky" style={{ top: 80 }}>
                {!hasAccess && (
                  <>
                    {!isLoggedIn && (
                      <div className="mb-3">
                        <SidebarLoginForm redirectPath={`/reports/${report.slug}`} />
                      </div>
                    )}

                    {(report.product?.saleOverBanner || report.product?.saleBanner) && (
                      <div className="mb-3">
                        <img
                          src={
                            report.product.saleEndDate && new Date(report.product.saleEndDate) < new Date()
                              ? (report.product.saleOverBanner || report.product.saleBanner)
                              : (report.product.saleBanner || report.product.saleOverBanner)
                          }
                          alt={`${report.product.name} promotion`}
                          className="img-fluid w-100 rounded-3 d-block"
                        />
                      </div>
                    )}

                    {report.product ? (
                      <div className="text-white rounded-3 p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                        {report.product.featuredImage && (
                          <img src={report.product.featuredImage} alt={report.product.name} className="img-fluid w-100 rounded-2 mb-3" style={{ maxHeight: 120, objectFit: 'cover' }} />
                        )}
                        <div className="text-uppercase fw-bold text-info mb-2" style={{ fontSize: 11, letterSpacing: 1 }}>
                          {isLoggedIn ? 'Upgrade to access' : 'Required subscription'}
                        </div>
                        <div className="fw-bold fs-5 mb-2">{report.product.name}</div>

                        {report.product.shortDescription && (
                          <div className="small text-white-50 mb-3">
                            {report.product.shortDescription}
                          </div>
                        )}

                        {report.product.features?.length > 0 && (
                          <ul className="list-unstyled d-flex flex-column gap-1 mb-3">
                            {report.product.features.slice(0, 4).map((f: string, i: number) => (
                              <li key={i} className="small text-white-50 d-flex gap-2 align-items-start">
                                <span className="text-success flex-shrink-0">✓</span> {f}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="d-flex align-items-baseline gap-2 mb-3">
                          {report.product.salePrice != null && report.product.salePrice < report.product.regularPrice ? (
                            <>
                              <span className="fw-bold fs-4 text-success">A${report.product.salePrice.toFixed(2)}</span>
                              <span className="text-white-50 text-decoration-line-through">A${report.product.regularPrice.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="fw-bold fs-4 text-info">A${(report.product.regularPrice || 0).toFixed(2)}</span>
                          )}
                          <span className="small text-white-50">/ {report.product.durationValue} {report.product.durationType}</span>
                        </div>

                        {report.product.riskRating && (
                          <div className="d-flex align-items-center gap-2 small mb-3">
                            <span className="text-white-50">Risk:</span>
                            <span className={`badge rounded-pill ${report.product.riskRating === 'Low' ? 'text-bg-success' : report.product.riskRating === 'Medium' ? 'text-bg-warning' : 'text-bg-danger'}`}>
                              {report.product.riskRating}
                            </span>
                          </div>
                        )}

                        <Link href={`/subscribe/${report.product.slug}`} className="btn btn-primary w-100 fw-bold">
                          Subscribe Now →
                        </Link>
                      </div>
                    ) : (
                      <div className="text-white rounded-3 p-4" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f4c81)' }}>
                        <div className="fw-semibold text-info mb-2">
                          {isLoggedIn ? 'Upgrade to access' : 'Subscribe to read'}
                        </div>
                        <div className="small text-white-50 mb-3">
                          Get access to all research reports with any PristineGaze subscription.
                        </div>
                        <Link href="/subscribe" className="btn btn-primary w-100 fw-bold">
                          View Plans →
                        </Link>
                      </div>
                    )}
                  </>
                )}

                <SaleSidebarWidget memberOnly={true} />
                <ReportSidebar
                  latestItems={sidebarLatest}
                  latestLabel="Latest Reports"
                  sectors={sidebarSectors}
                  categories={sidebarCategories}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
