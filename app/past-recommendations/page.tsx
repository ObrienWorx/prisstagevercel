import SiteLayout from '@/components/SiteLayout';
import PastRecommendationsTabs from '@/components/PastRecommendationsTabs';
import { cookies } from 'next/headers';
import { verifySubscriberToken } from '@/lib/subscriberJwt';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Past Recommendations - PristineGaze',
  description: 'Browse PristineGaze past recommendations and current market trends.',
};

export default async function PastRecommendationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('subscriber_token')?.value;
  const isLoggedIn = !!(token && verifySubscriberToken(token));

  return (
    <SiteLayout>
      <div className="video-page-hero text-white">
        <div className="container text-center">
          <h1 className="video-page-title">
            Explore our Past Stock Recommendations
          </h1>
          <p className="video-page-lead mx-auto">A Look Back at Our Best Picks – Helping You Make Smarter Decisions</p>
        </div>
      </div>
      <div className="site-section pg-rec-page">
        <div className="container">
          <PastRecommendationsTabs isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </SiteLayout>
  );
}
