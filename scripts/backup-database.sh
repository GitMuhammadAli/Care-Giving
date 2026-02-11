#!/bin/bash
set -e

###############################################################################
# CareCircle Database Backup Script
#
# This script:
# 1. Creates a PostgreSQL database backup
# 2. Compresses the backup
# 3. Uploads to cloud storage (S3/GCS/Azure)
# 4. Manages backup retention
# 5. Sends notifications on failure
#
# Usage:
#   ./backup-database.sh [production|staging|local]
#
# Environment Variables Required:
#   DATABASE_URL        - PostgreSQL connection string
#   BACKUP_BUCKET       - S3/GCS bucket name (e.g., s3://my-backups or gs://my-backups)
#   BACKUP_RETENTION    - Days to retain backups (default: 30)
#   SLACK_WEBHOOK_URL   - Optional: for failure notifications
###############################################################################

# Configuration
ENVIRONMENT="${1:-production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/backups"
BACKUP_FILE="carecircle_${ENVIRONMENT}_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
BACKUP_RETENTION="${BACKUP_RETENTION:-30}"
LOG_FILE="/var/log/carecircle-backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Send Slack notification on failure
send_alert() {
    local message="$1"
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Backup Failed: ${message}\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f "${BACKUP_DIR}/${BACKUP_FILE}" "${BACKUP_DIR}/${BACKUP_FILE_GZ}"
}

trap cleanup EXIT

# Main backup process
main() {
    log "=================================================="
    log "Starting CareCircle Database Backup"
    log "Environment: ${ENVIRONMENT}"
    log "=================================================="

    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL environment variable is not set"
        send_alert "DATABASE_URL not configured"
        exit 1
    fi

    # Check if BACKUP_BUCKET is set
    if [ -z "$BACKUP_BUCKET" ]; then
        log_warning "BACKUP_BUCKET not set. Backup will be stored locally only."
    fi

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Step 1: Create database dump
    log "Creating database dump..."
    if ! pg_dump "$DATABASE_URL" > "${BACKUP_DIR}/${BACKUP_FILE}"; then
        log_error "Database dump failed"
        send_alert "pg_dump failed for ${ENVIRONMENT}"
        exit 1
    fi

    # Get backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log_success "Database dump created: ${BACKUP_SIZE}"

    # Step 2: Compress backup
    log "Compressing backup..."
    if ! gzip -9 "${BACKUP_DIR}/${BACKUP_FILE}"; then
        log_error "Compression failed"
        send_alert "Backup compression failed for ${ENVIRONMENT}"
        exit 1
    fi

    COMPRESSED_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE_GZ}" | cut -f1)
    log_success "Backup compressed: ${COMPRESSED_SIZE}"

    # Step 3: Upload to cloud storage
    if [ -n "$BACKUP_BUCKET" ]; then
        log "Uploading to cloud storage: ${BACKUP_BUCKET}"

        # Detect cloud provider and upload
        if [[ $BACKUP_BUCKET == s3://* ]]; then
            # AWS S3
            log "Uploading to AWS S3..."
            if ! aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE_GZ}" "${BACKUP_BUCKET}/database/${BACKUP_FILE_GZ}"; then
                log_error "S3 upload failed"
                send_alert "S3 upload failed for ${ENVIRONMENT}"
                exit 1
            fi
        elif [[ $BACKUP_BUCKET == gs://* ]]; then
            # Google Cloud Storage
            log "Uploading to Google Cloud Storage..."
            if ! gsutil cp "${BACKUP_DIR}/${BACKUP_FILE_GZ}" "${BACKUP_BUCKET}/database/${BACKUP_FILE_GZ}"; then
                log_error "GCS upload failed"
                send_alert "GCS upload failed for ${ENVIRONMENT}"
                exit 1
            fi
        elif [[ $BACKUP_BUCKET == azure://* ]]; then
            # Azure Blob Storage
            CONTAINER=$(echo "$BACKUP_BUCKET" | sed 's|azure://||')
            log "Uploading to Azure Blob Storage..."
            if ! az storage blob upload --container-name "$CONTAINER" \
                --file "${BACKUP_DIR}/${BACKUP_FILE_GZ}" \
                --name "database/${BACKUP_FILE_GZ}"; then
                log_error "Azure upload failed"
                send_alert "Azure upload failed for ${ENVIRONMENT}"
                exit 1
            fi
        else
            log_warning "Unknown cloud provider, storing locally only"
        fi

        log_success "Backup uploaded successfully"
    fi

    # Step 4: Manage backup retention
    if [ -n "$BACKUP_BUCKET" ] && [[ $BACKUP_BUCKET == s3://* ]]; then
        log "Managing backup retention (${BACKUP_RETENTION} days)..."
        CUTOFF_DATE=$(date -d "${BACKUP_RETENTION} days ago" +%Y%m%d)

        # List and delete old backups
        aws s3 ls "${BACKUP_BUCKET}/database/" | while read -r line; do
            BACKUP_NAME=$(echo "$line" | awk '{print $4}')
            BACKUP_DATE=$(echo "$BACKUP_NAME" | grep -oP '\d{8}')

            if [ -n "$BACKUP_DATE" ] && [ "$BACKUP_DATE" -lt "$CUTOFF_DATE" ]; then
                log "Deleting old backup: ${BACKUP_NAME}"
                aws s3 rm "${BACKUP_BUCKET}/database/${BACKUP_NAME}"
            fi
        done
    fi

    # Step 5: Create backup metadata
    cat > "${BACKUP_DIR}/backup_metadata.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "environment": "${ENVIRONMENT}",
  "backup_file": "${BACKUP_FILE_GZ}",
  "size": "${COMPRESSED_SIZE}",
  "database_host": "$(echo $DATABASE_URL | sed -E 's/.*@([^:/]+).*/\1/')",
  "bucket": "${BACKUP_BUCKET}",
  "retention_days": ${BACKUP_RETENTION}
}
EOF

    if [ -n "$BACKUP_BUCKET" ] && [[ $BACKUP_BUCKET == s3://* ]]; then
        aws s3 cp "${BACKUP_DIR}/backup_metadata.json" \
            "${BACKUP_BUCKET}/database/latest_${ENVIRONMENT}.json"
    fi

    # Success summary
    log "=================================================="
    log_success "Backup completed successfully!"
    log "Backup file: ${BACKUP_FILE_GZ}"
    log "Size: ${COMPRESSED_SIZE}"
    log "Location: ${BACKUP_BUCKET:-local}"
    log "=================================================="

    # Send success notification (optional)
    if [ -n "$SLACK_WEBHOOK_URL" ] && [ "$SEND_SUCCESS_NOTIFICATIONS" = "true" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Database backup completed successfully for ${ENVIRONMENT} (${COMPRESSED_SIZE})\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Run main function
main

exit 0
