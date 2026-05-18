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
                    <div className="name"><img src="/logo2.png" alt="" className="w-100" /></div>
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
                  <div className="footer-contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.05 6C15.0268 6.19057 15.9244 6.66826 16.6281 7.37194C17.3318 8.07561 17.8095 8.97326 18 9.95M14.05 2C16.0793 2.22544 17.9716 3.13417 19.4163 4.57701C20.8609 6.01984 21.7721 7.91101 22 9.94M18.5 21C9.93959 21 3 14.0604 3 5.5C3 5.11378 3.01413 4.73086 3.04189 4.35173C3.07375 3.91662 3.08968 3.69907 3.2037 3.50103C3.29814 3.33701 3.4655 3.18146 3.63598 3.09925C3.84181 3 4.08188 3 4.56201 3H7.37932C7.78308 3 7.98496 3 8.15802 3.06645C8.31089 3.12515 8.44701 3.22049 8.55442 3.3441C8.67601 3.48403 8.745 3.67376 8.88299 4.05321L10.0491 7.26005C10.2096 7.70153 10.2899 7.92227 10.2763 8.1317C10.2643 8.31637 10.2012 8.49408 10.0942 8.64506C9.97286 8.81628 9.77145 8.93713 9.36863 9.17882L8 10C9.2019 12.6489 11.3501 14.7999 14 16L14.8212 14.6314C15.0629 14.2285 15.1837 14.0271 15.3549 13.9058C15.5059 13.7988 15.6836 13.7357 15.8683 13.7237C16.0777 13.7101 16.2985 13.7904 16.74 13.9509L19.9468 15.117C20.3262 15.255 20.516 15.324 20.6559 15.4456C20.7795 15.553 20.8749 15.6891 20.9335 15.842C21 16.015 21 16.2169 21 16.6207V19.438C21 19.9181 21 20.1582 20.9007 20.364C20.8185 20.5345 20.663 20.7019 20.499 20.7963C20.3009 20.9103 20.0834 20.9262 19.6483 20.9581C19.2691 20.9859 18.8862 21 18.5 21Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg></div>
                  <div><a href="tel:0489990844">0489 990 844</a></div>
                </div>

                <div className="footer-contact-item">
                  <div className="footer-contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.0799 3 8.2V15.8C3 16.9201 3 17.4802 3.21799 17.908C3.40973 18.2843 3.71569 18.5903 4.09202 18.782C4.51984 19 5.0799 19 6.2 19H17.8C18.9201 19 19.4802 19 19.908 18.782C20.2843 18.5903 20.5903 18.2843 20.782 17.908C21 17.4802 21 16.9201 21 15.8V13M3 8L8.45036 11.6336C9.73296 12.4886 10.3743 12.9162 11.0674 13.0824C11.6804 13.2293 12.3196 13.2293 12.9326 13.0824C13.6257 12.9162 14.267 12.4886 15.5496 11.6336M22 6.5C22 7.88071 20.8807 9 19.5 9C18.1193 9 17 7.88071 17 6.5C17 5.11929 18.1193 4 19.5 4C20.8807 4 22 5.11929 22 6.5Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg></div>
                  <div><a href="mailto:info@pristinegaze.com.au">info@pristinegaze.com.au</a></div>
                </div>

                <div className="footer-contact-item">
                  <div className="footer-contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21C15.5 17.4 19 14.1764 19 10.2C19 6.22355 15.866 3 12 3C8.13401 3 5 6.22355 5 10.2C5 14.1764 8.5 17.4 12 21Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg></div>
                  <div>
                    <strong className="footer-contact-label">Headquarters:</strong>
                    Ground Floor/470 St Kilda Rd, Melbourne VIC 3004
                  </div>
                </div>

                <div className="footer-contact-item">
                  <div className="footer-contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21C15.5 17.4 19 14.1764 19 10.2C19 6.22355 15.866 3 12 3C8.13401 3 5 6.22355 5 10.2C5 14.1764 8.5 17.4 12 21Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg></div>
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
                    <svg viewBox={s.viewBox} id="Camada_1" version="1.1" xmlns="http://www.w3.org/2000/svg" fill={s.fill}
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
