#!/bin/bash
# CareCircle Production Deployment Script (Bash)
# This script builds and deploys the production Docker containers

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║   🚀  CareCircle Production Deployment                       ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo -e "${RED}❌ Error: .env.prod file not found!${NC}"
    echo -e "${YELLOW}📝 Please copy .env.prod.example to .env.prod and fill in the values${NC}"
    echo ""
    echo -e "${GRAY}   cp .env.prod.example .env.prod${NC}"
    echo ""
    exit 1
fi

# Set environment
export COMPOSE_FILE="docker-compose.prod.yml"
export COMPOSE_PROJECT_NAME="carecircle-prod"

SERVICE=""

build_images() {
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"
    echo ""

    if [ -n "$SERVICE" ]; then
        docker-compose -f docker-compose.prod.yml --env-file .env.prod build "$SERVICE"
    else
        docker-compose -f docker-compose.prod.yml --env-file .env.prod build --parallel
    fi

    echo ""
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
}

start_services() {
    echo -e "${YELLOW}🚀 Starting services...${NC}"
    echo ""

    if [ -n "$SERVICE" ]; then
        docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d "$SERVICE"
    else
        docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
    fi

    echo ""
    echo -e "${GREEN}✅ Services started successfully!${NC}"
    echo ""
    echo -e "${CYAN}🌐 Application URLs:${NC}"
    echo -e "${WHITE}   - Web:        http://localhost${NC}"
    echo -e "${WHITE}   - API:        http://localhost/api/v1${NC}"
    echo -e "${WHITE}   - Swagger:    http://localhost/api-docs${NC}"
    echo -e "${WHITE}   - MinIO:      http://localhost:9001${NC}"
    echo ""
}

stop_services() {
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    echo ""

    if [ -n "$SERVICE" ]; then
        docker-compose -f docker-compose.prod.yml --env-file .env.prod down "$SERVICE"
    else
        docker-compose -f docker-compose.prod.yml --env-file .env.prod down
    fi

    echo ""
    echo -e "${GREEN}✅ Services stopped successfully!${NC}"
}

show_logs() {
    echo -e "${YELLOW}📋 Showing logs...${NC}"
    echo ""

    if [ -n "$SERVICE" ]; then
        docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f "$SERVICE"
    else
        docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f
    fi
}

clean_all() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    echo ""
    echo -e "${RED}⚠️  This will remove all containers, images, and volumes!${NC}"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        docker-compose -f docker-compose.prod.yml --env-file .env.prod down -v --rmi all
        echo ""
        echo -e "${GREEN}✅ Cleanup completed!${NC}"
    else
        echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
    fi
}

show_help() {
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "${WHITE}  ./scripts/deploy-prod.sh build              # Build images${NC}"
    echo -e "${WHITE}  ./scripts/deploy-prod.sh up                 # Start services${NC}"
    echo -e "${WHITE}  ./scripts/deploy-prod.sh down               # Stop services${NC}"
    echo -e "${WHITE}  ./scripts/deploy-prod.sh logs               # Show logs${NC}"
    echo -e "${WHITE}  ./scripts/deploy-prod.sh clean              # Clean everything${NC}"
    echo ""
    echo -e "${WHITE}  ./scripts/deploy-prod.sh build api          # Build specific service${NC}"
    echo ""
}

# Parse command line arguments
COMMAND="${1:-help}"
SERVICE="${2:-}"

case "$COMMAND" in
    build)
        build_images
        ;;
    up)
        start_services
        ;;
    down)
        stop_services
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_all
        ;;
    help|*)
        show_help
        ;;
esac
