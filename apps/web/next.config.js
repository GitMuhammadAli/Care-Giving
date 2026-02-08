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

const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOTE: Standalone output is disabled - Vercel handles bundling automatically
  // Enable only for Docker deployments: output: 'standalone',
  
  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  
  experimental: {
    instrumentationHook: true,
  },
  
  images: {
    // Optimize images with modern formats
    formats: ['image/avif', 'image/webp'],
    // Allow images from these domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
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
    // Reduce image sizes in production
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  async headers() {
    const securityHeaders = [
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
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ];

    // Add strict CSP in production
    if (isProduction) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Cache static assets aggressively
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
