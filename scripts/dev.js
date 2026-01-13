#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes
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
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

const c = colors;

function printBanner() {
  console.log('');
  console.log(`${c.cyan}╔══════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.bright}${c.green}🏡  CareCircle Development Server${c.reset}                                 ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠══════════════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.bright}Services:${c.reset}                                                          ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.green}●${c.reset} ${c.bright}Web App${c.reset}      ${c.blue}http://localhost:3000${c.reset}                            ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.green}●${c.reset} ${c.bright}API Server${c.reset}   ${c.blue}http://localhost:3001/api/v1${c.reset}                     ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.green}●${c.reset} ${c.bright}Swagger${c.reset}      ${c.blue}http://localhost:3001/api${c.reset}                         ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╠══════════════════════════════════════════════════════════════════════╣${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.bright}Infrastructure (if using Docker):${c.reset}                                 ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                                                                      ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}PostgreSQL${c.reset}   ${c.dim}localhost:5432${c.reset}                                  ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}Redis${c.reset}        ${c.dim}localhost:6379${c.reset}                                  ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}RabbitMQ${c.reset}     ${c.dim}http://localhost:15672${c.reset}  ${c.magenta}(Message Queue)${c.reset}        ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}Mailpit${c.reset}      ${c.dim}http://localhost:8025${c.reset}   ${c.magenta}(Email UI)${c.reset}             ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}   ${c.yellow}○${c.reset} ${c.dim}MinIO${c.reset}        ${c.dim}http://localhost:9001${c.reset}   ${c.magenta}(Storage UI)${c.reset}           ${c.cyan}║${c.reset}`);
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

function prefixOutput(prefix, color, data) {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    // Skip empty lines and some noise
    if (!line.trim()) return;
    if (line.includes('ELIFECYCLE')) return;
    
    console.log(`${color}[${prefix}]${c.reset} ${line}`);
  });
}

async function main() {
  printBanner();

  // Start turbo dev
  const turbo = spawn('npx', ['turbo', 'dev'], {
    cwd: process.cwd(),
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  turbo.stdout.on('data', (data) => {
    const str = data.toString();
    
    // Detect which app the output is from and colorize
    if (str.includes('@carecircle/web') || str.includes('next') || str.includes(':3000')) {
      prefixOutput('WEB', c.blue, data);
    } else if (str.includes('@carecircle/api') || str.includes('nest') || str.includes(':3001')) {
      prefixOutput('API', c.green, data);
    } else if (str.includes('@carecircle/workers') || str.includes('bull')) {
      prefixOutput('WORKER', c.magenta, data);
    } else {
      prefixOutput('TURBO', c.cyan, data);
    }
  });

  turbo.stderr.on('data', (data) => {
    const str = data.toString();
    
    // Filter out some noise
    if (str.includes('ExperimentalWarning')) return;
    if (str.includes('punycode')) return;
    
    if (str.includes('@carecircle/web') || str.includes('next')) {
      prefixOutput('WEB', c.yellow, data);
    } else if (str.includes('@carecircle/api') || str.includes('nest')) {
      prefixOutput('API', c.yellow, data);
    } else {
      prefixOutput('ERR', c.yellow, data);
    }
  });

  turbo.on('close', (code) => {
    console.log('');
    console.log(`${c.dim}All services stopped.${c.reset}`);
    process.exit(code);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('');
    console.log(`${c.yellow}Stopping all services...${c.reset}`);
    turbo.kill('SIGINT');
  });
}

main().catch(console.error);

