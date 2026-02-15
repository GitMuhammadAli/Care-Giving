# CareCircle

A comprehensive, AI-powered caregiving coordination platform that helps families manage care for their loved ones together, in real-time.

**Live Demo** — log in and explore every feature instantly:

| | URL |
|--|-----|
| **Web App** | [carecircle.vercel.app](https://carecircle.vercel.app) |
| **API** | [carecircle-api.onrender.com](https://carecircle-api.onrender.com) |
| **Demo Login** | `demo@carecircle.com` / `Demo1234!` |

> The demo account is pre-loaded with a family, care recipient, medications, appointments, timeline entries, caregiver shifts, documents, and notifications. Profile/password changes are blocked — register your own account for full access.

---

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

### 🤖 AI-Powered Features (Google Gemini)
- **Care Summaries** — Daily/weekly AI-generated summaries with highlights, concerns, and recommendations
- **Smart Data Entry** — Describe events in natural language ("Mom's BP was 130/80 this morning, she ate oatmeal") and AI parses them into structured timeline entries
- **Ask AI (RAG)** — Ask questions about your care recipient's history and get answers grounded in their actual data via vector search (pgvector)
- **Graceful Degradation** — If AI is unavailable or rate-limited, all features fall back to basic non-AI responses; the app never breaks

### 📱 Mobile PWA
Installable on any device, works offline for emergency info.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, TailwindCSS, Zustand |
| **Backend** | NestJS, Prisma ORM, PostgreSQL |
| **AI** | Google Gemini 2.0 Flash (text), Gemini Embedding 001 (vectors), pgvector |
| **Real-time** | Socket.io, Web Push |
| **Queue** | BullMQ, Redis |
| **Email** | Mailtrap (dev) / Resend (prod) |
| **Database** | PostgreSQL — Docker (local) / Neon Serverless (prod) |
| **Cache** | Redis — Docker (local) / Upstash (prod) |
| **Message Broker** | RabbitMQ — Docker (local) / CloudAMQP (prod) |
| **Hosting** | Vercel (frontend), Render (API), Neon (database) |
| **Monitoring** | Sentry error tracking, structured logging (pino) |

## Production Features

### 🔒 Security
- JWT authentication with httpOnly cookie refresh tokens
- Role-based access control (Admin / Member per family)
- Demo user protection — guard + service-level defense-in-depth
- Rate limiting on all sensitive endpoints (`@nestjs/throttler`)
- AES-256 encryption at rest, TLS in transit

### 📊 Monitoring & Observability
- Health check endpoints (`/api/v1/health`)
- Sentry error tracking
- Structured JSON logging (pino)
- Comprehensive audit logging

### 🚀 Deployment
- **Free-tier stack** — Render (API) + Vercel (Web) + Neon (DB) + Upstash (Redis) + CloudAMQP (RabbitMQ)
- Zero-downtime deploys via Render auto-deploy from `main`
- Database schema sync and demo seeding run automatically during build
- Docker Compose for local development

## Quick Start

See [SETUP.md](./SETUP.md) for complete setup instructions.

```bash
# Clone & Install
git clone https://github.com/GitMuhammadAli/Care-Giving.git
cd Care-Giving
pnpm install

# Option A: Local Development (with Docker)
docker compose up -d      # Start PostgreSQL (pgvector), Redis, RabbitMQ
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema to local DB
pnpm db:seed:demo         # Seed demo user with full data
pnpm dev                  # Auto-detects LOCAL → starts all services

# Option B: Cloud Development (no Docker needed)
pnpm dev                  # Auto-detects CLOUD → connects to Neon, Upstash, CloudAMQP
```

The dev server **automatically detects** which environment to use based on running services.

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
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema (no migration history)
pnpm db:migrate           # Run migrations (production)
pnpm db:migrate:dev       # Run migrations (development)
pnpm db:studio            # Open Prisma Studio
pnpm db:seed:demo         # Seed demo user with pre-populated data

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
│   │   │   ├── ai/       # Gemini AI (summaries, smart entry, RAG, embeddings)
│   │   │   ├── auth/     # Authentication (JWT, OAuth)
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
│   │   │   ├── chat/     # Real-time messaging
│   │   │   ├── gateway/  # WebSocket
│   │   │   └── system/   # Guards, decorators, helpers, config
│   │   └── ...
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # App router pages
│   │   │   ├── components/
│   │   │   │   ├── ai/   # AI panels (ask-ai, care-summary, smart-entry)
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   └── ...
│   └── workers/          # Standalone background workers (scaled deployments)
├── packages/
│   ├── database/         # Prisma schema, migrations, seed scripts
│   └── logger/           # Shared structured logger (pino)
├── env/                  # Environment profiles (base, local, cloud)
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Roadmap

### Phase A: Complete

- [x] Monorepo setup (pnpm workspaces + Turborepo)
- [x] Database schema (Prisma + PostgreSQL)
- [x] Auth & family invites
- [x] Care recipients
- [x] Calendar & appointments
- [x] Medications with logging
- [x] Document vault
- [x] Emergency dashboard
- [x] Caregiver scheduling
- [x] Health timeline
- [x] Real-time notifications (WebSocket + push)
- [x] Dashboard UI
- [x] Mobile PWA
- [x] Landing page
- [x] AI features (Care Summaries, Smart Entry, Ask AI / RAG)
- [x] Demo user with full seed data
- [x] Free-tier cloud deployment (Render + Vercel + Neon)

### Phase B: Enterprise Features

- [ ] HIPAA compliance
- [ ] Analytics dashboard
- [ ] Telehealth integration
- [ ] Pharmacy integration
- [ ] Multi-tenant support

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
