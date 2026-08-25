'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import LeadCaptureForm from './LeadCaptureForm';
import ReportSidebar from './ReportSidebar';
import SaleSidebarWidget from './SaleSidebarWidget';

interface LoadMore {
  endpoint: string;
  query: Record<string, string>;
  total: number;
  perPage: number;
}

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
  sector?: string;
  ticker?: string;
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
  icon?: string;
}

interface Pagination {
  page: number;
  totalPages: number;
  basePath: string;
  query: string;
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
  loadMore?: LoadMore;
  pagination?: Pagination;
  leadSource?: string;
}

function pageWindow(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

function Pagination({ page, totalPages, basePath, query }: Pagination) {
  if (totalPages <= 1) return null;
  const href = (p: number) => `${basePath}?${query ? query + '&' : ''}page=${p}`;
  const nums = pageWindow(page, totalPages);
  return (
    <nav className="cl-pagination" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 28, flexWrap: 'wrap' }} aria-label="Pagination">
      {page > 1 && <Link href={href(page - 1)} className="btn btn-sm btn-outline-secondary">« Prev</Link>}
      {nums.map((p, i, arr) => (
        <span key={p} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {i > 0 && p - arr[i - 1] > 1 && <span style={{ color: '#94a3b8' }}>…</span>}
          <Link href={href(p)} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`} aria-current={p === page ? 'page' : undefined}>{p}</Link>
        </span>
      ))}
      {page < totalPages && <Link href={href(page + 1)} className="btn btn-sm btn-outline-secondary">Next »</Link>}
    </nav>
  );
}

function useLoadMore(initial: Item[], loadMore?: LoadMore) {
  const [extra, setExtra] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const key = loadMore ? `${loadMore.endpoint}?${new URLSearchParams(loadMore.query)}` : '';
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setExtra([]);
    setPage(1);
  }

  const displayItems = useMemo(() => [...initial, ...extra], [initial, extra]);
  const hasMore = !!loadMore && displayItems.length < loadMore.total;

  const onLoadMore = async () => {
    if (!loadMore || loading) return;
    setLoading(true);
    try {
      const next = page + 1;
      const qs = new URLSearchParams({ ...loadMore.query, page: String(next), limit: String(loadMore.perPage) });
      const res = await fetch(`${loadMore.endpoint}?${qs.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.items)) {
        setExtra((prev) => [...prev, ...data.data.items]);
        setPage(next);
      }
    } finally {
      setLoading(false);
    }
  };

  const button = hasMore ? (
    <div style={{ textAlign: 'center', marginTop: 28 }}>
      <button type="button" className="btn btn-outline-primary px-4" onClick={onLoadMore} disabled={loading}>
        {loading ? 'Loading…' : 'Load more'}
      </button>
    </div>
  ) : null;

  return { displayItems, button };
}

const REC_BADGE: Record<string, string> = {
  BUY: 'text-bg-success', HOLD: 'text-bg-warning', SELL: 'text-bg-danger',
  'SPECULATIVE BUY': 'text-bg-primary', REFRAIN: 'text-bg-secondary',
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
  return (
    <div className="card h-100 shadow-sm">
      <div className="ratio ratio-16x9 bg-light position-relative">
        {item.featuredImage ? (
          <img src={item.featuredImage} alt={item.title} className="w-100 h-100 object-fit-cover" />
        ) : (
          <div className="d-flex align-items-center justify-content-center text-muted fs-1">📄</div>
        )}
        {item.recommendation && (
          <span className={`badge position-absolute top-0 start-0 m-2 ${REC_BADGE[item.recommendation] || 'text-bg-secondary'}`}>
            {item.recommendation}
          </span>
        )}
      </div>
      <div className="card-body d-flex flex-column">
        {(item.sector || item.ticker) && (
          <div className="d-flex flex-wrap gap-1 mb-2">
            {item.sector && <span className="badge bg-primary-subtle text-primary-emphasis fw-semibold">{item.sector}</span>}
            {item.ticker && <span className="badge bg-success-subtle text-success-emphasis fw-bold font-monospace">{item.ticker}</span>}
          </div>
        )}
        <h3 className="h6 fw-bold mb-2">{item.title}</h3>
        <div className="d-flex align-items-center justify-content-between mt-auto">
          <span className="small text-muted">{item.date}</span>
          <Link href={item.href} className="btn btn-primary btn-sm fw-bold">
            {item.cta || 'Read More →'}
          </Link>
        </div>
      </div>
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

function BlogCategoryListing({ title, items, categories, emptyMessage, footer, leadSource = 'unlock-ticker' }: Pick<Props, 'title' | 'items' | 'categories' | 'emptyMessage' | 'leadSource'> & { footer?: React.ReactNode }) {
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
              {footer}
            </div>
            <div className="blog-list-aside">
              <SaleSidebarWidget />
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
              source={leadSource}
              badge=""
              title="Please fill the details to Unlock the Exclusive ASX Stock Report"
              buttonText="Unlock the Ticker"
              successText="You will receive the detailed Stock Report on your submitted email."
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function ContentListing({ title, items, latestItems, latestLabel, sidebarType, categories, sectors, emptyMessage, loadMore, pagination, leadSource }: Props) {
  const { displayItems, button } = useLoadMore(items, loadMore);
  const footer = pagination ? <Pagination {...pagination} /> : button;

  if (sidebarType === 'blog') {
    return <BlogCategoryListing title={title} items={displayItems} categories={categories} emptyMessage={emptyMessage} footer={footer} leadSource={leadSource} />;
  }

  return (
    <>
      <div className="cl-hero">
        <div className="cl-hero-overlay" />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="cl-hero-title">{title}</h1>
        </div>
      </div>

      <div className="cl-body">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-8">
              {displayItems.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                  <p style={{ color: '#64748b', fontSize: 15 }}>{emptyMessage || 'No content published yet. Check back soon.'}</p>
                </div>
              ) : (
                <div className="row row-cols-1 row-cols-sm-2 g-4">
                  {displayItems.map(item => (
                    <div key={item._id} className="col">
                      <ItemCard item={item} />
                    </div>
                  ))}
                </div>
              )}
              {footer}
            </div>

            <div className="col-lg-4">
              <SaleSidebarWidget memberOnly={true} />
              <ReportSidebar latestItems={latestItems} latestLabel={latestLabel} sectors={sectors} categories={categories} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
