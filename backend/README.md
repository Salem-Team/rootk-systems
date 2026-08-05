# ROOTK HR API (NestJS + Prisma + PostgreSQL)

Backend companion for the Next.js frontend in the repo root.

## Stack

- NestJS 11 (REST under `/api`)
- Prisma 6 → PostgreSQL 16/17
- JWT access + refresh (`passport-jwt`) with hashed refresh tokens in Postgres
- Role guards on admin mutations (settings, schedule, leave approve, payroll)

## Quick start

### 1) PostgreSQL

**Option A — Docker** (requires Docker Desktop):

```bash
# from repo root
npm run docker:db
```

**Option B — local Homebrew Postgres** (used when Docker is unavailable):

```bash
# create role + database once
createuser -s rootk || true
psql -d postgres -c "ALTER USER rootk WITH PASSWORD 'rootk' LOGIN CREATEDB;"
createdb -O rootk rootk_hr || true
```

Connection string (already in `backend/.env.example`):

```env
DATABASE_URL=postgresql://rootk:rootk@localhost:5432/rootk_hr?schema=public
```

### 2) Install, migrate, seed, run

```bash
cp backend/.env.example backend/.env

cd backend
npm install
npm run db:setup           # prisma generate + db push + seed
# or versioned: npm run prisma:migrate
npm run start:dev
```

API: [http://localhost:3001/api](http://localhost:3001/api)

Health:

- `GET /api/health/live`
- `GET /api/health/ready` (requires Postgres)

From repo root you can also use:

```bash
npm run api:install
npm run api:prisma
npm run api:dev
```

## Wire the frontend

In root `.env.local`:

```env
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_COMPANY_ID=cmp_rootk_001
```

Then restart Next (`npm run dev` from repo root).

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/demo-login` | `{ "role": "admin" \| "employee" }` — JWT from seeded users |
| POST | `/api/auth/login` | email + password (`Rootk@2026`) |
| POST | `/api/auth/refresh` | refresh token (rotated, stored hashed) |
| POST | `/api/auth/logout` | Bearer required — revokes refresh tokens |
| GET | `/api/auth/me` | Bearer required — loads user from Postgres |

Seeded accounts:

- `admin@rootk.systems` / `Rootk@2026` (admin)
- `employee@rootk.systems` / `Rootk@2026` (employee)

## Domain routes (Prisma-backed)

Controllers mirror `../src/api/routes.ts` and persist via `PrismaService`:

- Employees (+ profile-extras)
- Attendance (check-in / check-out with work-time settlement + WFH policy)
- Leave (create / approve / reject / cancel + attendance `on_leave` sync)
- Schedule + holidays + WFH metadata
- Settings (company profile + notification policy)
- Notifications (inbox + domain producers)
- Users + preferences
- Work tasks & meetings
- Org (locations / positions / shifts / approvals)
- Dashboard / reports / activities / announcements
- Payroll (policies, rules, salary profiles, payslip generation from attendance)
- Demo reset / generate

Canonical contract: [../docs/BACKEND_INTEGRATION.md](../docs/BACKEND_INTEGRATION.md)

## Prisma

- Schema: `backend/prisma/schema.prisma` (keep in sync with `docs/prisma/schema.prisma`)
- Migrations: `backend/prisma/migrations/`
- Seed: `backend/prisma/seed.ts`

```bash
npm run db:setup
# or
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Response shape

Success responses are wrapped as:

```json
{ "success": true, "data": {} }
```

Nest HTTP errors stay as `{ statusCode, message, error }` (mapped by the frontend HttpClient).
