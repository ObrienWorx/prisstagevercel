import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const noIndexHeader = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];

const nextConfig: NextConfig = {
  transpilePackages: ['ckeditor5', '@ckeditor/ckeditor5-react'],
  allowedDevOrigins: ['169.254.51.5'],
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/dashboard/:path*', headers: noIndexHeader },
      { source: '/user/:path*', headers: noIndexHeader },
      { source: '/OnlyAdminPanel', headers: noIndexHeader },
      { source: '/api/:path*', headers: noIndexHeader },
    ];
  },
};

export default nextConfig;
