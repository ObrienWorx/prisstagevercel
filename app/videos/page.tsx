import connectDB from '@/lib/mongoose';
import Video from '@/models/Video';
import SiteLayout from '@/components/SiteLayout';
import { getYouTubeId } from '@/lib/orderHelpers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Videos – PristineGaze', description: 'Watch our latest market analysis videos.' };

type VideoItem = {
  _id: { toString(): string };
  title: string;
  youtubeUrl: string;
};

export default async function VideosPage() {
  await connectDB();
  const videos = await Video.find({ isActive: true }).sort({ createdAt: -1 }).lean() as unknown as VideoItem[];

  return (
    <SiteLayout>
      <div className="video-page-hero text-white">
        <div className="container text-center">
          <h1 className="video-page-title">
            Videos
          </h1>
        </div>
      </div>

      <div className="site-section">
        <div className="container">
          {videos.length === 0 ? (
            <div className="text-center py-5">
              <div className="video-empty-icon">🎥</div>
              <h3 className="video-empty-title">No videos yet.</h3>
              <p className="video-empty-text">Check back soon for market analysis videos.</p>
            </div>
          ) : (
            <div className="row g-4">
              {videos.map((v) => {
                const vid = getYouTubeId(v.youtubeUrl);
                return (
                  <div className="col-md-6 col-lg-4" key={v._id.toString()}>
                    <a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                      <div className="video-card">
                        <div className="position-relative">
                          {vid ? (
                            <img
                              src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
                              alt={v.title}
                              className="video-thumb"
                            />
                          ) : (
                            <div className="video-thumb video-thumb-placeholder">
                              ▶️
                            </div>
                          )}
                          <div className="video-play-overlay">
                            <div className="play-btn">▶</div>
                          </div>
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
