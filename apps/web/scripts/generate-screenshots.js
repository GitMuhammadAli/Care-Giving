#!/usr/bin/env node

/**
 * Screenshot Generation Script for CareCircle PWA
 * Generates placeholder screenshots for the install dialog
 *
 * Run: npm run generate:screenshots
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../public/screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Screenshot configurations
const screenshots = [
  // Mobile screenshots (narrow)
  {
    name: 'dashboard-mobile.png',
    width: 540,
    height: 720,
    formFactor: 'narrow',
    label: 'Dashboard - Care coordination at a glance',
  },
  {
    name: 'medications-mobile.png',
    width: 540,
    height: 720,
    formFactor: 'narrow',
    label: 'Medication tracking and reminders',
  },
  {
    name: 'emergency-mobile.png',
    width: 540,
    height: 720,
    formFactor: 'narrow',
    label: 'Emergency contacts and information',
  },
  // Desktop screenshot (wide)
  {
    name: 'dashboard-desktop.png',
    width: 1280,
    height: 800,
    formFactor: 'wide',
    label: 'Dashboard - Desktop view',
  },
];

// Create a simple branded placeholder screenshot
async function createPlaceholder(config) {
  const { width, height, name, label } = config;

  // Create SVG with CareCircle branding
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#FAFAF8"/>

      <!-- Sage green accent -->
      <rect width="${width}" height="80" fill="#2D5A4A"/>

      <!-- Logo circle in header -->
      <circle cx="${width / 2}" cy="40" r="24" fill="none" stroke="#FAFAF8" stroke-width="3"/>
      <path d="M${width / 2} 52c-8-7-14-12-14-17 0-5 4-8 8-8 3 0 5 2 6 4 1-2 3-4 6-4 4 0 8 3 8 8 0 5-6 10-14 17z" fill="#FAFAF8"/>

      <!-- Title -->
      <text x="${width / 2}" y="${height / 2 - 40}" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="600" fill="#2D5A4A" text-anchor="middle">
        CareCircle
      </text>

      <!-- Label -->
      <text x="${width / 2}" y="${height / 2 + 20}" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#6B7280" text-anchor="middle">
        ${label}
      </text>

      <!-- Placeholder indicator -->
      <text x="${width / 2}" y="${height - 40}" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#9CA3AF" text-anchor="middle" opacity="0.7">
        Placeholder - Replace with actual screenshot
      </text>

      <!-- Decorative elements -->
      <rect x="${width / 2 - 200}" y="${height / 2 + 80}" width="400" height="120" rx="12" fill="#F3F4F6"/>
      <rect x="${width / 2 - 180}" y="${height / 2 + 100}" width="100" height="8" rx="4" fill="#D1D5DB"/>
      <rect x="${width / 2 - 180}" y="${height / 2 + 120}" width="150" height="8" rx="4" fill="#E5E7EB"/>
      <rect x="${width / 2 - 180}" y="${height / 2 + 140}" width="120" height="8" rx="4" fill="#E5E7EB"/>
    </svg>
  `;

  const outputPath = path.join(SCREENSHOTS_DIR, name);

  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated ${name} (${width}x${height})`);
  } catch (error) {
    console.error(`❌ Failed to generate ${name}:`, error.message);
    throw error;
  }
}

async function generateScreenshots() {
  console.log('📸 Generating placeholder screenshots...\n');

  for (const screenshot of screenshots) {
    await createPlaceholder(screenshot);
  }

  console.log('\n✨ All screenshots generated successfully!');
  console.log('\n⚠️  IMPORTANT: These are placeholder screenshots.');
  console.log('For production, replace with actual app screenshots:');
  console.log('1. Run the app: pnpm dev');
  console.log('2. Open Chrome DevTools (F12)');
  console.log('3. Enable device emulation (Ctrl+Shift+M)');
  console.log('4. Navigate to key pages');
  console.log('5. Capture screenshots (Ctrl+Shift+P > "Screenshot")');
  console.log('6. Save to apps/web/public/screenshots/');
}

// Run the script
generateScreenshots().catch(error => {
  console.error('❌ Screenshot generation failed:', error);
  process.exit(1);
});
