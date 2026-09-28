import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  allowedDevOrigins: [
    '.space-z.ai',
    'preview-chat-19611327-228f-438c-92f8-d72eb32ecc84.space-z.ai',
  ],
};

export default nextConfig;
