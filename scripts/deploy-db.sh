#!/bin/bash
# =============================================================================
# CareCircle Database Deployment Script
# =============================================================================
# This script handles database migrations and optional admin seeding
# Run automatically on deployment or manually as needed
#
# Usage:
#   ./scripts/deploy-db.sh              # Migrations only
#   ./scripts/deploy-db.sh --seed       # Migrations + admin seeding
#   SEED_ADMIN=true ./scripts/deploy-db.sh  # Same as --seed
# =============================================================================

set -e  # Exit on error

echo "=================================================="
echo "🚀 CareCircle Database Deployment"
echo "=================================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "   Please set DATABASE_URL before running this script"
  exit 1
fi

# Parse arguments
SHOULD_SEED=false
for arg in "$@"; do
  case $arg in
    --seed)
      SHOULD_SEED=true
      shift
      ;;
  esac
done

# Also check environment variable
if [ "$SEED_ADMIN" = "true" ]; then
  SHOULD_SEED=true
fi

echo ""
echo "📦 Step 1: Generating Prisma Client..."
echo "--------------------------------------------------"
cd packages/database
npx prisma generate
echo "✅ Prisma client generated"

echo ""
echo "🔄 Step 2: Running Database Migrations..."
echo "--------------------------------------------------"
npx prisma migrate deploy
echo "✅ Migrations applied"

# Optional admin seeding
if [ "$SHOULD_SEED" = true ]; then
  echo ""
  echo "👤 Step 3: Seeding Admin Users..."
  echo "--------------------------------------------------"
  
  # Check for admin credentials
  if [ -z "$ADMIN_EMAIL" ]; then
    echo "   Using default admin email: superadmin@carecircle.com"
  else
    echo "   Using custom admin email: $ADMIN_EMAIL"
  fi
  
  npm run seed:admin
  echo "✅ Admin users seeded"
fi

echo ""
echo "=================================================="
echo "✅ Database deployment complete!"
echo "=================================================="

cd ../..

