import connectDB from '@/lib/mongoose';
import Report from '@/models/Report';
import '@/models/Sector';
import '@/models/Product';
import '@/models/ReportCategory';
import UserProduct from '@/models/UserProduct';
import SiteLayout from '@/components/SiteLayout';
import SidebarLoginForm from '@/components/SidebarLoginForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySubscriberToken } from '@/lib/subscriberJwt';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P) {
  const { slug } = await params;
  await connectDB();
  const r = await Report.findOne({ slug, publishStatus: 'published' }).lean() as any;
  if (!r) return { title: 'Report Not Found – PristineGaze' };
  return { title: `${r.title} – PristineGaze`, description: r.metaDescription || r.title };
}

export default async function ReportDetailPage({ params }: P) {
  const { slug } = await params;
  await connectDB();

  const report = await Report.findOne({ slug, publishStatus: 'published' })
    .populate('sector', 'name slug')
    .populate('product', 'name slug regularPrice salePrice shortDescription features featuredImage saleBanner riskRating durationValue durationType plans')
    .populate('category', 'name slug')
    .lean() as any;

  if (!report) notFound();

  let hasAccess = false;
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
      if (report.product) {
        // Require subscription to this specific product
        query.product = report.product._id;
      }
      const up = await UserProduct.findOne(query).lean();
      hasAccess = !!up;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const excerpt = report.content ? report.content.replace(/<[^>]+>/g, '').slice(0, 400) : '';

  return (
    <SiteLayout>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: '#fff', padding: '4rem 0 3rem' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {report.sector && (
              <Link href={`/sectors/${report.sector.slug}`} style={{ fontSize: 12, color: '#93c5fd', textDecoration: 'none', fontWeight: 600 }}>
                ← {report.sector.name}
              </Link>
            )}
            {report.category && (
              <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.2)', color: '#93c5fd', padding: '2px 10px', borderRadius: 5, fontWeight: 600 }}>
                {report.category.name}
              </span>
            )}
          </div>

          {report.upsellTicker && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 100, marginBottom: 16, letterSpacing: '0.5px' }}>
              📈 {report.upsellTicker}
            </div>
          )}

          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 1rem', lineHeight: 1.2 }}>
            {report.title}
          </h1>

          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>Published {fmtDate(report.createdAt)}</span>
            {report.product && (
              <span style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', padding: '2px 10px', borderRadius: 5, fontWeight: 500, fontSize: 12 }}>
                {report.product.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="site-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              {report.featuredImage && hasAccess && (
                <img src={report.featuredImage} alt={report.title} style={{ width: '100%', borderRadius: 14, marginBottom: '2rem', maxHeight: 400, objectFit: 'cover' }} />
              )}

              {hasAccess ? (
                <div className="tiptap-prose" style={{ fontSize: 16, lineHeight: 1.85, color: '#1e293b' }} dangerouslySetInnerHTML={{ __html: report.content }} />
              ) : (
                <div>
                  {/* Blurred preview — only show if there's text content */}
                  {excerpt && (
                    <div style={{ position: 'relative', marginBottom: '2rem', overflow: 'hidden', maxHeight: 180 }}>
                      <div style={{ filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none', fontSize: 15, lineHeight: 1.8, color: '#374151' }}>
                        {excerpt}
                      </div>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, #f1f5f9 80%)' }} />
                    </div>
                  )}

                  {/* Gate card */}
                  <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 20, padding: '2.5rem', color: '#fff', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                    <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
                      {isLoggedIn ? 'Subscription required' : 'Subscribers only'}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, maxWidth: 420, margin: '0 auto 2rem', lineHeight: 1.6 }}>
                      {isLoggedIn
                        ? report.product
                          ? `You need an active ${report.product.name} subscription to read this report.`
                          : 'You need an active subscription to read this report.'
                        : 'Sign in with your subscriber account or subscribe to access this research report.'}
                    </p>

                    {report.product && (
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'inline-block' }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Required subscription</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{report.product.name}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#93c5fd', marginTop: 4 }}>
                          A${((report.product.salePrice ?? report.product.regularPrice) || 0).toFixed(2)}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Link
                        href={report.product ? `/subscribe/${report.product.slug}` : '/subscribe'}
                        style={{ background: '#3b82f6', color: '#fff', padding: '0.75rem 2rem', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
                      >
                        {isLoggedIn ? 'Subscribe Now →' : 'View Plans →'}
                      </Link>
                      {!isLoggedIn && (
                        <Link
                          href={`/auth/login`}
                          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem 2rem', borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                          Sign In
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="col-lg-4 d-none d-lg-block">
              <div style={{ position: 'sticky', top: 80 }}>
                {report.sector && (
                  <div style={{ background: '#f8fafc', borderRadius: 14, padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: 8 }}>Sector</div>
                    <Link href={`/sectors/${report.sector.slug}`} style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {report.sector.name} <span style={{ color: '#3b82f6' }}>→</span>
                    </Link>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>View all reports in this sector</div>
                  </div>
                )}

                {!hasAccess && (
                  <>
                    {/* Login form — only shown when not logged in */}
                    {!isLoggedIn && (
                      <div style={{ marginBottom: 16 }}>
                        <SidebarLoginForm redirectPath={`/reports/${report.slug}`} />
                      </div>
                    )}

                    {/* Sale banner image */}
                    {report.product?.saleBanner && (
                      <div style={{ marginBottom: 16 }}>
                        <img
                          src={report.product.saleBanner}
                          alt={`${report.product.name} promotion`}
                          style={{ width: '100%', borderRadius: 12, display: 'block' }}
                        />
                      </div>
                    )}

                    {/* Product sales banner */}
                    {report.product ? (
                      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderRadius: 14, padding: '1.5rem', color: '#fff', border: '1px solid rgba(59,130,246,0.2)' }}>
                        {report.product.featuredImage && (
                          <img
                            src={report.product.featuredImage}
                            alt={report.product.name}
                            style={{ width: '100%', borderRadius: 9, marginBottom: 12, maxHeight: 120, objectFit: 'cover' }}
                          />
                        )}
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#93c5fd', marginBottom: 6 }}>
                          {isLoggedIn ? 'Upgrade to access' : 'Required subscription'}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{report.product.name}</div>

                        {report.product.shortDescription && (
                          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginBottom: 12, lineHeight: 1.5 }}>
                            {report.product.shortDescription}
                          </div>
                        )}

                        {report.product.features?.length > 0 && (
                          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {report.product.features.slice(0, 4).map((f: string, i: number) => (
                              <li key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span> {f}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
                          {report.product.salePrice != null && report.product.salePrice < report.product.regularPrice ? (
                            <>
                              <span style={{ fontSize: 24, fontWeight: 800, color: '#4ade80' }}>
                                A${report.product.salePrice.toFixed(2)}
                              </span>
                              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>
                                A${report.product.regularPrice.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: 24, fontWeight: 800, color: '#93c5fd' }}>
                              A${(report.product.regularPrice || 0).toFixed(2)}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            / {report.product.durationValue} {report.product.durationType}
                          </span>
                        </div>

                        {report.product.riskRating && (
                          <div style={{ fontSize: 11, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Risk:</span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 100, fontWeight: 700,
                              background: report.product.riskRating === 'Low' ? 'rgba(74,222,128,0.15)' : report.product.riskRating === 'Medium' ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)',
                              color: report.product.riskRating === 'Low' ? '#4ade80' : report.product.riskRating === 'Medium' ? '#fbbf24' : '#f87171',
                            }}>
                              {report.product.riskRating}
                            </span>
                          </div>
                        )}

                        <Link
                          href={`/subscribe/${report.product.slug}`}
                          style={{ display: 'block', background: '#3b82f6', color: '#fff', padding: '0.7rem', borderRadius: 9, fontWeight: 700, textAlign: 'center', textDecoration: 'none', fontSize: 14 }}
                        >
                          Subscribe Now →
                        </Link>
                      </div>
                    ) : (
                      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f4c81)', borderRadius: 14, padding: '1.5rem', color: '#fff' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', marginBottom: 8 }}>
                          {isLoggedIn ? 'Upgrade to access' : 'Subscribe to read'}
                        </div>
                        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
                          Get access to all research reports with any PristineGaze subscription.
                        </div>
                        <Link href="/subscribe" style={{ display: 'block', background: '#3b82f6', color: '#fff', padding: '0.65rem', borderRadius: 9, fontWeight: 700, textAlign: 'center', textDecoration: 'none', fontSize: 14 }}>
                          View Plans →
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
