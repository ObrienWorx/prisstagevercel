import HomePicks from '@/components/HomePicks';
import HeroSlider from '@/components/HeroSlider';
import WhatsAppCta from '@/components/WhatsAppCta';
import ReviewCarousel from '@/components/ReviewCarousel';
import HomeFaq from '@/components/HomeFaq';
import TickerTape from '@/components/TickerTape';
import MarketScan from '@/components/MarketScan';
import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import Video from '@/models/Video';
import HomepageSetting from '@/models/HomepageSetting';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';
import Report from '@/models/Report';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { getYouTubeId } from '@/lib/orderHelpers';
import { fmtDateShort } from '@/lib/dates';
import { notFutureDated } from '@/lib/reportVisibility';
import type { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

type MongoId = { toString(): string };

interface HomeProduct {
  _id: MongoId;
  name: string;
  slug: string;
  regularPrice?: number;
  salePrice?: number | null;
  durationType?: string;
  durationValue?: number;
  featuredImage?: string;
  features?: string[];
}

interface HomeVideo {
  _id: MongoId;
  title: string;
  youtubeUrl: string;
  description?: string;
}

interface HomeBlog {
  _id: MongoId;
  title: string;
  slug: string;
  featuredImage?: string;
  createdAt?: Date;
  publishedAt?: Date | null;
  categorySlug: string;
}

interface HomepagePublicSettings {
  heroImage?: string;
  heroSlides?: { image: string; title: string; link: string }[];
  videoSectionTitle?: string;
  videoSectionDescription?: string;
  videoSectionButtonText?: string;
  videoSectionButtonHref?: string;
  videoSectionYoutubeUrl?: string;
}

export default async function HomePage() {
  await connectDB();

  const products = await Product.find({ status: 'published', isActive: true, showOnFrontend: { $ne: false } })
    .select('name slug regularPrice salePrice durationType durationValue featuredImage features shortDescription')
    .sort({ sortOrder: 1, regularPrice: 1 })
    .limit(6)
    .lean() as HomeProduct[];

  const videos = await Video.find({ isActive: true })
    .select('title youtubeUrl description')
    .sort({ createdAt: -1 })
    .limit(3)
    .lean() as HomeVideo[];

  const homepageSettings = await HomepageSetting.findOne({ key: 'homepage' })
    .select('heroImage heroSlides videoSectionTitle videoSectionDescription videoSectionButtonText videoSectionButtonHref videoSectionYoutubeUrl')
    .lean() as HomepagePublicSettings | null;

  const blogCategories = await BlogCategory.find({
    slug: { $in: ['trending-stock-market-news', 'editorials', 'sector-stories'] },
    status: 'active',
  }).select('_id slug').lean() as { _id: Types.ObjectId; slug: string }[];

  const blogCategoryBySlug = new Map(blogCategories.map(category => [category.slug, category._id]));

  async function getBlogsForCategory(slug: string, limit: number) {
    const categoryId = blogCategoryBySlug.get(slug);
    if (!categoryId) return [];
    const posts = await Blog.find({
      publishStatus: 'published',
      $or: [{ category: categoryId }, { categories: categoryId }],
    })
      .select('title slug featuredImage createdAt publishedAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as Omit<HomeBlog, 'categorySlug'>[];
    return posts.map(post => ({ ...post, categorySlug: slug }));
  }

  const [trendingPosts, dailyAnalysisPosts, sectorStoriesPosts] = await Promise.all([
    getBlogsForCategory('trending-stock-market-news', 5),
    getBlogsForCategory('editorials', 8),
    getBlogsForCategory('sector-stories', 6),
  ]);

  type HomeRecBuy = {
    _id: MongoId;
    title: string;
    ticker: string;
    upsellTicker: string;
    price: number;
    createdAt?: Date;
    publishedAt?: Date | null;
  };
  type HomeRecPopulated = {
    _id: MongoId;
    title: string;
    ticker: string;
    upsellTicker: string;
    price: number;
    pastStockRecommendations: HomeRecBuy[];
  };

  const pastRecReports = await Report.find({
    publishStatus: 'published',
    ...notFutureDated(),
    recommendation: 'SELL',
    pastStockRecommendations: { $exists: true, $ne: [] },
  })
    .select('title ticker upsellTicker price pastStockRecommendations')
    .populate('pastStockRecommendations', 'title ticker upsellTicker price createdAt publishedAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean() as unknown as HomeRecPopulated[];

  const homeRecs = pastRecReports
    .flatMap((sell) => (sell.pastStockRecommendations || []).map((buy) => {
      if (!buy || !buy.price) return null;
      const gainLoss = buy.price > 0 ? ((sell.price - buy.price) / buy.price) * 100 : null;
      const buyDate = buy.publishedAt ?? buy.createdAt ?? null;
      return { code: `${buy.title}`, avgBuy: buy.price, avgSell: sell.price, gainLoss, buyDate };
    }))
    .filter((r): r is { code: string; avgBuy: number; avgSell: number; gainLoss: number | null; buyDate: Date | null } => r !== null)
    // Most recent buy first.
    .sort((a, b) => (b.buyDate ? new Date(b.buyDate).getTime() : 0) - (a.buyDate ? new Date(a.buyDate).getTime() : 0))
    .slice(0, 7);

  const fmtPrice = (p: HomeProduct) => {
    const price = p.salePrice ?? p.regularPrice ?? 0;
    return `$${price.toFixed(2)}`;
  };

  const fmtDuration = (p: HomeProduct) => {
    if (!p.durationValue) return '';
    return `${p.durationValue} ${p.durationType}`;
  };

  const videoSectionTitle = homepageSettings?.videoSectionTitle || 'Watch. Learn. Invest Smarter.';
  const videoSectionDescription = homepageSettings?.videoSectionDescription || 'Don’t miss out on the latest market updates and expert tips! Watch our videos for in-depth ASX stock analysis, daily trends, and strategies to grow your portfolio. Stay informed, stay ahead—click play and take the first step towards smarter investing today!';
  const videoSectionButtonText = homepageSettings?.videoSectionButtonText || 'Show All Videos';
  const videoSectionButtonHref = homepageSettings?.videoSectionButtonHref || '/videos';
  const videoSectionYoutubeId = getYouTubeId(homepageSettings?.videoSectionYoutubeUrl || '');

  // Prefer the multi-slide hero; fall back to the legacy single image.
  const heroSlides = (homepageSettings?.heroSlides?.length
    ? homepageSettings.heroSlides
    : homepageSettings?.heroImage
      ? [{ image: homepageSettings.heroImage, title: '', link: '' }]
      : []
  ).filter((s) => s.image);

  return (
    <SiteLayout>
      <section className="homepage-hero">
        <div className="container position-relative">
          <div className="row align-items-start justify-content-center g-5">
            <div className="col-lg-5">
              <h1 className="homepage-hero-title">Invest with <br/>Insights.</h1>
              <p className="homepage-hero-lead">Navigate the ASX stock market with confidence.</p>
              <ul className="homepage-hero-list">
                <li>General Buy, Hold &amp; Sell insights on ASX-listed companies</li>
                <li>Technology-powered stock research with expert analyst review</li>
                <li>Discover stocks on the move &amp; emerging market trends</li>
                <li>Trusted by investors seeking clarity in the Australian stock market</li>
                <li>Designed for investors who value research over speculation</li>
              </ul>
              <div className="homepage-hero-actions">
                <Link href="/subscribe/7-day-free-trial" className="homepage-hero-btn">Start your free Trial</Link>
                <Link href="/reports" className="homepage-hero-btn">Get Sample Report</Link>
              </div>
              <div className="homepage-hero-trust">
                <div><span className="homepage-hero-check">✓</span> 7-Days Free Trial, no credit card required</div>
                <div><span className="homepage-hero-check">✓</span> Trusted by 10K+ Investors</div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="homepage-hero-media">
                {heroSlides.length > 0 ? (
                  <HeroSlider slides={heroSlides} />
                ) : (
                  <div className="homepage-hero-media-empty" aria-label="Homepage hero image placeholder" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <TickerTape />

      <section className="home-market-section">
        <div className="container">
          <div className="row g-4 align-items-stretch">
            <div className="col-lg-8 d-flex flex-column">
              <div className="home-section-head">
                <h2>Trending Market News</h2>
                <Link href="/trending-stock-market-news" className="home-view-link">View All ↗</Link>
              </div>
              <div className="home-title-rule" />
              {trendingPosts.length > 0 ? (
                <div className="home-news-grid">
                  {trendingPosts.map((post, index) => (
                    <Link
                      key={post._id.toString()}
                      href={`/${post.categorySlug}/${post.slug}`}
                      className={`home-news-card ${index >= 3 ? 'wide' : ''}`}
                    >
                      {post.featuredImage && <img src={post.featuredImage} alt={post.title} />}
                      <div className="home-news-shade" />
                      <div className="home-news-content">
                        <span className="home-news-badge">Market</span>
                        <h3>{post.title}</h3>
                        {post.createdAt && <div className="home-news-date">□ {fmtDateShort(post.publishedAt ?? post.createdAt)}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="home-empty-panel">No trending market news published yet.</div>
              )}
            </div>

            <div className="col-lg-4">
              <div className="home-section-head">
                <h2>Current Opportunities from our experts</h2>
              </div>
              <div className="home-title-rule" />
              <HomePicks />
            </div>
          </div>
        </div>
      </section>

      <section className="home-market-section home-market-section-tight">
        <div className="container">
          <div className="home-section-head">
            <h2>Daily Analysis</h2>
            <Link href="/editorials" className="home-view-link">View All ↗</Link>
          </div>
          <div className="home-title-rule" />
          {dailyAnalysisPosts.length > 0 ? (
            <>
              <div className="home-analysis-featured">
                {dailyAnalysisPosts.slice(0, 3).map(post => (
                  <Link key={post._id.toString()} href={`/${post.categorySlug}/${post.slug}`} className="home-news-card">
                    {post.featuredImage && <img src={post.featuredImage} alt={post.title} />}
                    <div className="home-news-shade" />
                    <div className="home-news-content">
                      <span className="home-news-badge">ASX</span>
                      <h3>{post.title}</h3>
                      {post.createdAt && <div className="home-news-date">□ {fmtDateShort(post.publishedAt ?? post.createdAt)}</div>}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="home-analysis-strip">
                {dailyAnalysisPosts.slice(3, 8).map(post => (
                  <Link key={post._id.toString()} href={`/${post.categorySlug}/${post.slug}`} className="home-analysis-small">
                    <div className="home-analysis-small-img">
                      {post.featuredImage && <img src={post.featuredImage} alt={post.title} />}
                    </div>
                    <div className="home-analysis-small-body">
                      <span className="home-news-badge">Market</span>
                      <h3>{post.title}</h3>
                      {post.createdAt && <div className="home-news-date">□ {fmtDateShort(post.publishedAt ?? post.createdAt)}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="home-empty-panel">No daily analysis posts published yet.</div>
          )}
        </div>
      </section>

      <div className="stats-bar">
        <div className="container">
          <div className="row g-3 text-center">
            {[
              { num: '500+', lbl: 'Research Reports' },
              { num: '12+', lbl: 'Top Research Analyst' },
              { num: 'Daily', lbl: 'Market Updates' },
              { num: '100%', lbl: 'Australian Focus' },
            ].map(s => (
              <div className="col-6 col-md-3" key={s.lbl}>
                <div className="stat-item">
                  <div className="num">{s.num}</div>
                  <div className="lbl">{s.lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {products.length > 0 && (
        <section className="home-plans-section">
          <div className="container">
            <div className="row g-4 align-items-stretch justify-content-center">
              <div className="col-lg-8">
                <div className="home-plans-copy">
                  <h2>Pristine Gaze Subscription Plans</h2>
                  <p>
                    We bring clarity and depth to the complexities of the Australian Securities Exchange. Our services are designed to empower investors with comprehensive insights, detailed financial analysis, and expert recommendations on ASX-listed companies.
                  </p>
                </div>

                <div className="home-plans-grid">
                  {products.slice(0, 6).map((p, i) => (
                    <Link href={`/subscribe/${p.slug}`} className="home-plan-mini" key={p._id.toString()}>
                      <div className="home-plan-mini-img">
                        {p.featuredImage
                          ? <img src={p.featuredImage} alt={p.name} />
                          : <div className="home-plan-mini-placeholder" />}
                      </div>
                      <div className="home-plan-mini-body">
                        <h3>{p.name}</h3>
                        <div className="home-plan-mini-meta">
                          <span>{i === 0 ? 'Featured Package' : fmtDuration(p) || 'Market Research'}</span>
                        </div>
                        <div className="home-plan-mini-foot">
                          <span>#{i === 0 ? 'ASX' : i === 1 ? 'Tech' : i === 2 ? 'Macro' : 'Market'}</span>
                          <strong>{p.salePrice != null || p.regularPrice ? fmtPrice(p) : 'Open'}</strong>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <Link href="/subscribe" className="home-plans-more">Explore More</Link>
              </div>

              <div className="col-lg-4">
                <div className="home-plans-media">
                  <img src="/Untitled.png" alt="Pristine Gaze research workspace" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}


      <section className="home-scan-recs-section">
        <div className="container">
          <div className="row g-0 home-scan-recs-row">
            <div className="col-lg-7 home-scan-col">
              <MarketScan />
            </div>
            <div className="col-lg-5 home-recs-col">
              <div className="home-past-recs-card">
                <div className="home-past-recs-header">
                  <div>
                    <h2 className="home-past-recs-title">Past Recommendations</h2>
                  </div>
                  <Link href="/past-recommendations" className="home-past-recs-viewall">View All ↗</Link>
                </div>
                <div className="home-past-recs-rule" />
                {homeRecs.length > 0 ? (
                  <>
                    <div className="home-past-recs-table-wrap">
                      <table className="home-past-recs-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Avg Buy</th>
                            <th>Avg Sell</th>
                            <th>Gain/loss</th>
                          </tr>
                        </thead>
                        <tbody>
                          {homeRecs.map((rec, i) => (
                            <tr key={i}>
                              <td>{rec.code}</td>
                              <td>${rec.avgBuy.toLocaleString('en-AU', { maximumFractionDigits: 3 })}</td>
                              <td>${rec.avgSell.toLocaleString('en-AU', { maximumFractionDigits: 3 })}</td>
                              <td className={rec.gainLoss !== null && rec.gainLoss < 0 ? 'loss' : 'gain'}>
                                {rec.gainLoss !== null ? `${rec.gainLoss.toFixed(2)}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="home-past-recs-disclaimer">
                      <em>Disclaimer: Not every company performs as expected. Past performance is not an indication of future returns. &ldquo;Gain/Loss&rdquo; reflects movement in difference in average buy price and sell price plus dividends as a percentage of average buy price, and does not take into account costs or taxation.</em>
                    </p>
                  </>
                ) : (
                  <p className="home-past-recs-disclaimer" style={{ marginTop: '12px' }}>
                    No closed recommendations yet. Check back soon.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-sector-stories">
        <div className="container">
          <div className="row g-4 align-items-stretch">
            <div className="col-lg-8">
              <div className="home-section-head home-section-head-large">
                <h2>Sector Stories</h2>
                <Link href="/sector-stories" className="home-view-link">View All ↗</Link>
              </div>
              <div className="home-title-rule" />
              {sectorStoriesPosts.length > 0 ? (
                <div className="home-sector-grid">
                  {sectorStoriesPosts.map(post => (
                    <Link key={post._id.toString()} href={`/${post.categorySlug}/${post.slug}`} className="home-sector-card">
                      <div className="home-sector-img">
                        {post.featuredImage && <img src={post.featuredImage} alt={post.title} />}
                      </div>
                      <div className="home-sector-body">
                        <span className="home-sector-badge">Market</span>
                        <h3>{post.title}</h3>
                        {post.createdAt && <div className="home-sector-date">□ {fmtDateShort(post.publishedAt ?? post.createdAt)}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="home-empty-panel">No sector stories published yet.</div>
              )}
            </div>

            <div className="col-lg-4 d-flex flex-column">
              <div className="home-section-head home-newsletter-heading">
                <h2>What Our Members Say</h2>
              </div>
              <div className="home-title-rule" />
              <ReviewCarousel />
            </div>
          </div>
        </div>
      </section>

      <section className="home-tools">
        <div className="container">
          <div className="home-tools-head">
            <span className="home-tools-eyebrow">— Investor Tools</span>
            <h2>Tools That Give You an Extra Edge</h2>
            <p>Practical tools to keep tabs on your holdings, spot opportunities early, and act with confidence — and they come with every plan.</p>
          </div>
          <div className="home-tools-grid">
            <div className="home-tool-card">
              <div className="home-tool-icon">📊</div>
              <div className="home-tool-body">
                <h3>Portfolio Tracker</h3>
                <p>Keep every ASX holding in one dashboard. Follow performance, dividends, and live gains or losses, with smart alerts the moment something shifts.</p>
                <Link href="/user/portfolio" className="home-tool-link">Discover the Portfolio Tracker →</Link>
              </div>
            </div>
            <div className="home-tool-card">
              <div className="home-tool-icon">📈</div>
              <div className="home-tool-body">
                <h3>Smart Watch List</h3>
                <p>Create a watchlist tailored to you, with price alerts, analyst triggers, and news signals that keep you a step ahead of the market.</p>
                <Link href="/user/watchlist" className="home-tool-link">Discover the Smart Watch List →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeFaq />

      <section className="home-video-promo">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="home-video-copy">
                <h2>{videoSectionTitle}</h2>
                <p>{videoSectionDescription}</p>
                <Link href={videoSectionButtonHref} className="home-video-btn">{videoSectionButtonText}</Link>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="home-video-frame">
                {videoSectionYoutubeId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoSectionYoutubeId}`}
                    title={videoSectionTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="home-video-placeholder">
                    <div className="home-video-play">▶</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {process.env.NEXT_PUBLIC_SHOW_WHATSAPP_CTA === 'true' && <WhatsAppCta />}
    </SiteLayout>
  );
}
