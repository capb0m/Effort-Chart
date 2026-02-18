import type { NextConfig } from 'next';

const securityHeaders = [
  // クリックジャッキング対策
  { key: 'X-Frame-Options', value: 'DENY' },
  // MIMEタイプスニッフィング対策
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // リファラー情報の制限
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 不要なブラウザ機能を無効化
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
