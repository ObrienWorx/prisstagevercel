import connectDB from '@/lib/mongoose';
import Video from '@/models/Video';
import SiteLayout from '@/components/SiteLayout';
import { getYouTubeId } from '@/lib/orderHelpers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Videos – PristineGaze', description: 'Watch our latest market analysis videos.' };

export default async function VideosPage() {
  await connectDB();
  const videos = await Video.find({ isActive: true }).sort({ createdAt: -1 }).lean() as any[];

  return (
    <SiteLayout>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: '#fff', padding: '4rem 0 3rem' }}>
        <div className="container text-center">
          <div className="section-label" style={{ color: '#93c5fd' }}>Video Library</div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.5px', margin: '0.5rem 0 1rem' }}>
            Market Insights &amp; Analysis
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', maxWidth: 480, margin: '0 auto' }}>
            Watch our expert analysts break down market trends, sector performance, and investment opportunities.
          </p>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="site-section">
        <div className="container">
          {videos.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: 56, marginBottom: '1rem' }}>🎥</div>
              <h3 style={{ color: '#64748b', fontWeight: 600 }}>No videos yet.</h3>
              <p style={{ color: '#94a3b8' }}>Check back soon for market analysis videos.</p>
            </div>
          ) : (
            <div className="row g-4">
              {videos.map((v: any) => {
                const vid = getYouTubeId(v.youtubeUrl);
                return (
                  <div className="col-md-6 col-lg-4" key={v._id.toString()}>
                    <a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <div className="video-card">
                        <div style={{ position: 'relative' }}>
                          {vid ? (
                            <img
                              src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
                              alt={v.title}
                              className="video-thumb"
                            />
                          ) : (
                            <div className="video-thumb" style={{ background: '#1e3a5f', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                              ▶️
                            </div>
                          )}
                          <div className="video-play-overlay">
                            <div className="play-btn">▶</div>
                          </div>
                        </div>
                        <div className="video-card-body">
                          <div className="video-card-title">{v.title}</div>
                          {v.description && (
                            <div className="video-card-desc">{v.description}</div>
                          )}
                        </div>
                      </div>
                    </a>
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
