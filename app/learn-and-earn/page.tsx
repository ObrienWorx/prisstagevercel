import connectDB from '@/lib/mongoose';
import LearnAndEarn from '@/models/LearnAndEarn';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Learn & Earn – PristineGaze',
  description: 'Build your investing knowledge. The more you understand, the more confidently you invest.',
};

const ICONS = ['📈', '📊', '🛡️', '💡', '🏦', '📉', '🔍', '💰'];

export default async function LearnAndEarnPage() {
  await connectDB();
  const modules = await LearnAndEarn.find({ publishStatus: 'published' })
    .select('title slug description chapters')
    .sort({ createdAt: -1 })
    .lean() as any[];

  return (
    <SiteLayout>
      <div className="video-page-hero text-white">
        <div className="container text-center">
          <h1 className="video-page-title">Learn &amp; Earn</h1>
          <p style={{ color: '#93c5fd', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto' }}>
            Build your investing knowledge. The more you understand, the more confidently you invest in ASX markets.
          </p>
        </div>
      </div>

      <div className="site-section" style={{ background: '#fff' }}>
        <div className="container">
          {modules.length === 0 && (
            <p className="text-muted">No modules published yet. Check back soon.</p>
          )}

          <div className="row g-4">
            {modules.map((mod: any, idx: number) => {
              const href = `/learn-and-earn/${mod.slug}`;
              return (
                <div key={mod._id} className="col-md-6 col-lg-4">
                  <div className="le-card">
                    {mod.featuredImage ? (
                      <img src={mod.featuredImage} alt={mod.title} className="le-card-img" />
                    ) : (
                      <div className="le-card-icon">{ICONS[idx % ICONS.length]}</div>
                    )}
                    <h3 className="le-card-title">{mod.title}</h3>
                    {mod.description && <p className="le-card-desc">{mod.description}</p>}
                    <Link href={href} className="le-card-link">Start learning →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
