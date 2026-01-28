const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const path = require('path');
const fs = require('fs');

// ============================================================================
// Load environment variables from monorepo root
// This allows the web app to use the same .env file as the API
// ============================================================================
const rootDir = path.resolve(__dirname, '../..');
const rootEnvFile = path.join(rootDir, '.env');

// Load root .env if it exists
if (fs.existsSync(rootEnvFile)) {
  require('dotenv').config({ path: rootEnvFile });
}

// Also load env/base.env for NEXT_PUBLIC_* variables
const baseEnvFile = path.join(rootDir, 'env', 'base.env');
if (fs.existsSync(baseEnvFile)) {
  require('dotenv').config({ path: baseEnvFile });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Startup log
  onDemandEntries: {
    // Keep pages in memory for 5 minutes
    maxInactiveAge: 5 * 60 * 1000,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

// Log startup info
if (process.env.NODE_ENV !== 'production') {
  const streamApiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║   🌐  CareCircle Web App (Next.js)                           ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║   🚀  App:     http://localhost:4173                         ║');
  console.log(`║   🔗  API:     ${apiUrl}`.padEnd(63) + '║');
  console.log(`║   💬  Chat:    ${streamApiKey ? '✓ Stream configured' : '✗ Not configured'}`.padEnd(63) + '║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Log loaded env sources
  if (fs.existsSync(rootEnvFile)) {
    console.log(`  📁 Loaded: ${rootEnvFile}`);
  }
  if (fs.existsSync(baseEnvFile)) {
    console.log(`  📁 Loaded: ${baseEnvFile}`);
  }
  console.log('');
}

module.exports = withBundleAnalyzer(nextConfig);
