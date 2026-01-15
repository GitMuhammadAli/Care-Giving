#!/bin/bash
set -e

###############################################################################
# CareCircle Database Restore Script
#
# This script restores a database backup from cloud storage or local file
#
# Usage:
#   ./restore-database.sh [backup-file] [target-database-url]
#
# Examples:
#   # Restore from S3
#   ./restore-database.sh s3://my-backups/database/backup_20260115.sql.gz
#
#   # Restore from local file
#   ./restore-database.sh /tmp/backup_20260115.sql.gz
#
#   # Restore to specific database
#   ./restore-database.sh backup.sql.gz postgresql://user:pass@host/db
###############################################################################

BACKUP_SOURCE="$1"
TARGET_DATABASE_URL="${2:-$DATABASE_URL}"
TEMP_DIR="/tmp/restore"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Cleanup
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Confirmation prompt
confirm_restore() {
    log_warning "⚠️  WARNING: This will OVERWRITE the target database!"
    log "Target: ${TARGET_DATABASE_URL%%\?*}"
    echo -n "Are you sure you want to continue? (type 'yes' to confirm): "
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
}

main() {
    log "=================================================="
    log "Starting CareCircle Database Restore"
    log "=================================================="

    # Validate inputs
    if [ -z "$BACKUP_SOURCE" ]; then
        log_error "Usage: ./restore-database.sh <backup-file>"
        exit 1
    fi

    if [ -z "$TARGET_DATABASE_URL" ]; then
        log_error "TARGET_DATABASE_URL is not set"
        exit 1
    fi

    # Confirm restore
    confirm_restore

    # Create temp directory
    mkdir -p "$TEMP_DIR"

    # Download/copy backup file
    log "Fetching backup file..."
    BACKUP_FILE="${TEMP_DIR}/backup.sql.gz"

    if [[ $BACKUP_SOURCE == s3://* ]]; then
        log "Downloading from S3..."
        aws s3 cp "$BACKUP_SOURCE" "$BACKUP_FILE"
    elif [[ $BACKUP_SOURCE == gs://* ]]; then
        log "Downloading from GCS..."
        gsutil cp "$BACKUP_SOURCE" "$BACKUP_FILE"
    elif [[ $BACKUP_SOURCE == azure://* ]]; then
        log "Downloading from Azure..."
        # Parse Azure path
        CONTAINER=$(echo "$BACKUP_SOURCE" | sed 's|azure://\([^/]*\)/.*|\1|')
        BLOB_NAME=$(echo "$BACKUP_SOURCE" | sed 's|azure://[^/]*/||')
        az storage blob download --container-name "$CONTAINER" \
            --name "$BLOB_NAME" --file "$BACKUP_FILE"
    else
        log "Copying local file..."
        cp "$BACKUP_SOURCE" "$BACKUP_FILE"
    fi

    # Decompress if needed
    if [[ $BACKUP_FILE == *.gz ]]; then
        log "Decompressing backup..."
        gunzip -k "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE%.gz}"
    fi

    # Restore database
    log "Restoring database..."
    log_warning "This may take several minutes..."

    if ! psql "$TARGET_DATABASE_URL" < "$BACKUP_FILE"; then
        log_error "Database restore failed"
        exit 1
    fi

    log_success "=================================================="
    log_success "Database restore completed successfully!"
    log_success "=================================================="
}

main

exit 0
