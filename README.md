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
# Clone
git clone <repository-url>
cd carecircle

# Install
pnpm install

# Setup environment
cp env.example .env
# Edit .env with your config

# Start services (if using Docker)
docker-compose up -d

# Run migrations
cd apps/api && pnpm run migration:run

# Start development
pnpm dev
```


# Switch to local profile (generates .env files)
.\scripts\use-local.ps1

# Start Docker services
docker compose up -d

# Start all apps
pnpm dev:api      # API on :3001
pnpm dev:web      # Web on :3000
pnpm dev:workers  # Background workers

## Access Points

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API Server | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api |
| Mailpit (dev) | http://localhost:8025 |

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
