import Link from 'next/link';

export interface NavLink {
  name: string;
  slug: string;
  href: string;
  icon?: string;
}

export interface LatestItem {
  _id: string;
  title: string;
  featuredImage?: string;
  href: string;
}

const SectorIcon = () => (
  <svg aria-hidden="true" className="e-font-icon-svg e-fas-chart-line" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <path d="M496 384H64V80c0-8.84-7.16-16-16-16H16C7.16 64 0 71.16 0 80v336c0 17.67 14.33 32 32 32h464c8.84 0 16-7.16 16-16v-32c0-8.84-7.16-16-16-16zM464 96H345.94c-21.38 0-32.09 25.85-16.97 40.97l32.4 32.4L288 242.75l-73.37-73.37c-12.5-12.5-32.76-12.5-45.25 0l-68.69 68.69c-6.25 6.25-6.25 16.38 0 22.63l22.62 22.62c6.25 6.25 16.38 6.25 22.63 0L192 237.25l73.37 73.37c12.5 12.5 32.76 12.5 45.25 0l96-96 32.4 32.4c15.12 15.12 40.97 4.41 40.97-16.97V112c.01-8.84-7.15-16-15.99-16z" />
  </svg>
);

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
                <span className="cl-sidebar-nav-icon">
                  {s.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={s.icon} alt="" />
                    : <SectorIcon />}
                </span>
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
                <span className="cl-sidebar-nav-icon">
                  {c.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.icon} alt="" />
                    : <SectorIcon />}
                </span>
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
