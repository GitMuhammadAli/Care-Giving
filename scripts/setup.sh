#!/bin/bash
# =============================================================================
# CareCircle - First-Time Setup Script (macOS/Linux)
# =============================================================================
# Run: ./scripts/setup.sh
#
# This script will:
# 1. Check prerequisites (Node.js, pnpm, Docker)
# 2. Install dependencies
# 3. Setup environment files
# 4. Start Docker services
# 5. Setup database
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Helpers
write_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

write_success() {
    echo -e "${GREEN}  ✓ $1${NC}"
}

write_warning() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
}

write_error() {
    echo -e "${RED}  ✗ $1${NC}"
}

# Banner
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║   🏥  CareCircle - First Time Setup                         ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"
echo -e "${GRAY}Working directory: $ROOT_DIR${NC}"

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
write_step "Step 1: Checking Prerequisites"

HAS_ERRORS=false

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        write_success "Node.js $NODE_VERSION"
    else
        write_error "Node.js $NODE_VERSION (requires v18+)"
        HAS_ERRORS=true
    fi
else
    write_error "Node.js not found. Install from https://nodejs.org/"
    HAS_ERRORS=true
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    write_success "pnpm v$PNPM_VERSION"
else
    write_warning "pnpm not found. Installing..."
    npm install -g pnpm
    write_success "pnpm installed"
fi

# Check Docker
if command -v docker &> /dev/null; then
    write_success "Docker installed"
    
    # Check if Docker is running
    if docker info &> /dev/null; then
        write_success "Docker is running"
    else
        write_error "Docker is not running. Please start Docker."
        HAS_ERRORS=true
    fi
else
    write_error "Docker not found. Install from https://docker.com/"
    HAS_ERRORS=true
fi

# Check Docker Compose
if docker compose version &> /dev/null; then
    write_success "Docker Compose installed"
else
    write_error "Docker Compose not found"
    HAS_ERRORS=true
fi

if [ "$HAS_ERRORS" = true ]; then
    echo ""
    write_error "Please fix the above issues and run this script again."
    exit 1
fi

# =============================================================================
# Step 2: Install Dependencies
# =============================================================================
write_step "Step 2: Installing Dependencies"

echo -e "${GRAY}  Running pnpm install...${NC}"
pnpm install --frozen-lockfile

write_success "Dependencies installed"

# =============================================================================
# Step 3: Setup Environment Files
# =============================================================================
write_step "Step 3: Setting Up Environment"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${GRAY}  No .env file found. Creating from local profile...${NC}"
    
    # Check if env templates exist
    if [ -f "env/base.env" ]; then
        # Use the auto-env script
        node scripts/auto-env.js --local
        write_success "Environment configured for LOCAL development"
    elif [ -f "env/base.env.example" ]; then
        write_warning "env/base.env not found. Copying from examples..."
        cp env/base.env.example env/base.env
        cp env/local.env.example env/local.env
        node scripts/auto-env.js --local
        write_success "Environment configured (update env/*.env with your values)"
    else
        write_error "No environment templates found!"
        exit 1
    fi
else
    write_success "Environment file exists"
fi

# =============================================================================
# Step 4: Start Docker Services
# =============================================================================
write_step "Step 4: Starting Docker Services"

echo -e "${GRAY}  Starting PostgreSQL, Redis, RabbitMQ...${NC}"
docker compose up -d

write_success "Docker services started"

# Wait for services to be healthy
echo -e "${GRAY}  Waiting for services to be ready...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
    
    PG_HEALTH=$(docker compose ps postgres --format "{{.Health}}" 2>/dev/null || echo "")
    REDIS_HEALTH=$(docker compose ps redis --format "{{.Health}}" 2>/dev/null || echo "")
    
    if [ "$PG_HEALTH" = "healthy" ] && [ "$REDIS_HEALTH" = "healthy" ]; then
        write_success "All services healthy"
        break
    fi
    
    echo -e "${GRAY}    Attempt $ATTEMPT/$MAX_ATTEMPTS...${NC}"
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    write_warning "Services may not be fully ready. Continuing anyway..."
fi

# =============================================================================
# Step 5: Setup Database
# =============================================================================
write_step "Step 5: Setting Up Database"

echo -e "${GRAY}  Generating Prisma client...${NC}"
pnpm --filter @carecircle/database generate
write_success "Prisma client generated"

echo -e "${GRAY}  Pushing schema to database...${NC}"
pnpm --filter @carecircle/database db:push
write_success "Database schema created"

# =============================================================================
# Complete!
# =============================================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║   ✓  Setup Complete!                                         ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "${WHITE}  1. Start development servers:${NC}"
echo -e "${CYAN}     pnpm dev:all${NC}"
echo ""
echo -e "${WHITE}  2. Or start individually:${NC}"
echo -e "${CYAN}     pnpm dev:api      # API on http://localhost:4000${NC}"
echo -e "${CYAN}     pnpm dev:web      # Web on http://localhost:3000${NC}"
echo -e "${CYAN}     pnpm dev:workers  # Background workers${NC}"
echo ""
echo -e "${WHITE}  3. Or use Make commands:${NC}"
echo -e "${CYAN}     make dev          # Start everything${NC}"
echo -e "${CYAN}     make help         # See all commands${NC}"
echo ""
echo -e "${YELLOW}Useful URLs:${NC}"
echo -e "${WHITE}  - Web App:     http://localhost:3000${NC}"
echo -e "${WHITE}  - API:         http://localhost:4000${NC}"
echo -e "${WHITE}  - Swagger:     http://localhost:4000/api${NC}"
echo -e "${WHITE}  - RabbitMQ UI: http://localhost:15672 (guest/guest)${NC}"
echo ""

