import connectDB from '@/lib/mongoose';
import Product from '@/models/Product';
import Video from '@/models/Video';
import HomepageSetting from '@/models/HomepageSetting';
import Blog from '@/models/Blog';
import BlogCategory from '@/models/BlogCategory';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { getYouTubeId } from '@/lib/orderHelpers';
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
  categorySlug: string;
}

interface HomepagePublicSettings {
  heroImage?: string;
  videoSectionTitle?: string;
  videoSectionDescription?: string;
  videoSectionButtonText?: string;
  videoSectionButtonHref?: string;
  videoSectionYoutubeUrl?: string;
}

function formatPostDate(date?: Date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export default async function HomePage() {
  await connectDB();

  const products = await Product.find({ status: 'published', isActive: true })
    .select('name slug regularPrice salePrice durationType durationValue featuredImage features shortDescription')
    .sort({ regularPrice: 1 })
    .limit(6)
    .lean() as HomeProduct[];

  const videos = await Video.find({ isActive: true })
    .select('title youtubeUrl description')
    .sort({ createdAt: -1 })
    .limit(3)
    .lean() as HomeVideo[];

  const homepageSettings = await HomepageSetting.findOne({ key: 'homepage' })
    .select('heroImage videoSectionTitle videoSectionDescription videoSectionButtonText videoSectionButtonHref videoSectionYoutubeUrl')
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
      .select('title slug featuredImage createdAt')
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

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="homepage-hero">
        <div className="container position-relative">
          <div className="row align-items-start g-5">
            <div className="col-lg-6">
              <h1 className="homepage-hero-title">Invest with Insights.</h1>
              <p className="homepage-hero-lead">Navigate the ASX stock market with confidence.</p>
              <ul className="homepage-hero-list">
                <li>General Buy, Hold &amp; Sell insights on ASX-listed companies</li>
                <li>Technology-powered stock research with expert analyst review</li>
                <li>Discover stocks on the move &amp; emerging market trends</li>
                <li>Trusted by investors seeking clarity in the Australian stock market</li>
                <li>Designed for investors who value research over speculation</li>
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
                {homepageSettings?.heroImage ? (
                  <img src={homepageSettings.heroImage} alt="Investment insights" />
                ) : (
                  <div className="homepage-hero-media-empty" aria-label="Homepage hero image placeholder" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARKET NEWS */}
      <section className="home-market-section">
        <div className="container">
          <div className="row g-4 align-items-start">
            <div className="col-lg-8">
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
                        {post.createdAt && <div className="home-news-date">□ {formatPostDate(post.createdAt)}</div>}
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
                <h2>Recent Picks from our Experts</h2>
                <button className="home-view-link" type="button">View All ↗</button>
              </div>
              <div className="home-title-rule" />
              <div className="home-picks-panel">
                {[1, 2, 3, 4].map((item) => (
                  <div className="home-pick-card" key={item}>
                    <div className="home-pick-top">
                      <span>Unlock Ticker</span>
                      <small>High</small>
                    </div>
                    <div className="home-pick-value">6.00%</div>
                    <div className="home-pick-label">Potential Left</div>
                    <div className="home-pick-cap">Small-Cap</div>
                    <div className="home-pick-bottom">Entry Price: locked</div>
                  </div>
                ))}
                <p className="home-picks-note">Performance visuals shown as a preview. Data source can be connected later.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DAILY ANALYSIS */}
      <section className="home-market-section home-market-section-tight">
        <div className="container">
          <div className="home-section-head">
            <h2>Daily Analysis</h2>
            <Link href="/daily-analysis" className="home-view-link">View All ↗</Link>
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
                      {post.createdAt && <div className="home-news-date">□ {formatPostDate(post.createdAt)}</div>}
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
                      {post.createdAt && <div className="home-news-date">□ {formatPostDate(post.createdAt)}</div>}
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

      {/* STATS */}
      <div className="stats-bar">
        <div className="container">
          <div className="row g-3 text-center">
            {[
              { num: '500+', lbl: 'Research Reports' },
              { num: '12+', lbl: 'Market Sectors' },
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

      {/* PLANS PREVIEW */}
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
                  <img src="/a02674da6018f68b1022c8f9a0d09a7e.png" alt="Pristine Gaze research workspace" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}


            {/* SECTOR STORIES */}
      <section className="home-sector-stories">
        <div className="container">
          <div className="row g-4 align-items-start">
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
                        {post.createdAt && <div className="home-sector-date">□ {formatPostDate(post.createdAt)}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="home-empty-panel">No sector stories published yet.</div>
              )}
            </div>

            <div className="col-lg-4">
              <div className="home-section-head home-newsletter-heading">
                <h2>Subscribe to our News Letter</h2>
              </div>
              <div className="home-title-rule" />
              <div className="home-newsletter-card">
                <h3>Daily Newsletter</h3>
                <p className="home-newsletter-sub">Get all the top stories from Blogs to keep track.</p>
                <form className="home-newsletter-form" action="#" method="post">
                  <label className="visually-hidden" htmlFor="home-newsletter-email">Email address</label>
                  <input id="home-newsletter-email" type="email" name="email" placeholder="Enter your email" />
                  <button type="submit">Subscribe</button>
                  <label className="home-newsletter-consent">
                    <input type="checkbox" name="terms" />
                    <span>I agree to the <Link href="/terms-of-use">terms and conditions</Link></span>
                  </label>
                </form>
                <p className="home-newsletter-copy">
                  By providing your details, you agree to receive marketing offers by email. Before you access our services, please read the <Link href="/financial-service-guide">Financial Service Guide</Link> available here.
                </p>
                <div className="home-newsletter-footer">We respect your privacy. Unsubscribe at any time.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO PROMO */}
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
    </SiteLayout>
  );
}
