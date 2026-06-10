'use client';

import { useState } from 'react';
import Link from 'next/link';
import LeadCaptureForm from './LeadCaptureForm';

interface Item {
  _id: string;
  title: string;
  slug: string;
  featuredImage?: string;
  date?: string;
  excerpt?: string;
  tags?: string[] | string;
  authorName?: string;
  href: string;
  cta?: string;
  recommendation?: string;
}

interface LatestItem {
  _id: string;
  title: string;
  featuredImage?: string;
  href: string;
}

interface NavLink {
  name: string;
  slug: string;
  href: string;
}

interface Props {
  title: string;
  items: Item[];
  latestItems: LatestItem[];
  latestLabel?: string;
  sidebarType: 'blog' | 'report';
  categories?: NavLink[];
  sectors?: NavLink[];
  emptyMessage?: string;
}

const RECOM_COLORS: Record<string, string> = {
  'BUY': '#16a34a',
  'HOLD': '#d97706',
  'SELL': '#dc2626',
  'SPECULATIVE BUY': '#0049AC',
  'REFRAIN': '#64748b',
  'Security Under Review': '#9333ea',
};

const SECTOR_ICONS: Record<string, string> = {
  Technology: '🖥',
  Healthcare: '🏥',
  'Health Care': '🏥',
  'Financial Services': '🏦',
  Energy: '⚡',
  Discretionary: '🛒',
  'Consumer Discretionary': '🛒',
  'USA Equity Report': '🇺🇸',
};

