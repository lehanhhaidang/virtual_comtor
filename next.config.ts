import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // Expose app version (SemVer) to the client.
  // `npm_package_version` is provided by npm scripts/build environments.
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.0.0',
  },

  // Prevent Next standalone tracing from trying to copy local runtime data folders.
  // (e.g. persisted Mongo/WiredTiger files in Vcomtor/)
  outputFileTracingExcludes: {
    '*': ['Vcomtor/mongodb/**', 'Vcomtor/storage/**'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "connect-src 'self' wss://stt-rt.soniox.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
