#!/usr/bin/env node

/**
 * Icon Generation Script for CareCircle PWA
 * Generates all required PNG icons from the source SVG
 *
 * Run: npm run generate:icons
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SOURCE_SVG = path.join(ICONS_DIR, 'icon.svg');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Icon configurations
const icons = [
  // Standard PWA icons
  { size: 192, name: 'icon-192x192.png', maskable: true },
  { size: 512, name: 'icon-512x512.png', maskable: true },

  // Apple touch icon
  { size: 180, name: 'apple-touch-icon.png', maskable: false },

  // Badge icon (monochrome, simplified)
  { size: 72, name: 'badge-72x72.png', maskable: false, badge: true },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from SVG...\n');

  if (!fs.existsSync(SOURCE_SVG)) {
    console.error(`❌ Source SVG not found: ${SOURCE_SVG}`);
    process.exit(1);
  }

  for (const icon of icons) {
    const outputPath = path.join(ICONS_DIR, icon.name);

    try {
      let pipeline = sharp(SOURCE_SVG, { density: 300 });

      if (icon.maskable) {
        // For maskable icons, add safe zone padding
        // Maskable icons need 20% safe zone (40px for 192px, 102px for 512px)
        const safeZonePadding = Math.floor(icon.size * 0.2);
        const innerSize = icon.size - (safeZonePadding * 2);

        // Resize SVG to inner size
        pipeline = pipeline.resize(innerSize, innerSize);

        // Extend with background color to create safe zone
        pipeline = pipeline.extend({
          top: safeZonePadding,
          bottom: safeZonePadding,
          left: safeZonePadding,
          right: safeZonePadding,
          background: { r: 45, g: 90, b: 74 } // #2D5A4A
        });
      } else if (icon.badge) {
        // For badge icon, create a simplified monochrome version
        // Badge icons should be simple, single-color icons
        pipeline = pipeline
          .resize(icon.size, icon.size)
          .greyscale()
          .normalise();
      } else {
        // Standard icons - just resize
        pipeline = pipeline.resize(icon.size, icon.size);
      }

      // Convert to PNG and save
      await pipeline.png().toFile(outputPath);

      console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size}${icon.maskable ? ', maskable' : ''})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${icon.name}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✨ All icons generated successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Verify icons at: apps/web/public/icons/');
  console.log('2. Test maskable icons at: https://maskable.app/');
  console.log('3. Update manifest.json with icon references');
}

// Run the script
generateIcons().catch(error => {
  console.error('❌ Icon generation failed:', error);
  process.exit(1);
});
