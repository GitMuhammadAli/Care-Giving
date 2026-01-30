# CareCircle

A comprehensive caregiving coordination platform that helps families manage care for their loved ones together, in real-time.

## The Problem We Solve

> "Dad fell last Tuesday and was in ER. My sister didn't know for 6 hours because we're in different time zones. His medication list was in Mom's email, his doctor's contact was in my phone, and the insurance card was at his house."

**CareCircle solves:**
- Family members in different states/time zones
- Multiple doctors, medications, appointments - no central tracking
- Scattered information across emails, phones, documents
- Missed appointments, double-booked caregivers
- Medication errors and missed doses
- Hours-long delays in critical communication

## Features

### 🚨 Emergency Alerts
One-tap alerts notify your entire family instantly. Everyone knows within minutes, not hours.

### 💊 Medication Tracking
Never miss a dose. Reminders, logging, refill alerts, and adherence tracking keep medications on track.

### 📅 Appointment Calendar
Track doctor visits, therapy sessions, and more. Assign transport responsibility.

### 👥 Family Coordination
Invite unlimited family members. Role-based access keeps everyone informed.

### 📁 Document Vault
Secure storage for insurance cards, medical records, and legal documents.

### 📊 Health Timeline
Track vitals, moods, incidents, and activities. See patterns over time.

### 👤 Caregiver Scheduling
Manage shifts, check-ins/outs, and handoff notes between caregivers.

### 📱 Mobile PWA
Installable on any device, works offline for emergency info.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, TailwindCSS, Zustand |
| **Backend** | NestJS, TypeORM, PostgreSQL |
| **Real-time** | Socket.io, Web Push |
| **Queue** | BullMQ, Redis |
| **Storage** | Cloudinary / AWS S3 |
| **Email** | Mailtrap (dev) / Resend (prod) |
| **Database** | Neon (Serverless Postgres) with automatic backups |
| **Monitoring** | Prometheus metrics, Sentry error tracking |

## Production Features

### 🔒 Enterprise-Ready
- **Automated Backups**: Neon DB provides automatic daily backups with Point-in-Time Recovery (PITR)
- **High Availability**: 99.95% uptime SLA with instant failover
- **Disaster Recovery**: RTO < 5 minutes, RPO < 1 minute
- **Security**: AES-256 encryption at rest, TLS 1.3 in transit
- **Compliance**: HIPAA-ready audit logging and access controls

### 📊 Monitoring & Observability
- Health check endpoints (`/health`, `/health/ready`, `/health/live`)
- Prometheus metrics endpoint (`/metrics`)
- Sentry-ready error tracking
- Comprehensive audit logging

### 🚀 DevOps
- CI/CD pipeline with GitHub Actions
- Automated testing (unit + E2E)
- Security scanning (npm audit, dependency checks)
- K6 performance testing
- Docker containerization
- Kubernetes deployment ready

For complete backup and disaster recovery procedures, see [BACKUP_PROCEDURES.md](docs/operations/BACKUP_PROCEDURES.md).

## Quick Start

See [SETUP.md](./SETUP.md) for complete setup instructions.

```bash
# Clone & Install
git clone <repository-url>
cd carecircle
pnpm install

# Option A: Local Development (with Docker)
docker compose up -d      # Start PostgreSQL, Redis, RabbitMQ
pnpm dev                  # Auto-detects LOCAL → starts all services

# Option B: Cloud Development (no Docker needed)
pnpm dev                  # Auto-detects CLOUD → connects to Neon, Upstash, CloudAMQP
```

That's it! The dev server **automatically detects** which environment to use based on running services.

## Environment Management

CareCircle uses a **profile-based layered configuration** system with auto-detection:

```
env/
├── base.env      ← Shared config (app settings, JWT, etc.)
├── local.env     ← Local Docker services (localhost)
└── cloud.env     ← Cloud services (Neon, Upstash, CloudAMQP)
```

### Auto-Detection (Default)

