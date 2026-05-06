'use client';

import Link from 'next/link';
import LeadCaptureForm from './LeadCaptureForm';

interface Item {
  _id: string;
  title: string;
  slug: string;
  featuredImage?: string;
  date?: string;
  excerpt?: string;
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

function BlogSidebar({ latestItems, latestLabel }: {
  latestItems: LatestItem[];
  latestLabel?: string;
  categories?: NavLink[];
}) {
  return (
    <div className="cl-sidebar">
      {/* Lead capture form */}
      <LeadCaptureForm source="blog-sidebar" />

      {/* Latest articles */}
      {latestItems.length > 0 && (
        <div className="cl-sidebar-widget">
          <h5 className="cl-sidebar-heading">{latestLabel || 'Latest Articles'}</h5>
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

export default function ContentListing({ title, items, latestItems, latestLabel, sidebarType, categories, sectors }: Props) {
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
                  <p style={{ color: '#64748b', fontSize: 15 }}>No content published yet. Check back soon.</p>
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
              {sidebarType === 'blog'
                ? <BlogSidebar latestItems={latestItems} latestLabel={latestLabel} categories={categories} />
                : <ReportSidebar latestItems={latestItems} latestLabel={latestLabel} sectors={sectors} categories={categories} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
