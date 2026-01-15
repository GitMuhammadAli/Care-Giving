#!/bin/bash

###############################################################################
# CareCircle Backup Monitoring Script
#
# This script checks if backups are running successfully and alerts on issues
#
# Usage:
#   ./monitor-backups.sh
#
# Checks:
# 1. Last backup age (should be < 25 hours)
# 2. Backup file existence
# 3. Backup file size (should be > 1MB)
# 4. Cloud storage availability
###############################################################################

set -e

ENVIRONMENT="${1:-production}"
MAX_BACKUP_AGE_HOURS=25
MIN_BACKUP_SIZE_MB=1
ALERT_WEBHOOK="${SLACK_WEBHOOK_URL}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

send_alert() {
    local severity="$1"
    local message="$2"

    if [ -n "$ALERT_WEBHOOK" ]; then
        local emoji="⚠️"
        [ "$severity" = "critical" ] && emoji="🚨"
        [ "$severity" = "ok" ] && emoji="✅"

        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${emoji} Backup Monitor: ${message}\"}" \
            "$ALERT_WEBHOOK" 2>/dev/null || true
    fi
}

check_last_backup() {
    log "Checking last backup age..."

    if [ -z "$BACKUP_BUCKET" ]; then
        log_warning "BACKUP_BUCKET not set, skipping check"
        return 0
    fi

    if [[ $BACKUP_BUCKET == s3://* ]]; then
        # Get latest backup metadata
        METADATA=$(aws s3 cp "${BACKUP_BUCKET}/database/latest_${ENVIRONMENT}.json" - 2>/dev/null || echo "{}")

        if [ "$METADATA" = "{}" ]; then
            log_error "No backup metadata found"
            send_alert "critical" "No backup metadata found for ${ENVIRONMENT}"
            return 1
        fi

        LAST_BACKUP_TIME=$(echo "$METADATA" | jq -r '.timestamp')
        LAST_BACKUP_EPOCH=$(date -d "${LAST_BACKUP_TIME:0:8} ${LAST_BACKUP_TIME:9:2}:${LAST_BACKUP_TIME:11:2}:${LAST_BACKUP_TIME:13:2}" +%s 2>/dev/null || echo 0)
        CURRENT_EPOCH=$(date +%s)
        HOURS_AGO=$(( (CURRENT_EPOCH - LAST_BACKUP_EPOCH) / 3600 ))

        if [ $HOURS_AGO -gt $MAX_BACKUP_AGE_HOURS ]; then
            log_error "Last backup is ${HOURS_AGO} hours old (max: ${MAX_BACKUP_AGE_HOURS})"
            send_alert "critical" "Last backup for ${ENVIRONMENT} is ${HOURS_AGO} hours old!"
            return 1
        else
            log_success "Last backup is ${HOURS_AGO} hours old"
        fi
    fi

    return 0
}

check_backup_size() {
    log "Checking backup file size..."

    if [ -z "$BACKUP_BUCKET" ] || [[ ! $BACKUP_BUCKET == s3://* ]]; then
        log_warning "Backup size check skipped (S3 only)"
        return 0
    fi

    LATEST_BACKUP=$(aws s3 ls "${BACKUP_BUCKET}/database/" | grep "${ENVIRONMENT}" | sort | tail -n1 | awk '{print $4}')

    if [ -z "$LATEST_BACKUP" ]; then
        log_error "No backup files found"
        send_alert "critical" "No backup files found for ${ENVIRONMENT}"
        return 1
    fi

    BACKUP_SIZE_BYTES=$(aws s3 ls "${BACKUP_BUCKET}/database/${LATEST_BACKUP}" | awk '{print $3}')
    BACKUP_SIZE_MB=$(( BACKUP_SIZE_BYTES / 1024 / 1024 ))

    if [ $BACKUP_SIZE_MB -lt $MIN_BACKUP_SIZE_MB ]; then
        log_error "Backup file too small: ${BACKUP_SIZE_MB}MB (min: ${MIN_BACKUP_SIZE_MB}MB)"
        send_alert "critical" "Backup file for ${ENVIRONMENT} is suspiciously small: ${BACKUP_SIZE_MB}MB"
        return 1
    else
        log_success "Backup size: ${BACKUP_SIZE_MB}MB"
    fi

    return 0
}

check_cloud_storage() {
    log "Checking cloud storage connectivity..."

    if [ -z "$BACKUP_BUCKET" ]; then
        log_warning "BACKUP_BUCKET not set"
        return 0
    fi

    if [[ $BACKUP_BUCKET == s3://* ]]; then
        if ! aws s3 ls "$BACKUP_BUCKET" > /dev/null 2>&1; then
            log_error "Cannot access S3 bucket"
            send_alert "critical" "Cannot access backup bucket for ${ENVIRONMENT}"
            return 1
        else
            log_success "S3 bucket accessible"
        fi
    fi

    return 0
}

main() {
    log "=================================================="
    log "CareCircle Backup Monitoring"
    log "Environment: ${ENVIRONMENT}"
    log "=================================================="

    FAILURES=0

    check_last_backup || ((FAILURES++))
    check_backup_size || ((FAILURES++))
    check_cloud_storage || ((FAILURES++))

    log "=================================================="

    if [ $FAILURES -eq 0 ]; then
        log_success "All backup checks passed!"
        send_alert "ok" "All backup checks passed for ${ENVIRONMENT}"
        exit 0
    else
        log_error "${FAILURES} backup check(s) failed"
        exit 1
    fi
}

main