When you run `pnpm dev`, it automatically:
1. Checks if PostgreSQL, Redis, and RabbitMQ are running locally
2. Selects **LOCAL** profile if all services are up, otherwise **CLOUD**
3. Merges `base.env + profile.env` → `.env`
4. Shows the active profile in the banner: `[LOCAL]` or `[CLOUD]`

```
╔══════════════════════════════════════════════════════════════════════╗
║   🔍 Environment Auto-Detection                                     ║
╚══════════════════════════════════════════════════════════════════════╝

Checking local Docker services...

  ✓ PostgreSQL (localhost:5432)
  ✓ Redis (localhost:6379)
  ✓ RabbitMQ (localhost:5672)

✓ All local services running → LOCAL profile
```

### Manual Control

```bash
# Force a specific profile
pnpm dev --local          # Force LOCAL profile
pnpm dev --cloud          # Force CLOUD profile
pnpm dev --skip-env       # Skip detection, use existing .env

# Switch profile without starting server
pnpm env:local            # Switch to LOCAL
pnpm env:cloud            # Switch to CLOUD
pnpm env:check            # Check current profile
pnpm env:auto             # Auto-detect and switch

# PowerShell scripts (legacy)
.\scripts\use-local.ps1   # Switch to LOCAL
.\scripts\use-cloud.ps1   # Switch to CLOUD
```

### When to Use Each Profile

| Profile | Use When | Services |
|---------|----------|----------|
| **LOCAL** | Docker running, offline dev, full control | PostgreSQL, Redis, RabbitMQ on localhost |
| **CLOUD** | No Docker, quick start, team collaboration | Neon DB, Upstash Redis, CloudAMQP |

## Development Commands

```bash
# Full-stack development
pnpm dev                  # Auto-detect env + start all services

# Individual services
pnpm dev:api              # API server only (port 4000)
pnpm dev:web              # Web app only (port 4173)
pnpm dev:workers          # Background workers only

# Database
pnpm db:migrate           # Run migrations (production)
pnpm db:migrate:dev       # Run migrations (development)
pnpm db:studio            # Open Prisma Studio
pnpm db:generate          # Generate Prisma client

# Testing & Quality
pnpm test                 # Run all tests
pnpm lint                 # Lint all packages
pnpm build                # Build all packages
```

## Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost:4173 | Next.js frontend |
| API Server | http://localhost:4000/api/v1 | REST API |
| Swagger Docs | http://localhost:4000/api | Interactive API docs |
| Workers Health | http://localhost:4001/health | Background job status |
| RabbitMQ UI | http://localhost:15672 | Message queue (guest/guest) |
| Mailpit | http://localhost:8025 | Email testing (LOCAL only) |

## Project Structure

```
carecircle/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/     # Authentication
│   │   │   ├── user/     # User management
│   │   │   ├── family/   # Family & invites
│   │   │   ├── care-recipient/
│   │   │   ├── medications/
│   │   │   ├── appointments/
│   │   │   ├── documents/
│   │   │   ├── emergency/
│   │   │   ├── caregiver-shifts/
│   │   │   ├── timeline/
│   │   │   ├── notifications/
│   │   │   ├── gateway/  # WebSocket
│   │   │   └── system/   # Core utilities
│   │   └── ...
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # App router pages
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   └── ...
│   └── workers/          # Background jobs
├── packages/
│   └── database/         # Shared types
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Phase A: Complete ✅

- [x] Setup (Monorepo, Docker, TypeORM)
- [x] Database Schema (All entities)
- [x] Auth & Family Invites
- [x] Care Recipients
- [x] Calendar & Appointments
- [x] Medications
- [x] Document Vault
- [x] Emergency Dashboard
- [x] Caregiver Scheduling
- [x] Health Timeline
- [x] Real-time & Notifications
- [x] Dashboard UI
- [x] Mobile PWA
- [x] Landing Page

## Phase B: Enterprise Features

- [ ] HIPAA Compliance
- [ ] Analytics Dashboard
- [ ] AI Insights
- [ ] Telehealth Integration
- [ ] Pharmacy Integration
- [ ] Multi-tenant Support

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for caregivers everywhere.