function formatBlogTags(tags?: string[] | string) {
  const rawTags = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',')
      : [];

  return rawTags
    .map(tag => tag.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function ItemCard({ item }: { item: Item }) {
  const ribbonColor = item.recommendation ? RECOM_COLORS[item.recommendation] : null;
  return (
    <div className="cl-card">
      <Link href={item.href} className="cl-card-inner">
        <div className="cl-card-img-wrap">
          {item.featuredImage
            ? <img src={item.featuredImage} alt={item.title} className="cl-card-img" />
            : <div className="cl-card-img cl-card-placeholder" />}
          {ribbonColor && (
            <div className="cl-ribbon" style={{ background: ribbonColor }}>
              {item.recommendation}
            </div>
          )}
        </div>
        <div className="cl-card-body">
          <h3 className="cl-card-title">{item.title}</h3>
          {item.date && <div className="cl-card-date">{item.date}</div>}
          <span className="cl-card-cta">{item.cta || 'Read More »'}</span>
        </div>
      </Link>
    </div>
  );
}

function BlogShareButton({ item }: { item: Item }) {
  const share = async () => {
    const url = new URL(item.href, window.location.origin).toString();

    if (navigator.share) {
      await navigator.share({ title: item.title, url }).catch(() => { });
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url).catch(() => { });
    }
  };

  return (
    <button type="button" className="blog-list-share" onClick={share} aria-label={`Share ${item.title}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.3 10.8 7.2-4.1M8.3 13.2l7.2 4.1" />
      </svg>
      <span>Share</span>
    </button>
  );
}

function BlogCategorySidebar({ categories }: Pick<Props, 'categories'>) {
  if (!categories || categories.length === 0) return null;

  return (
    <aside className="blog-category-sidebar" aria-labelledby="blog-category-sidebar-title">
      <h2 id="blog-category-sidebar-title">Browse Articles by Category</h2>
      <ul>
        {categories.map(category => (
          <li key={category.slug}>
            <Link href={category.href}>{category.name}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function BlogReportPromo({ onClaim }: { onClaim: () => void }) {
  return (
    <aside className="blog-report-promo" aria-labelledby="blog-report-promo-title">
      <h2 id="blog-report-promo-title">Some ASX Opportunities Are Still Flying Under the Radar.</h2>
      <p className="blog-report-promo-lead">
        Download our Complimentary Research Report featuring 5 ASX-listed companies poised to grow this year.
      </p>
      <div className="blog-report-promo-subtitle">What&apos;s in the Complimentary Report?</div>
      <ul>
        <li>5 high-potential ASX stocks selected by our experts</li>
        <li>Technical and fundamental analysis explained in a simple format</li>
        <li>General research opinions and market outlook on each company</li>
        <li>Key business highlights, sector trends, and growth drivers</li>
        <li>Insights designed to help investors make more informed decisions</li>
      </ul>
      <button type="button" className="blog-report-promo-btn" onClick={onClaim}>
        Claim your Free Copy
      </button>
    </aside>
  );
}

function BlogCategoryListing({ title, items, categories, emptyMessage }: Pick<Props, 'title' | 'items' | 'categories' | 'emptyMessage'>) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="blog-list-page">
        <div className="container blog-list-shell">
          <div className="blog-list-layout">
            <div className="blog-list-main">
              <h1 className="blog-list-heading">{title}</h1>
              {items.length === 0 ? (
                <div className="blog-list-empty">{emptyMessage || 'No articles published yet. Check back soon.'}</div>
              ) : (
                <div className="blog-list">
                  {items.map(item => (
                    <article className="blog-list-row" key={item._id}>
                      <Link href={item.href} className="blog-list-image" aria-label={item.title}>
                        {item.featuredImage
                          ? <img src={item.featuredImage} alt="" />
                          : <span className="blog-list-placeholder" />}
                      </Link>
                      <div className="blog-list-copy">
                        {formatBlogTags(item.tags).length > 0 && (
                          <div className="blog-list-tags">{formatBlogTags(item.tags).join(' | ')}</div>
                        )}
                        <Link href={item.href} className="blog-list-title">{item.title}</Link>
                        {(item.date || item.authorName) && (
                          <div className="blog-list-meta">
                            {item.date}
                            {item.date && item.authorName && <span aria-hidden="true"> | </span>}
                            {item.authorName && <span>{item.authorName}</span>}
                          </div>
                        )}
                        {item.excerpt && <p>{item.excerpt}</p>}
                        <Link href={item.href} className="blog-list-more">Read more <span aria-hidden="true">&raquo;</span></Link>
                      </div>
                      <BlogShareButton item={item} />
                    </article>
                  ))}
                </div>
              )}
            </div>
            <div className="blog-list-aside">
              <BlogReportPromo onClaim={() => setShowModal(true)} />
              <BlogCategorySidebar categories={categories} />
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(10,15,30,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', top: -12, right: -12, zIndex: 1,
                background: '#fff', border: 'none', borderRadius: '50%',
                width: 32, height: 32, cursor: 'pointer',
                fontSize: 18, lineHeight: '32px', textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
              aria-label="Close"
            >×</button>
            <LeadCaptureForm
              source="unlock-ticker"
              badge=""
              title="Please fill the details to Unlock the Exclusive ASX Stock Report"
              buttonText="Unlock the Ticker"
              successText="You will receive the detailed Stock Report on your submitted email."
              onSuccess={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

function ReportSidebar({ latestItems, latestLabel, sectors, categories }: {
  latestItems: LatestItem[];
  latestLabel?: string;
  sectors?: NavLink[];
  categories?: NavLink[];
}) {
  return (
    <div className="cl-sidebar">
      {sectors && sectors.length > 0 && (
        <div className="cl-sidebar-widget">
          <h5 className="cl-sidebar-heading">Sector Wise Reports</h5>
          <div className="cl-sidebar-nav-list">
            {sectors.map(s => (
              <Link key={s.slug} href={s.href} className="cl-sidebar-nav-item">
                <span className="cl-sidebar-nav-icon">{SECTOR_ICONS[s.name] || '📊'}</span>
                <span>{s.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {categories && categories.length > 0 && (
        <div className="cl-sidebar-widget">
          <h5 className="cl-sidebar-heading">Stock Advisory</h5>
          <div className="cl-sidebar-nav-list">
            {categories.map(c => (
              <Link key={c.slug} href={c.href} className="cl-sidebar-nav-item">
                <span className="cl-sidebar-nav-icon">📋</span>
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {latestItems.length > 0 && (
        <div className="cl-sidebar-widget">
          <h5 className="cl-sidebar-heading">{latestLabel || 'Latest Reports'}</h5>
          <div className="cl-sidebar-list">
            {latestItems.map(item => (
              <Link key={item._id} href={item.href} className="cl-sidebar-item">
                <div className="cl-sidebar-thumb">
                  {item.featuredImage
                    ? <img src={item.featuredImage} alt={item.title} />
                    : <div className="cl-sidebar-placeholder" />}
                </div>
                <span className="cl-sidebar-title">{item.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentListing({ title, items, latestItems, latestLabel, sidebarType, categories, sectors, emptyMessage }: Props) {
  if (sidebarType === 'blog') {
    return <BlogCategoryListing title={title} items={items} categories={categories} emptyMessage={emptyMessage} />;
  }

  return (
    <>
      {/* Hero */}
      <div className="cl-hero">
        <div className="cl-hero-overlay" />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="cl-hero-title">{title}</h1>
        </div>
      </div>

      {/* Body */}
      <div className="cl-body">
        <div className="container">
          <div className="row g-4">
            {/* Grid */}
            <div className="col-lg-8">
              {items.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                  <p style={{ color: '#64748b', fontSize: 15 }}>{emptyMessage || 'No content published yet. Check back soon.'}</p>
                </div>
              ) : (
                <div className="cl-grid">
                  {items.map(item => (
                    <div key={item._id} className="cl-grid-col">
                      <ItemCard item={item} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="col-lg-4">
              <ReportSidebar latestItems={latestItems} latestLabel={latestLabel} sectors={sectors} categories={categories} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
