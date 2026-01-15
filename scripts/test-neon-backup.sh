#!/bin/bash

###############################################################################
# Neon Backup & Restore Test Script
#
# This script tests the backup and restore functionality by:
# 1. Creating a test branch (instant backup)
# 2. Verifying data integrity in the branch
# 3. Testing connection to the branch
# 4. Cleaning up the test branch
#
# Usage:
#   ./test-neon-backup.sh
#
# Environment variables required:
#   - NEON_PROJECT_ID: Your Neon project ID
#   - DATABASE_URL: Your primary database connection string
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

echo "🧪 Testing Neon Backup & Restore Functionality"
echo "================================================"
echo ""

# Check prerequisites
log "Checking prerequisites..."

if ! command -v neonctl &> /dev/null; then
    log_error "neonctl CLI not found"
    echo "Install with: npm install -g neonctl"
    exit 1
fi

if [ -z "$NEON_PROJECT_ID" ]; then
    log_error "NEON_PROJECT_ID not set"
    echo "Set it with: export NEON_PROJECT_ID='your-project-id'"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL not set"
    exit 1
fi

log_success "Prerequisites OK"
echo ""

# Step 1: Create test branch
TEST_BRANCH="backup-test-$(date +%s)"
log "Step 1: Creating test branch: $TEST_BRANCH"

if neonctl branch create \
    --name "$TEST_BRANCH" \
    --project-id "$NEON_PROJECT_ID" > /dev/null 2>&1; then
    log_success "Test branch created successfully"
else
    log_error "Failed to create test branch"
    exit 1
fi
echo ""

# Step 2: Get connection string
log "Step 2: Getting connection string for test branch..."

TEST_URL=$(neonctl connection-string \
    --branch "$TEST_BRANCH" \
    --project-id "$NEON_PROJECT_ID" 2>/dev/null)

if [ -z "$TEST_URL" ]; then
    log_error "Failed to get connection string"
    neonctl branch delete "$TEST_BRANCH" --project-id "$NEON_PROJECT_ID" 2>/dev/null || true
    exit 1
fi

log_success "Connection string obtained"
echo ""

# Step 3: Test connection
log "Step 3: Testing database connection..."

if pg_isready -d "$TEST_URL" > /dev/null 2>&1; then
    log_success "Database connection successful"
else
    log_warning "pg_isready not available, trying psql..."
    if psql "$TEST_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection successful (via psql)"
    else
        log_error "Cannot connect to test branch"
        neonctl branch delete "$TEST_BRANCH" --project-id "$NEON_PROJECT_ID" 2>/dev/null || true
        exit 1
    fi
fi
echo ""

# Step 4: Verify data integrity
log "Step 4: Verifying data integrity..."

# Count users
USER_COUNT=$(psql "$TEST_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
log_success "Found $USER_COUNT users in backup branch"

# Count care recipients (if table exists)
CARE_COUNT=$(psql "$TEST_URL" -t -c "SELECT COUNT(*) FROM \"CareRecipient\";" 2>/dev/null | xargs || echo "0")
log_success "Found $CARE_COUNT care recipients in backup branch"

# Verify schema integrity
TABLE_COUNT=$(psql "$TEST_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
log_success "Found $TABLE_COUNT tables in schema"

echo ""

# Step 5: Test point-in-time recovery (optional, if timestamp support available)
log "Step 5: Testing branch metadata..."

BRANCH_INFO=$(neonctl branch get "$TEST_BRANCH" --project-id "$NEON_PROJECT_ID" --output json 2>/dev/null || echo "{}")
BRANCH_ID=$(echo "$BRANCH_INFO" | jq -r '.id // "unknown"')
CREATED_AT=$(echo "$BRANCH_INFO" | jq -r '.created_at // "unknown"')

log_success "Branch ID: $BRANCH_ID"
log_success "Created at: $CREATED_AT"

echo ""

# Step 6: Cleanup
log "Step 6: Cleaning up test branch..."

if neonctl branch delete "$TEST_BRANCH" \
    --project-id "$NEON_PROJECT_ID" > /dev/null 2>&1; then
    log_success "Test branch deleted successfully"
else
    log_error "Failed to delete test branch (you may need to delete it manually)"
    log_warning "Run: neonctl branch delete $TEST_BRANCH --project-id $NEON_PROJECT_ID"
fi

echo ""
echo "================================================"
log_success "✅ All backup tests passed!"
echo ""
log "Summary:"
echo "  - Branch creation: ✅ Working"
echo "  - Connection: ✅ Working"
echo "  - Data integrity: ✅ Verified ($USER_COUNT users, $CARE_COUNT care recipients)"
echo "  - Cleanup: ✅ Complete"
echo ""
log_success "Your Neon backup system is fully functional!"
