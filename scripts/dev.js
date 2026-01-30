#!/usr/bin/env node

/**
 * CareCircle Development Server
 * 
 * Features:
 * - Auto-detects environment (local Docker vs cloud services)
 * - Cross-platform signal handling (Windows + Unix)
 * - Proper child process cleanup
 * - Colorized output with service prefixes
 * - Dynamic port reading from config
 * 
 * Usage:
 *   node scripts/dev.js           # Auto-detect env, then start
 *   node scripts/dev.js --local   # Force local profile
 *   node scripts/dev.js --cloud   # Force cloud profile
 *   node scripts/dev.js --skip-env # Skip env detection (use existing .env)
 */

const { spawn, execSync, spawnSync } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

// ============================================================================
// ANSI COLORS
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  red: '\x1b[31m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

const c = colors;

// Parse CLI arguments
const args = process.argv.slice(2);
const skipEnv = args.includes('--skip-env');
const forceLocal = args.includes('--local');
const forceCloud = args.includes('--cloud');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  webPort: process.env.WEB_PORT || '4173',
  apiPort: process.env.API_PORT || '4000',
  workersHealthPort: process.env.HEALTH_PORT || '4001',
  redisPort: process.env.REDIS_PORT || '6379',
  postgresPort: process.env.DB_PORT || '5432',
  rabbitMQPort: process.env.RABBITMQ_PORT || '15672',
  mailpitPort: process.env.MAILPIT_PORT || '8025',
  minioPort: process.env.MINIO_PORT || '9001',
};

// ============================================================================
// BANNER
// ============================================================================

let activeProfile = null; // Set by detectAndSwitchEnv

