import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'PristineGaze – Australian Investment Research', template: '%s – PristineGaze' },
  description: "Australia's premier investment research platform delivering daily market intelligence, sector analysis and expert insights.",
  icons: { icon: '/favicon.jpg', shortcut: '/favicon.jpg', apple: '/favicon.jpg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          async
        />
      </body>
    </html>
  );
}