# =============================================================================
# CareCircle - Development Commands
# =============================================================================
# Unified interface for common development tasks.
# Run 'make help' to see all available commands.
# =============================================================================

.PHONY: help setup dev stop test lint build clean logs db-migrate db-push db-seed db-studio docker-clean

# Default target
.DEFAULT_GOAL := help

# Colors for terminal output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# =============================================================================
# HELP
# =============================================================================
help: ## Show this help message
	@echo ""
	@echo "$(BLUE)CareCircle Development Commands$(RESET)"
	@echo "================================"
	@echo ""
	@echo "$(GREEN)Setup:$(RESET)"
	@grep -E '^(setup|install):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@grep -E '^(dev|stop|logs):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Testing & Quality:$(RESET)"
	@grep -E '^(test|lint|build):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Database:$(RESET)"
	@grep -E '^db-.*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Cleanup:$(RESET)"
	@grep -E '^(clean|docker-clean):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# SETUP
# =============================================================================
setup: ## First-time project setup (install deps + start services)
	@echo "$(BLUE)Setting up CareCircle...$(RESET)"
	@echo ""
	@echo "$(GREEN)Step 1:$(RESET) Installing dependencies..."
	pnpm install
	@echo ""
	@echo "$(GREEN)Step 2:$(RESET) Starting Docker services..."
	docker-compose up -d
	@echo ""
	@echo "$(GREEN)Step 3:$(RESET) Waiting for services to be ready..."
	@sleep 5
	@echo ""
	@echo "$(GREEN)Step 4:$(RESET) Setting up database..."
	pnpm --filter @carecircle/database db:push
	pnpm --filter @carecircle/database generate
	@echo ""
	@echo "$(GREEN)✓ Setup complete!$(RESET)"
	@echo ""
	@echo "Run '$(YELLOW)make dev$(RESET)' to start development servers."

install: ## Install dependencies only
	pnpm install

# =============================================================================
# DEVELOPMENT
# =============================================================================
dev: ## Start all development servers (API, Web, Workers)
	@echo "$(BLUE)Starting development servers...$(RESET)"
	@docker-compose up -d
	pnpm dev:all

dev-api: ## Start only API server
	@docker-compose up -d postgres redis
	pnpm dev:api

dev-web: ## Start only Web server
	pnpm dev:web

dev-workers: ## Start only Workers
	@docker-compose up -d postgres redis rabbitmq
	pnpm dev:workers

stop: ## Stop all Docker services
	@echo "$(BLUE)Stopping services...$(RESET)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(RESET)"

logs: ## Show Docker logs (follow mode)
	docker-compose logs -f

logs-api: ## Show API logs only
	docker-compose logs -f api

# =============================================================================
# TESTING & QUALITY
# =============================================================================
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(RESET)"
	pnpm test

test-watch: ## Run tests in watch mode
	pnpm test -- --watch

test-coverage: ## Run tests with coverage report
	pnpm test -- --coverage

lint: ## Run linting
	@echo "$(BLUE)Running linter...$(RESET)"
	pnpm lint

lint-fix: ## Run linting with auto-fix
	pnpm lint -- --fix

build: ## Build all packages
	@echo "$(BLUE)Building all packages...$(RESET)"
	pnpm build
	@echo "$(GREEN)✓ Build complete$(RESET)"

# =============================================================================
# DATABASE
# =============================================================================
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running migrations...$(RESET)"
	pnpm --filter @carecircle/database db:migrate
	@echo "$(GREEN)✓ Migrations complete$(RESET)"

db-push: ## Push schema changes to database (development)
	@echo "$(BLUE)Pushing schema changes...$(RESET)"
	pnpm --filter @carecircle/database db:push
	@echo "$(GREEN)✓ Schema pushed$(RESET)"

db-seed: ## Seed the database with sample data
	@echo "$(BLUE)Seeding database...$(RESET)"
	pnpm --filter @carecircle/database db:seed
	@echo "$(GREEN)✓ Database seeded$(RESET)"

db-studio: ## Open Prisma Studio (database GUI)
	@echo "$(BLUE)Opening Prisma Studio...$(RESET)"
	pnpm --filter @carecircle/database db:studio

db-reset: ## Reset database (drop all data + re-migrate)
	@echo "$(RED)WARNING: This will delete all data!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	pnpm --filter @carecircle/database db:push --force-reset
	@echo "$(GREEN)✓ Database reset$(RESET)"

# =============================================================================
# CLEANUP
# =============================================================================
clean: ## Clean build artifacts and node_modules
	@echo "$(BLUE)Cleaning build artifacts...$(RESET)"
	pnpm clean
	rm -rf .turbo
	rm -rf coverage
	@echo "$(GREEN)✓ Clean complete$(RESET)"

clean-all: clean ## Clean everything including node_modules
	@echo "$(BLUE)Removing node_modules...$(RESET)"
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	@echo "$(GREEN)✓ Full clean complete$(RESET)"

docker-clean: ## Clean Docker resources (containers, images, volumes)
	@echo "$(BLUE)Cleaning Docker resources...$(RESET)"
	docker-compose down -v --remove-orphans
	docker system prune -f
	@echo "$(GREEN)✓ Docker cleaned$(RESET)"

docker-reset: ## Full Docker reset (removes ALL volumes - DESTRUCTIVE)
	@echo "$(RED)WARNING: This will delete all Docker data including database!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker-compose down -v --remove-orphans
	docker volume prune -f
	@echo "$(GREEN)✓ Docker reset complete$(RESET)"

# =============================================================================
# UTILITIES
# =============================================================================
env-check: ## Verify environment configuration
	@echo "$(BLUE)Checking environment...$(RESET)"
	@node scripts/auto-env.js
	@echo "$(GREEN)✓ Environment check complete$(RESET)"

status: ## Show status of all services
	@echo "$(BLUE)Service Status$(RESET)"
	@echo "==============="
	@docker-compose ps

