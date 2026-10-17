import type { Metadata } from 'next';
import Script from 'next/script';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import NavProgress from '@/components/NavProgress';
import DynamicCanonical from '@/components/DynamicCanonical';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pristinegaze.com.au';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'PristineGaze – Australian Investment Research', template: '%s – PristineGaze' },
  description: "Australia's premier investment research platform delivering daily market intelligence, sector analysis and expert insights.",
  icons: { icon: '/favicon.jpg', shortcut: '/favicon.jpg', apple: '/favicon.jpg' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  authors: [{ name: 'Pristine Gaze', url: SITE_URL }],
  publisher: 'Pristine Gaze',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <DynamicCanonical />
        <Script
          id="gtm"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KMTBWWHC');`,
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KMTBWWHC"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <NavProgress />
        {children}
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          async
        />
      </body>
    </html>
  );
}