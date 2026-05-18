import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['ckeditor5', '@ckeditor/ckeditor5-react'],
  allowedDevOrigins: ['169.254.51.5'],
};

export default nextConfig;
