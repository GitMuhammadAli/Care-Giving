FROM postgres:16-alpine

# Install dependencies
RUN apk add --no-cache \
    aws-cli \
    curl \
    bash \
    tzdata

# Set timezone
ENV TZ=UTC

# Copy backup scripts
COPY scripts/backup-database.sh /usr/local/bin/backup-database
COPY scripts/restore-database.sh /usr/local/bin/restore-database

RUN chmod +x /usr/local/bin/backup-database /usr/local/bin/restore-database

# Create log directory
RUN mkdir -p /var/log && touch /var/log/carecircle-backup.log

WORKDIR /backups

# Default command runs backup
CMD ["backup-database", "production"]