function printBanner() {
  const profileBadge = activeProfile === 'local' 
    ? `${c.green}[LOCAL]${c.reset}` 
    : `${c.magenta}[CLOUD]${c.reset}`;
  
  console.log('');
  console.log(`${c.cyan}╔══════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.bright}${c.green}🏡  CareCircle Development Server${c.reset}  ${profileBadge}                        ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠══════════════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.bright}Services:${c.reset}                                                          ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.green}●${c.reset} ${c.bright}Web App${c.reset}      ${c.blue}http://localhost:${config.webPort}${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.green}●${c.reset} ${c.bright}API Server${c.reset}   ${c.blue}http://localhost:${config.apiPort}/api/v1${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.green}●${c.reset} ${c.bright}Swagger${c.reset}      ${c.blue}http://localhost:${config.apiPort}/api${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.green}●${c.reset} ${c.bright}Workers${c.reset}      ${c.blue}http://localhost:${config.workersHealthPort}/health${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠══════════════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.bright}Infrastructure (if using Docker):${c.reset}                                 ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}PostgreSQL${c.reset}   ${c.dim}localhost:${config.postgresPort}${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}Redis${c.reset}        ${c.dim}localhost:${config.redisPort}${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}RabbitMQ${c.reset}     ${c.dim}http://localhost:${config.rabbitMQPort}${c.reset}  ${c.magenta}(Message Queue)${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}Mailpit${c.reset}      ${c.dim}http://localhost:${config.mailpitPort}${c.reset}   ${c.magenta}(Email UI)${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}MinIO${c.reset}        ${c.dim}http://localhost:${config.minioPort}${c.reset}   ${c.magenta}(Storage UI)${c.reset}`.padEnd(78) + `${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠══════════════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.dim}Press ${c.reset}${c.bright}Ctrl+C${c.reset}${c.dim} to stop all services${c.reset}                               ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╚══════════════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log('');
  console.log(`${c.dim}Starting services...${c.reset}`);
  console.log('');
}

// ============================================================================
// OUTPUT HANDLING
// ============================================================================

function prefixOutput(prefix, color, data) {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    if (!line.trim()) return;
    if (line.includes('ELIFECYCLE')) return;
    
    console.log(`${color}[${prefix}]${c.reset} ${line}`);
  });
}

function classifyOutput(str) {
  // Classify based on content
  if (str.includes('@carecircle/web') || str.includes('next') || str.includes(':4173')) {
    return { prefix: 'WEB', color: c.blue };
  }
  if (str.includes('@carecircle/api') || str.includes('nest') || str.includes(':4000')) {
    return { prefix: 'API', color: c.green };
  }
  if (str.includes('@carecircle/workers') || str.includes('bull') || str.includes(':4001')) {
    return { prefix: 'WORKER', color: c.magenta };
  }
  if (str.includes('@carecircle/database') || str.includes('prisma')) {
    return { prefix: 'DB', color: c.yellow };
  }
  return { prefix: 'TURBO', color: c.cyan };
}

// ============================================================================
// PROCESS MANAGEMENT
// ============================================================================

let turboProcess = null;
let isShuttingDown = false;

async function killProcessTree(pid) {
  if (process.platform === 'win32') {
    // Windows: use taskkill to kill process tree
    try {
      const { execSync } = require('child_process');
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Process might already be dead
    }
  } else {
    // Unix: send SIGTERM to process group
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      // Try regular kill
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Process might already be dead
      }
    }
  }
}

async function shutdown(signal) {
  if (isShuttingDown) {
    console.log(`${c.yellow}Shutdown already in progress...${c.reset}`);
    return;
  }

  isShuttingDown = true;
  console.log('');
  console.log(`${c.yellow}Received ${signal}, stopping all services...${c.reset}`);

  if (turboProcess && turboProcess.pid) {
    await killProcessTree(turboProcess.pid);
  }

  // Give processes time to cleanup
  setTimeout(() => {
    console.log(`${c.dim}All services stopped.${c.reset}`);
    process.exit(0);
  }, 2000);
}

// ============================================================================
// ENVIRONMENT AUTO-DETECTION
// ============================================================================

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
    socket.on('connect', () => { cleanup(); resolve(true); });
    socket.on('timeout', () => { cleanup(); resolve(false); });
    socket.on('error', () => { cleanup(); resolve(false); });
    socket.connect(port, host);
  });
}

async function detectAndSwitchEnv() {
  const rootDir = path.resolve(__dirname, '..');
  
  console.log('');
  console.log(`${c.cyan}╔══════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.bright}🔍 Environment Auto-Detection${c.reset}                                     ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╚══════════════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log('');

  // Check forced profile
  if (forceLocal || forceCloud) {
    const profile = forceLocal ? 'local' : 'cloud';
    console.log(`${c.magenta}Forced profile: ${profile.toUpperCase()}${c.reset}`);
    await switchProfile(rootDir, profile);
    return profile;
  }

  // Auto-detect by checking Docker services
  console.log(`${c.dim}Checking local Docker services...${c.reset}`);
  console.log('');

  const services = [
    { name: 'PostgreSQL', port: 5432 },
    { name: 'Redis', port: 6379 },
    { name: 'RabbitMQ', port: 5672 },
  ];

  const results = await Promise.all(
    services.map(async (svc) => {
      const isUp = await testPort('localhost', svc.port);
      const status = isUp ? `${c.green}✓` : `${c.red}✗`;
      console.log(`  ${status} ${svc.name} (localhost:${svc.port})${c.reset}`);
      return { ...svc, isUp };
    })
  );

  console.log('');

  const allUp = results.every((r) => r.isUp);
  const anyUp = results.some((r) => r.isUp);

  let profile;

  if (allUp) {
    console.log(`${c.green}✓ All local services running → LOCAL profile${c.reset}`);
    profile = 'local';
  } else if (anyUp) {
    console.log(`${c.yellow}⚠ Some local services missing → CLOUD profile${c.reset}`);
    console.log(`${c.dim}  Tip: Run 'docker compose up -d' to start all local services${c.reset}`);
    profile = 'cloud';
  } else {
    console.log(`${c.cyan}→ No local services detected → CLOUD profile${c.reset}`);
    profile = 'cloud';
  }

  await switchProfile(rootDir, profile);
  return profile;
}

