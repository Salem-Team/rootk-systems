# ROOTK Internal HR System

Premium employee management portal for **ROOTK Systems**, with a full NestJS + Prisma + PostgreSQL API under `backend/`.

Dual-mode data layer:

- **local** — LocalStorage + repositories + seeded demo data
- **api** (default in `.env.example`) — HttpClient → NestJS REST (`src/api/*` → `backend/`)

## Stack

**Frontend**

- Next.js 15 (App Router) · TypeScript
- Tailwind CSS v4 · shadcn/ui · Lucide
- Framer Motion · Recharts · TanStack Table
- React Hook Form · Zod · Zustand · next-themes · Sonner

**Backend** (`backend/`)

- NestJS · Prisma · PostgreSQL 16 · JWT

## Modules (frontend routes)

| Route | Description |
| --- | --- |
| `/login` | Branded entry — choose Admin or Employee |
| `/dashboard` | KPIs, charts, activities, announcements |
| `/attendance` | Check-in / check-out, timeline, history |
| `/employees` | Directory with search, filters, profiles |
| `/schedule` | Working days, hours, WFH, holidays |
| `/leave` | Leave requests with approve / reject |
| `/tasks` | Work tasks & meetings |
| `/payroll` | Payroll dashboard, policies, payslips |
| `/reports` | Attendance analytics & export UI |
| `/settings` | Company, org, appearance, notifications |
| `/portal` | Employee self-service portal |

## Getting started (frontend)

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend (Nest + Prisma + Postgres)

```bash
cp backend/.env.example backend/.env

# Postgres: Docker OR local Homebrew (see backend/README.md)
npm run docker:db   # optional if Docker is available

cd backend && npm install
npm run db:setup    # generate + migrate/push + seed
npm run start:dev
```

API base: [http://localhost:3001/api](http://localhost:3001/api)

Demo login: `admin@rootk.systems` / `Rootk@2026`

Details: [backend/README.md](./backend/README.md)

## Switch frontend → API

```env
# .env.local
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_COMPANY_ID=cmp_rootk_001
```

Full contract: [docs/BACKEND_INTEGRATION.md](./docs/BACKEND_INTEGRATION.md)

## Architecture

```
src/                   # Next.js frontend
  api/                 # REST clients (api mode)
  services/            # UI façade (local | api switch)
  repositories/        # LocalStorage repos (local mode)
backend/               # NestJS API + Prisma + docker-compose
docs/
  BACKEND_INTEGRATION.md
  prisma/schema.prisma # reference copy of backend schema
```

## Scripts (root)

- `npm run dev` — Next.js (Turbopack)
- `npm run build` / `start` / `lint`
- `npm run smoke` — readiness smoke checks (files + dual-mode + Nest modules)
- `npm run docker:db` — start Postgres
- `npm run api:dev` — Nest watch mode (after `cd backend && npm install`)
- `npm run api:prisma` — Prisma generate + push + seed
