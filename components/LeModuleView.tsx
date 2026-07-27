'use client';

import { useState } from 'react';
import Link from 'next/link';
import BlogQuiz from '@/components/BlogQuiz';
import AuthModal from '@/components/AuthModal';

type Chapter = { title: string; content: string; quizQuestions?: any[] };
type Props = {
  chapters: Chapter[];
  currentIndex: number;
  slug: string;
  isLoggedIn: boolean;
};

export default function LeModuleView({ chapters, currentIndex, slug, isLoggedIn }: Props) {
  const chapter = chapters[currentIndex];
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const isLocked = currentIndex > 0 && !isLoggedIn;

  const [showModal, setShowModal] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'register' | 'login'>('register');

  const openModal = (tab: 'register' | 'login' = 'register') => {
    setDefaultTab(tab);
    setShowModal(true);
  };

  return (
    <>
      {/* Chapter pills */}
      <div className="le-chapter-list mb-4">
        {chapters.map((c, i) => {
          const locked = i > 0 && !isLoggedIn;
          if (locked) {
            return (
              <button key={i} className="le-chapter-pill locked" onClick={() => openModal('register')}>
                <span className="le-ch-num">{i + 1}</span>
                <span className="le-ch-name">{c.title}</span>
              </button>
            );
          }
          return (
            <Link key={i} href={`/learn-and-earn/${slug}?ch=${i + 1}`} className={`le-chapter-pill${i === currentIndex ? ' active' : ''}`}>
              <span className="le-ch-num">{i + 1}</span>
              <span className="le-ch-name">{c.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      {isLocked ? (
        <div className="le-gate">
          <h3 className="le-gate-title">Continue Learning</h3>
          <p className="le-gate-desc">
            You&apos;ve completed the free chapter. Create a free account or sign in to access all {chapters.length} chapters.
          </p>
          <button className="btn btn-primary btn-lg px-5" onClick={() => openModal('register')}>
            Register Free to Continue
          </button>
          <div className="mt-3">
            <button className="btn btn-link" style={{ color: '#0049AC', fontSize: 14 }} onClick={() => openModal('login')}>
              Already have an account? Sign in →
            </button>
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
          <Link href={`/learn-and-earn/${slug}?ch=${currentIndex}`} className="le-nav-card le-nav-prev">
            <span className="le-nav-label">← Previous</span>
            <span className="le-nav-title">{prevChapter.title}</span>
          </Link>
        ) : <div />}

        {nextChapter && (
          isLoggedIn ? (
            <Link href={`/learn-and-earn/${slug}?ch=${currentIndex + 2}`} className="le-nav-card le-nav-next">
              <span className="le-nav-label">Next Chapter →</span>
              <span className="le-nav-title">{nextChapter.title}</span>
            </Link>
          ) : (
            <button className="le-nav-card le-nav-next le-nav-locked" onClick={() => openModal('register')}>
              <span className="le-nav-label">Next Chapter →</span>
              <span className="le-nav-title">{nextChapter.title}</span>
              <span className="le-nav-gate-hint">Sign up free to unlock</span>
            </button>
          )
        )}
      </div>

      <AuthModal
        show={showModal}
        onClose={() => setShowModal(false)}
        defaultTab={defaultTab}
        redirectPath={`/learn-and-earn/${slug}?ch=${currentIndex + 1}`}
      />
    </>
  );
}