async function switchProfile(rootDir, profile) {
  // Check current profile
  const envPath = path.join(rootDir, '.env');
  let currentProfile = null;

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('ACTIVE PROFILE: LOCAL')) currentProfile = 'local';
    else if (content.includes('ACTIVE PROFILE: CLOUD')) currentProfile = 'cloud';
  }

  if (currentProfile === profile) {
    console.log(`${c.dim}Profile already set to ${profile.toUpperCase()} ✓${c.reset}`);
    return;
  }

  console.log(`${c.yellow}Switching to ${profile.toUpperCase()} profile...${c.reset}`);

  // Merge env files
  const baseEnv = fs.readFileSync(path.join(rootDir, 'env', 'base.env'), 'utf8');
  const profileEnv = fs.readFileSync(path.join(rootDir, 'env', `${profile}.env`), 'utf8');

  const header = `# =============================================================================
# CareCircle - ACTIVE PROFILE: ${profile.toUpperCase()}
# =============================================================================
# Generated from: env/base.env + env/${profile}.env
# Generated at: ${new Date().toISOString()}
# DO NOT EDIT - Run 'pnpm dev' to auto-detect or 'pnpm env:local/cloud' to switch
# =============================================================================

`;

  const merged = header + baseEnv + '\n\n' + profileEnv;

  // Write root .env
  fs.writeFileSync(envPath, merged, 'utf8');

  // Copy to app directories
  const appDirs = ['apps/api', 'apps/web', 'apps/workers', 'packages/database'];
  
  for (const dir of appDirs) {
    const targetPath = path.join(rootDir, dir, '.env');
    if (fs.existsSync(path.dirname(targetPath))) {
      fs.writeFileSync(targetPath, merged, 'utf8');
    }
  }

  console.log(`${c.green}✓ ${profile.toUpperCase()} profile activated!${c.reset}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Auto-detect environment unless skipped
  if (!skipEnv) {
    activeProfile = await detectAndSwitchEnv();
    console.log('');
  } else {
    // Read current profile from .env
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('ACTIVE PROFILE: LOCAL')) activeProfile = 'local';
      else if (content.includes('ACTIVE PROFILE: CLOUD')) activeProfile = 'cloud';
    }
  }

  printBanner();

  // Spawn turbo dev
  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';

  turboProcess = spawn(npxCmd, ['turbo', 'dev'], {
    cwd: process.cwd(),
    shell: isWindows, // Windows needs shell for .cmd files
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['inherit', 'pipe', 'pipe'],
    // On Unix, create a new process group for easier cleanup
    ...(isWindows ? {} : { detached: true }),
  });

  turboProcess.stdout.on('data', (data) => {
    const str = data.toString();
    const { prefix, color } = classifyOutput(str);
    prefixOutput(prefix, color, data);
  });

  turboProcess.stderr.on('data', (data) => {
    const str = data.toString();
    
    // Filter out noise
    if (str.includes('ExperimentalWarning')) return;
    if (str.includes('punycode')) return;
    if (str.includes('DeprecationWarning')) return;
    
    const { prefix } = classifyOutput(str);
    prefixOutput(prefix, c.yellow, data);
  });

  turboProcess.on('close', (code) => {
    if (!isShuttingDown) {
      console.log('');
      console.log(`${c.red}Turbo process exited with code ${code}${c.reset}`);
      process.exit(code || 0);
    }
  });

  turboProcess.on('error', (err) => {
    console.error(`${c.red}Failed to start turbo:${c.reset}`, err.message);
    process.exit(1);
  });

  // ============================================================================
  // SIGNAL HANDLERS
  // ============================================================================

  // Unix signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Windows-specific handling
  if (isWindows) {
    // Handle Ctrl+Break
    process.on('SIGBREAK', () => shutdown('SIGBREAK'));

    // Handle console close events
    const readline = require('readline');
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      rl.on('close', () => {
        if (!isShuttingDown) {
          shutdown('STDIN_CLOSE');
        }
      });

      // Keep the readline interface from buffering
      rl.on('line', () => {});
    }
  }

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    console.error(`${c.red}Uncaught exception:${c.reset}`, err);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason) => {
    console.error(`${c.red}Unhandled rejection:${c.reset}`, reason);
  });
}

main().catch((err) => {
  console.error(`${c.red}Failed to start:${c.reset}`, err);
  process.exit(1);
});
