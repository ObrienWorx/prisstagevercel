import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongoose';
import LearnAndEarn from '@/models/LearnAndEarn';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { verifyToken } from '@/lib/jwt';
import LeModuleView from '@/components/LeModuleView';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ ch?: string }> };

export async function generateMetadata({ params, searchParams }: P) {
  const { slug } = await params;
  const { ch } = await searchParams;
  await connectDB();
  const mod = await LearnAndEarn.findOne({ slug, publishStatus: 'published' }).lean() as any;
  if (!mod) return { title: 'Not Found – PristineGaze' };
  const chIndex = Math.max(0, parseInt(ch || '1', 10) - 1);
  const chapter = mod.chapters?.[chIndex];
  return {
    title: chapter ? `${chapter.title} – ${mod.title} – PristineGaze` : `${mod.title} – PristineGaze`,
  };
}

export default async function LearnChapterPage({ params, searchParams }: P) {
  const { slug } = await params;
  const { ch } = await searchParams;
  await connectDB();

  const mod = await LearnAndEarn.findOne({ slug, publishStatus: 'published' }).lean() as any;
  if (!mod || !mod.chapters?.length) notFound();

  const chIndex = Math.min(
    Math.max(0, parseInt(ch || '1', 10) - 1),
    mod.chapters.length - 1
  );
  const chapter = mod.chapters[chIndex];

  const cookieStore = await cookies();
  const subscriberToken = cookieStore.get('subscriber_token')?.value;
  const adminToken = cookieStore.get('token')?.value;
  const isLoggedIn = !!(
    (subscriberToken && verifySubscriberToken(subscriberToken)) ||
    (adminToken && verifyToken(adminToken))
  );

  const chapters = mod.chapters.map((c: any) => ({
    title: c.title,
    content: c.content ?? '',
    quizQuestions: c.quizQuestions ?? [],
  }));

  return (
    <SiteLayout>
      {/* Hero */}
      <div className="video-page-hero text-white">
        <div className="container text-center">
          <div className="mb-2" style={{ fontSize: 13 }}>
            <Link href="/learn-and-earn" style={{ color: '#93c5fd', textDecoration: 'none' }}>Learn &amp; Earn</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 8px' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>{mod.title}</span>
          </div>
          <h1 className="video-page-title">{chapter.title}</h1>
          <p style={{ color: '#93c5fd', fontSize: 13, margin: 0 }}>
            Chapter {chIndex + 1} of {mod.chapters.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#e2e8f0' }}>
        <div style={{ height: 4, background: '#0049AC', width: `${((chIndex + 1) / mod.chapters.length) * 100}%`, transition: 'width 0.4s' }} />
      </div>

      <div className="site-section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-12">
              <LeModuleView
                chapters={chapters}
                currentIndex={chIndex}
                slug={slug}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
