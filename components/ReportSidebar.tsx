import Link from 'next/link';

export interface NavLink {
  name: string;
  slug: string;
  href: string;
}

export interface LatestItem {
  _id: string;
  title: string;
  featuredImage?: string;
  href: string;
}

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

export default function ReportSidebar({ latestItems, latestLabel, sectors, categories }: {
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
                    // eslint-disable-next-line @next/next/no-img-element
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
