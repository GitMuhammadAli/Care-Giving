#!/usr/bin/env node

/**
 * =============================================================================
 * CareCircle - Production Secrets Generator
 * =============================================================================
 * Generates secure random secrets for production deployment.
 * 
 * Usage:
 *   node scripts/generate-secrets.js
 *   node scripts/generate-secrets.js --json
 *   node scripts/generate-secrets.js --env
 * 
 * =============================================================================
 */

const crypto = require('crypto');

// Generate cryptographically secure random hex string
function generateSecret(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

// Generate all required secrets
function generateAllSecrets() {
  return {
    JWT_SECRET: generateSecret(32),              // 64 chars
    JWT_REFRESH_SECRET: generateSecret(32),      // 64 chars
    ENCRYPTION_KEY: generateSecret(16),          // 32 chars
    SESSION_SECRET: generateSecret(32),          // 64 chars (if needed)
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
const outputJson = args.includes('--json');
const outputEnv = args.includes('--env');

// Generate secrets
const secrets = generateAllSecrets();

if (outputJson) {
  // JSON output for programmatic use
  console.log(JSON.stringify(secrets, null, 2));
} else if (outputEnv) {
  // .env format for easy copy-paste
  console.log('# Generated secrets - Copy these to your .env or hosting dashboard');
  console.log('# Generated at:', new Date().toISOString());
  console.log('');
  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
} else {
  // Pretty output (default)
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                              ║');
  console.log('║   🔐  CareCircle Production Secrets Generator                                ║');
  console.log('║                                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                              ║');
  console.log('║   ⚠️   IMPORTANT: Save these secrets securely!                               ║');
  console.log('║   Never commit them to version control.                                      ║');
  console.log('║   Add them to Render/Vercel environment variables.                           ║');
  console.log('║                                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                              ║');
  console.log('║   Copy these values to your hosting dashboard:                               ║');
  console.log('║                                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ JWT_SECRET (64 chars)                                                        │');
  console.log('├──────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ ${secrets.JWT_SECRET} │`);
  console.log('└──────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
  
  console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ JWT_REFRESH_SECRET (64 chars)                                                │');
  console.log('├──────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ ${secrets.JWT_REFRESH_SECRET} │`);
  console.log('└──────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
  
  console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ ENCRYPTION_KEY (32 chars)                                                    │');
  console.log('├──────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│ ${secrets.ENCRYPTION_KEY}                                 │`);
  console.log('└──────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
  
  console.log('For .env format, run: node scripts/generate-secrets.js --env');
  console.log('For JSON format, run: node scripts/generate-secrets.js --json');
  console.log('');
}

