'use client';

import FrontNav from './FrontNav';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SOCIAL_LINKS } from '@/lib/socialLinks';

interface StaticPageLink { _id: string; title: string; slug: string; footerColumn: string; }
type SlugLink = { title: string; slug: string };
type DirectLink = { title: string; href: string };
type FooterLink = SlugLink | DirectLink;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [footerPages, setFooterPages] = useState<StaticPageLink[]>([]);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    fetch('/api/public/static-pages')
      .then(r => r.json())
      .then(d => { if (d.success) setFooterPages(d.data); })
      .catch(() => { });

    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const policyPages = footerPages.filter(p => p.footerColumn === 'policies');
  const quickPages = footerPages.filter(p => p.footerColumn === 'quick-links');

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const staticPolicyLinks: SlugLink[] = [
    { title: 'Privacy Policy', slug: 'privacy-policy' },
    { title: 'Terms Of Use', slug: 'terms-of-use' },
    { title: 'Financial Service Guide', slug: 'financial-service-guide' },
    { title: 'Cancellation & Refund Policy', slug: 'cancellation-refund-policy' },
    { title: 'Terms and Conditions of Free Trial Use', slug: 'terms-free-trial' },
    { title: 'Disclaimer', slug: 'disclaimer' },
    { title: 'Account Deletion Request', slug: 'account-deletion-request' },
    ...policyPages,
  ];

  const staticQuickLinks: FooterLink[] = [
    { title: 'About Us', slug: 'about-us' },
    { title: 'Past Recommendations', slug: 'past-recommendations' },
    { title: 'Subscriptions', href: '/subscribe' },
    { title: 'Videos', href: '/videos' },
    { title: 'Terminology', slug: 'terminology' },
    { title: 'Free Trial', slug: 'free-trial' },
    { title: 'Contact Us', href: '/contact-us' },
    ...quickPages,
  ];

  return (
    <div className="site-body">
      <FrontNav />
      <main>{children}</main>

      {/* ── FOOTER ─────────────────────────── */}
      <footer className="site-footer">

        {/* Top columns */}
        <div className="footer-top">
          <div className="container">
            <div className="row g-5">

              {/* Brand */}
              <div className="col-lg-3 col-md-6">
                <div className="footer-logo">
                  <div className="footer-logo-text">
                    <div className="name"><img src="/logo.png" alt="" className="w-100" /></div>
                  </div>
                </div>
                <p className="footer-tagline">
                  Your trusted partner in navigating the complexities of investment markets. Unbiased Research, Expert Analysis, and Clear Coverage for Financial Freedom. Start Your Journey Today!
                </p>
              </div>

              {/* Quick Links */}
              <div className="col-lg-3 col-md-6">
                <div className="footer-col-title">Quick Links</div>
                <ul className="footer-links">
                  {staticQuickLinks.map((l, i) => (
                    <li key={i}>
                      <Link href={'href' in l ? l.href : `/${l.slug}`}>{l.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Policies */}
              <div className="col-lg-3 col-md-6">
                <div className="footer-col-title">Policies</div>
                <ul className="footer-links">
                  {staticPolicyLinks.map((l, i) => (
                    <li key={i}>
                      <Link href={`/${l.slug}`}>{l.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reach Us */}
              <div className="col-lg-3 col-md-6">
                <div className="footer-col-title">Reach Us</div>

                <div className="footer-contact-item">
                  <div className="footer-contact-icon">📞</div>
                  <div><a href="tel:0489990844">0489 990 844</a></div>
                </div>

                <div className="footer-contact-item">
                  <div className="footer-contact-icon">✉️</div>
                  <div><a href="mailto:info@pristinegaze.com.au">info@pristinegaze.com.au</a></div>
                </div>

                <div className="footer-contact-item">
                  <div className="footer-contact-icon">📍</div>
                  <div>
                    <strong className="footer-contact-label">Headquarters:</strong>
                    Ground Floor/470 St Kilda Rd, Melbourne VIC 3004
                  </div>
                </div>

                <div className="footer-contact-item">
                  <div className="footer-contact-icon">📍</div>
                  <div>
                    <strong className="footer-contact-label">Registered Office:</strong>
                    6 Hunt Club Rd Narre Warren South VIC 3805
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="footer-disclaimer">
          <div className="container">
            <p>
              <strong>Disclaimer:</strong> Pristine Gaze Pty Ltd trading as Pristine Gaze (ABN 66 680 815 678) and (ACN 680 815 678) is a Corporate Authorised Representative (CAR No. 001312049) of Alpha Securities Pty Ltd (AFSL 330757). The information provided is general information only. Any advice is general advice only. No consideration has been given or will be given to individual objectives, financial situation, or specific needs of any particular person or organisation. The decision to engage our services and the method selected is a personal decision and involves inherent risks, and you must undertake your own investigations and obtain independent advice regarding suitability for your circumstances. Past performance, examples, or projections are not indicative of future results. While we strive to provide accurate information, we make no guarantees regarding the accuracy or completeness of our materials. The website may also contain links to third-party websites or resources, for which Pristine Gaze is not responsible. All content and intellectual property on the Pristine Gaze website, including but not limited to text, graphics, logos, and images, are the property of Pristine Gaze and are protected by applicable copyright and trademark laws. By accessing or using the Pristine Gaze website, you acknowledge and agree to the terms of this disclaimer. Please read our{' '}
              <Link href="/terms-of-use">Terms and Conditions, Privacy Policy</Link>{' '}and{' '}
              <Link href="/financial-service-guide">Financial Service Guide</Link>{' '}for further information.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div className="container">
            <div className="footer-bottom-inner">
              <div className="footer-copyright">
                © 2026, <strong>Pristine Gaze Pty. Ltd.</strong> All Rights Reserved
              </div>
              <div className="footer-social">
                {SOCIAL_LINKS.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="social-btn"
                    aria-label={s.label}
                    title={s.label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor"
                         dangerouslySetInnerHTML={{ __html: s.svg }} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showTop && (
        <button className="back-to-top" onClick={scrollTop} aria-label="Back to top">↑</button>
      )}
    </div>
  );
}
