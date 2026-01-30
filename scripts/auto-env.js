#!/usr/bin/env node

/**
 * CareCircle - Environment Auto-Detection (Cross-Platform)
 * 
 * Checks if local Docker services are running. If yes → LOCAL, otherwise → CLOUD
 * 
 * Usage:
 *   node scripts/auto-env.js          # Auto-detect and switch
 *   node scripts/auto-env.js --local  # Force local profile
 *   node scripts/auto-env.js --cloud  # Force cloud profile
 *   node scripts/auto-env.js --quiet  # Suppress output, just switch
 *   node scripts/auto-env.js --check  # Only check, don't switch
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// =============================================================================
// ANSI COLORS
// =============================================================================

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const rootDir = path.resolve(__dirname, '..');
const services = [
  { name: 'PostgreSQL', host: 'localhost', port: 5432 },
  { name: 'Redis', host: 'localhost', port: 6379 },
  { name: 'RabbitMQ', host: 'localhost', port: 5672 },
];

// Parse arguments
const args = process.argv.slice(2);
const forceLocal = args.includes('--local');
const forceCloud = args.includes('--cloud');
const quiet = args.includes('--quiet') || args.includes('-q');
const checkOnly = args.includes('--check');

// =============================================================================
// HELPERS
// =============================================================================

function log(message, color = c.white) {
  if (!quiet) {
    console.log(`${color}${message}${c.reset}`);
  }
}

function testPort(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      cleanup();
      resolve(true);
    });

    socket.on('timeout', () => {
      cleanup();
      resolve(false);
    });

    socket.on('error', () => {
      cleanup();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function checkServices() {
  const results = await Promise.all(
    services.map(async (svc) => {
      const isUp = await testPort(svc.host, svc.port);
      return { ...svc, isUp };
    })
  );

  return results;
}

function getCurrentProfile() {
  const envPath = path.join(rootDir, '.env');
  
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  
  if (content.includes('ACTIVE PROFILE: LOCAL')) {
    return 'local';
  }
  if (content.includes('ACTIVE PROFILE: CLOUD')) {
    return 'cloud';
  }
  
  return null;
}

function switchProfile(profile) {
  const isWindows = process.platform === 'win32';
  const scriptName = `use-${profile}.ps1`;
  const scriptPath = path.join(rootDir, 'scripts', scriptName);

  if (!fs.existsSync(scriptPath)) {
    console.error(`${c.red}ERROR: Script not found: ${scriptPath}${c.reset}`);
    process.exit(1);
  }

  log(`\nSwitching to ${profile.toUpperCase()} profile...`, c.yellow);

  try {
    if (isWindows) {
      // Use PowerShell on Windows
      execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
        cwd: rootDir,
        stdio: quiet ? 'ignore' : 'inherit',
      });
    } else {
      // Use pwsh (PowerShell Core) on Unix, fall back to manual merge
      try {
        execSync(`pwsh -File "${scriptPath}"`, {
          cwd: rootDir,
          stdio: quiet ? 'ignore' : 'inherit',
        });
      } catch {
        // PowerShell not available, do manual merge
        manualMerge(profile);
      }
    }
  } catch (err) {
    console.error(`${c.red}Failed to switch profile:${c.reset}`, err.message);
    process.exit(1);
  }
}

function manualMerge(profile) {
  // Fallback for systems without PowerShell
  const baseEnv = fs.readFileSync(path.join(rootDir, 'env', 'base.env'), 'utf8');
  const profileEnv = fs.readFileSync(path.join(rootDir, 'env', `${profile}.env`), 'utf8');
  
  const header = `# =============================================================================
# CareCircle - ACTIVE PROFILE: ${profile.toUpperCase()}
# =============================================================================
# Generated from: env/base.env + env/${profile}.env
# Generated at: ${new Date().toISOString()}
# DO NOT EDIT - Use scripts/auto-env.js --local or --cloud
# =============================================================================

`;

  const merged = header + baseEnv + '\n\n' + profileEnv;
  
  // Write root .env
  fs.writeFileSync(path.join(rootDir, '.env'), merged, 'utf8');
  
  // Copy to app directories
  const appDirs = ['apps/api', 'apps/web', 'apps/workers', 'packages/database'];
  
  for (const dir of appDirs) {
    const targetPath = path.join(rootDir, dir, '.env');
    const targetDir = path.dirname(targetPath);
    
    if (fs.existsSync(targetDir)) {
      fs.writeFileSync(targetPath, merged, 'utf8');
      log(`  Copied .env to ${dir}/.env`, c.dim);
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  log('');
  log('═══════════════════════════════════════════════════════════════', c.cyan);
  log('  CareCircle - Environment Auto-Detection', c.cyan);
  log('═══════════════════════════════════════════════════════════════', c.cyan);
  log('');

  // Determine profile
  let profile;

  if (forceLocal) {
    log(`Forced profile: LOCAL`, c.magenta);
    profile = 'local';
  } else if (forceCloud) {
    log(`Forced profile: CLOUD`, c.magenta);
    profile = 'cloud';
  } else {
    // Auto-detect
    log('Checking local Docker services...', c.yellow);
    log('');

    const results = await checkServices();
    
    for (const svc of results) {
      const status = svc.isUp ? '✓' : '✗';
      const color = svc.isUp ? c.green : c.red;
      log(`  ${status} ${svc.name} (${svc.host}:${svc.port})`, color);
    }

    log('');

    const allUp = results.every((r) => r.isUp);
    const anyUp = results.some((r) => r.isUp);

    if (allUp) {
      log('All local services detected!', c.green);
      profile = 'local';
    } else if (anyUp) {
      log('⚠ Some local services missing - using CLOUD for consistency', c.yellow);
      log(`  Tip: Run 'docker compose up -d' to start all local services`, c.dim);
      profile = 'cloud';
    } else {
      log('No local services detected - using CLOUD', c.cyan);
      profile = 'cloud';
    }
  }

  log('');

  // Check if we need to switch
  const currentProfile = getCurrentProfile();

  if (checkOnly) {
    log(`Detected profile: ${profile.toUpperCase()}`, c.bright);
    log(`Current profile: ${currentProfile ? currentProfile.toUpperCase() : 'NOT SET'}`, c.dim);
    console.log(profile); // Output for scripting
    return;
  }

  if (currentProfile === profile) {
    log(`Profile already set to ${profile.toUpperCase()} - no change needed`, c.green);
  } else {
    switchProfile(profile);
    log('');
    log(`${profile.toUpperCase()} profile activated!`, c.green);
  }

  log('');
  log('═══════════════════════════════════════════════════════════════', c.cyan);
  log('');

  // Output profile for scripting
  if (quiet) {
    console.log(profile);
  }
}

main().catch((err) => {
  console.error(`${c.red}Error:${c.reset}`, err.message);
  process.exit(1);
});

