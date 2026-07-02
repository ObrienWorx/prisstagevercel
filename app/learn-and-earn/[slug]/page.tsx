import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongoose';
import LearnAndEarn from '@/models/LearnAndEarn';
import SiteLayout from '@/components/SiteLayout';
import Link from 'next/link';
import { verifySubscriberToken } from '@/lib/subscriberJwt';
import { verifyToken } from '@/lib/jwt';
import BlogQuiz from '@/components/BlogQuiz';

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

  const prevChapter = chIndex > 0 ? mod.chapters[chIndex - 1] : null;
  const nextChapter = chIndex < mod.chapters.length - 1 ? mod.chapters[chIndex + 1] : null;

  /* ── Auth check: subscriber OR admin both count as logged in ── */
  const cookieStore = await cookies();
  const subscriberToken = cookieStore.get('subscriber_token')?.value;
  const adminToken = cookieStore.get('token')?.value;
  const isLoggedIn = !!(
    (subscriberToken && verifySubscriberToken(subscriberToken)) ||
    (adminToken && verifyToken(adminToken))
  );

  const isLocked = chIndex > 0 && !isLoggedIn;

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
            <div className="col-lg-8">

              {/* Chapter pills */}
              <div className="le-chapter-list mb-4">
                {mod.chapters.map((c: any, i: number) => {
                  const locked = i > 0 && !isLoggedIn;
                  if (locked) {
                    return (
                      <span key={i} className="le-chapter-pill locked">
                        <span className="le-ch-num">{i + 1}</span>
                        <span className="le-ch-name">{c.title}</span>
                        <span className="le-ch-lock">🔒</span>
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={i}
                      href={`/learn-and-earn/${slug}?ch=${i + 1}`}
                      className={`le-chapter-pill${i === chIndex ? ' active' : ''}`}
                    >
                      <span className="le-ch-num">{i + 1}</span>
                      <span className="le-ch-name">{c.title}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Content */}
              {isLocked ? (
                <div className="le-gate">
                  <div className="le-gate-icon">🔒</div>
                  <h3 className="le-gate-title">Members Only</h3>
                  <p className="le-gate-desc">
                    You&apos;ve completed the free chapter. Log in to continue learning and access all {mod.chapters.length} chapters.
                  </p>
                  <Link href="/member-account" className="btn btn-primary btn-lg px-5">Log in to Continue</Link>
                  <div className="mt-3">
                    <Link href="/subscribe" style={{ color: '#0049AC', fontSize: 14 }}>Don&apos;t have a subscription? Subscribe →</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="tiptap-prose le-content" dangerouslySetInnerHTML={{ __html: chapter.content }} />
                  {Array.isArray(chapter.quizQuestions) && chapter.quizQuestions.length > 0 && (
                    <BlogQuiz questions={chapter.quizQuestions} />
                  )}
                </>
              )}

              {/* Prev / Next nav */}
              <div className="le-chapter-nav mt-5">
                {prevChapter ? (
                  <Link href={`/learn-and-earn/${slug}?ch=${chIndex}`} className="le-nav-card le-nav-prev">
                    <span className="le-nav-label">← Previous</span>
                    <span className="le-nav-title">{prevChapter.title}</span>
                  </Link>
                ) : <div />}

                {nextChapter && (
                  isLoggedIn ? (
                    <Link href={`/learn-and-earn/${slug}?ch=${chIndex + 2}`} className="le-nav-card le-nav-next">
                      <span className="le-nav-label">Next Chapter →</span>
                      <span className="le-nav-title">{nextChapter.title}</span>
                    </Link>
                  ) : (
                    <Link href="/member-account" className="le-nav-card le-nav-next le-nav-locked">
                      <span className="le-nav-label">🔒 Next Chapter</span>
                      <span className="le-nav-title">{nextChapter.title}</span>
                      <span className="le-nav-gate-hint">Login to unlock</span>
                    </Link>
                  )
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
