# CareCircle Setup Guide

Complete setup instructions for running the CareCircle caregiving coordination platform.

## Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose (for local services)
- Git

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd carecircle
pnpm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp env.example .env
```

### 3. Option A: Cloud Services (Recommended for Development)

Sign up for free tiers of these services:

| Service | Free Tier | Sign Up |
|---------|-----------|---------|
| **Neon** (PostgreSQL) | 512MB storage, always free | [neon.tech](https://neon.tech) |
| **Upstash** (Redis) | 10K commands/day | [upstash.com](https://upstash.com) |
| **CloudAMQP** (RabbitMQ) | 1M messages/month | [cloudamqp.com](https://www.cloudamqp.com) |
| **Cloudinary** (Storage) | 25GB storage | [cloudinary.com](https://cloudinary.com) |
| **Mailtrap** (Email) | 500 emails/month | [mailtrap.io](https://mailtrap.io) |

Update your `.env` with the connection strings from these services.

### 3. Option B: Local Docker Services

Start PostgreSQL, Redis, RabbitMQ, MinIO, and Mailpit locally:

```bash
docker-compose up -d
```

Default local `.env` values:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carecircle
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://carecircle:carecircle_dev@localhost:5672/carecircle
```

**RabbitMQ Management UI**: http://localhost:15672 (user: carecircle, pass: carecircle_dev)

### 4. Run Migrations

```bash
cd apps/api
pnpm run migration:run
```

### 5. Seed Database (Optional)

```bash
cd apps/api
pnpm run seed:run
```

### 6. Generate VAPID Keys (For Push Notifications)

```bash
npx web-push generate-vapid-keys
```

Add the generated keys to your `.env`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:admin@carecircle.com
```

### 7. Start Development

```bash
# From root directory
pnpm dev
```

This starts:
- **Web App**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api
- **RabbitMQ UI**: http://localhost:15672 (if using Docker)

## Environment Variables

### Required

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/carecircle

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Optional (For Full Features)

```env
# Storage (Cloudinary)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Email (Mailtrap for dev, Resend/Brevo for prod)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
MAIL_FROM=noreply@carecircle.com

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@carecircle.com

# Error Tracking (Optional)
SENTRY_DSN=
```

## Default Credentials

After seeding:
- **Email**: admin@carecircle.com
- **Password**: Admin@123

⚠️ **Change these in production!**

## Project Structure

```
carecircle/
├── apps/
│   ├── api/          # NestJS backend
│   ├── web/          # Next.js frontend
│   └── workers/      # Background jobs
├── packages/
│   └── database/     # Shared types
├── docker-compose.yml
├── pnpm-workspace.yaml
└── env.example
```

## Available Scripts

```bash
# Development
pnpm dev              # Start all apps
pnpm dev:web          # Start web only
pnpm dev:api          # Start API only

# Build
pnpm build            # Build all apps
pnpm build:web        # Build web only
pnpm build:api        # Build API only

# Database
pnpm --filter @carecircle/api migration:run     # Run migrations
pnpm --filter @carecircle/api migration:revert  # Revert last migration
pnpm --filter @carecircle/api seed:run          # Seed database

# Testing
pnpm test             # Run all tests
pnpm lint             # Lint all apps
```

## Architecture Highlights

### Backend (NestJS)
- **TypeORM** with PostgreSQL
- **JWT authentication** with cookies
- **RBAC** with roles and permissions
- **WebSocket** for real-time updates
- **BullMQ** for background jobs
- **Web Push** for notifications

### Frontend (Next.js 14)
- **App Router** with server components
- **React Query** for data fetching
- **Zustand** for state management
- **PWA** with offline support
- **Socket.io** client for real-time

### Real-time Features
- Emergency alerts (instant push to all family)
- Medication reminders with snooze/complete
- Shift handoff notifications
- Live "who's on duty" indicator
- Timeline updates from family members

### Offline Support
- Emergency info cached locally
- Medication schedule cached
- Queue actions when offline
- Auto-sync when back online

## Development Guidelines

### API Endpoints Pattern
```
GET    /care-recipients/:id/medications
POST   /care-recipients/:id/medications
GET    /medications/:id
PATCH  /medications/:id
POST   /medications/:id/log
```

### Adding a New Module

1. Create entity in `apps/api/src/<module>/entity/`
2. Create repository in `apps/api/src/<module>/repository/`
3. Create service in `apps/api/src/<module>/service/`
4. Create controller in `apps/api/src/<module>/`
5. Create DTOs in `apps/api/src/<module>/dto/`
6. Register in module and app.module.ts
7. Generate migration: `pnpm --filter @carecircle/api migration:generate`

## Deployment

### Docker Production Build

```bash
# Build images
docker build -t carecircle-api -f apps/api/Dockerfile .
docker build -t carecircle-web -f apps/web/Dockerfile .

# Or use docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment for Production

```env
NODE_ENV=production
DATABASE_URL=<production-postgres-url>
REDIS_URL=<production-redis-url>
JWT_SECRET=<strong-production-secret>
FRONTEND_URL=https://your-domain.com
```

## Production Checklist

- [ ] Change default admin credentials
- [ ] Set strong JWT_SECRET (min 64 characters)
- [ ] Enable SSL for database connection
- [ ] Configure proper CORS origins
- [ ] Set up Sentry for error tracking
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure CDN for static assets
- [ ] Enable HTTPS
- [ ] Review security headers

## Troubleshooting

### Database Connection Error
- Check DATABASE_URL format
- Ensure PostgreSQL is running
- Verify network access (firewall, etc.)

### Redis Connection Error
- Check REDIS_URL format
- Ensure Redis is running
- For Upstash, check TLS settings

### Push Notifications Not Working
- Verify VAPID keys are set
- Check browser supports notifications
- Ensure HTTPS in production

### WebSocket Connection Failed
- Check FRONTEND_URL is correct
- Verify CORS settings
- Check firewall allows WebSocket

## Support

For issues, please check:
1. GitHub Issues
2. Documentation at `/docs`
3. Swagger API docs at `/api`

---

Built with ❤️ for caregivers everywhere.
