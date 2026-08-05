# Backend Integration Guide

The frontend is dual-mode: **local** (default demo) and **api** (NestJS + Prisma + PostgreSQL).

The Nest API scaffold lives in [`backend/`](../backend/). See [`backend/README.md`](../backend/README.md) for Docker + Prisma commands.

Target backend stack:

| Layer | Technology |
| --- | --- |
| API | NestJS (REST under `/api`) — `backend/` |
| ORM | Prisma — `backend/prisma/schema.prisma` |
| DB | PostgreSQL 16 — `backend/docker-compose.yml` |
| Auth | JWT access + refresh |

## Switch to API mode

1. Start Postgres + Nest (see `backend/README.md`)
2. Copy root `.env.example` → `.env.local`
3. Set:

```env
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_COMPANY_ID=cmp_rootk_001
```

4. Restart `npm run dev`

## Architecture

```
UI / stores / hooks
  → services/*                 (stable contract: ApiResponse<T>)
      ├─ local → repositories → LocalStorageAdapter
      └─ api   → src/api/* → HttpClient → NestJS → Prisma → PostgreSQL
```

**Rules**

- UI and stores talk only to **services**.
- Never import `src/api/*` from components.
- Domain Zod schemas in `src/schemas/*` mirror Nest DTO validation.
- Entity shapes live in `src/types/*` and must match Prisma models (see `docs/prisma/schema.prisma`).
- List GETs use `api.getList` which accepts bare arrays **or** `{ items, total, page, pageSize, totalPages }`.
- Audit timestamps / nested entities are normalized via `src/lib/api-adapters.ts` inside `src/api/http.ts`.

## Auth contract

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/auth/demo-login` | `{ role }` | Used by current login UI |
| POST | `/auth/login` | `{ email, password }` | Ready via `signInWithCredentials` |
| POST | `/auth/refresh` | `{ refreshToken }` | Auto-called on 401 |
| POST | `/auth/logout` | — | Bearer required |
| GET | `/auth/me` | — | Hydrated on boot in API mode |

Expected login response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "employeeId": "...",
      "email": "...",
      "role": "admin",
      "initials": "NA",
      "nameKey": "user.adminFullName",
      "firstNameKey": "user.adminFirstName",
      "isActive": true,
      "companyId": "cmp_rootk_001"
    },
    "role": "admin",
    "tokens": {
      "accessToken": "<jwt>",
      "refreshToken": "<jwt>"
    }
  }
}
```

Recommended JWT claims: `sub`, `role`, `companyId`, `employeeId`.

## Domain routes

Canonical list: `src/api/routes.ts`.

### Core HR
- Employees: `GET/POST /employees`, `GET/PATCH/DELETE /employees/:id`, `PATCH /employees/:id/status`, `GET /employees/:id/profile-extras`
- Attendance: `GET /attendance`, `GET /attendance/me/today`, `POST /attendance/check-in|check-out`
- Leave: `GET/POST /leave`, `PATCH /leave/:id/approve|reject`, `DELETE /leave/:id`
- Schedule: `GET/PATCH /schedule`, `GET/POST/DELETE /schedule/holidays`
- Settings: `GET/PATCH /settings`

### Work hub
- `GET/POST /work/tasks`, `GET/PATCH/DELETE /work/tasks/:id`, `PATCH /work/tasks/:id/status`
- `PATCH /work/tasks/:id/sub-items/:subId`
- `GET/POST /work/meetings`, `PATCH/DELETE /work/meetings/:id`

### Org
- `GET/PUT/DELETE /org/locations`
- `GET/PUT/DELETE /org/positions`
- `GET/PUT/DELETE /org/shifts`
- `GET /org/approvals`, `PATCH /org/approvals/:id`

### Payroll
- `GET /payroll/dashboard`
- `GET/PATCH /payroll/policies`
- `GET /payroll/rules`, `PATCH /payroll/rules/:id/toggle`
- `POST /payroll/runs/advance`
- `GET /payroll/reports`
- `GET /payroll/payslips`, `GET /payroll/payslips/:employeeId(+ /history)`
- `GET /payroll/salary-profiles/:employeeId`

### Notifications & preferences
- `GET/POST /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`
- `GET/PUT /users/:id/preferences`, `POST /users/:id/preferences/ensure`
- `GET /preferences/employees`

### Dashboard / reports / demo / health
- `GET /dashboard/stats|summary`, `GET /reports/weekly|monthly`
- `GET /activities`, `GET /announcements`
- `POST /demo/reset|generate`, `DELETE /demo`
- `GET /health/live|ready`

## Response envelope

Prefer:

```json
{ "success": true, "data": {}, "message": "optional" }
```

Errors (Nest style) are mapped automatically:

| Status | Frontend error |
| --- | --- |
| 400 | ValidationError |
| 401 | UnauthorizedError → sign-out |
| 403 | ForbiddenError |
| 404 | NotFoundError |
| 409 | ConflictError |

Bare JSON payloads (without envelope) are also accepted and wrapped as `{ success: true, data }`.

Lists may return either:

- bare arrays: `Employee[]`
- or paginated: `{ items, total, page, pageSize, totalPages }`

Use `api.getList()` / `unwrapList()` — list clients already unwrap.

## Headers

Every request sends:

- `Authorization: Bearer <accessToken>` (when present)
- `X-Company-Id: <companyId>` (env fallback; prefer JWT claim in Nest)
- `X-Client: rootk-hr-web`
- `Content-Type: application/json` (mutations)

## Prisma / PostgreSQL alignment

Reference schema: [`docs/prisma/schema.prisma`](./prisma/schema.prisma)

| Frontend | Prisma |
| --- | --- |
| `id` | `@id @default(cuid())` |
| `employeeId` (HR code) | `Employee.employeeCode` (map in Nest serializer) |
| `manager` | `Employee.managerName` |
| `companyId` | tenant FK + index |
| `createdAt` / `updatedAt` | `DateTime` → ISO strings over the wire |
| `createdBy` / `updatedBy` | `String?` user ids |
| `deletedAt` | soft delete (`DateTime?`) |
| `isArchived` | `Boolean @default(false)` |
| `version` | optimistic concurrency `Int` |
| `metadata` | `Json` |

Date helpers: `src/lib/api-adapters.ts` (applied in `http.ts`).

### Notifications ownership

In **local** mode the frontend emits inbox events after leave/attendance/work mutations.
In **API** mode Nest must create equivalent `AppNotification` rows (or call `POST /notifications`) — the web client will not double-emit domain notifications after API mutations.

## NestJS checklist

- [ ] Implement every path in `src/api/routes.ts`
- [ ] Prisma migrate from `docs/prisma/schema.prisma` (adapt as needed)
- [ ] JWT access + refresh; `/auth/me` returns current user
- [ ] Scope all queries by `companyId` from JWT (ignore spoofed headers for writes)
- [ ] Soft-delete filters (`deletedAt: null`) on default finds
- [ ] Return ISO-8601 strings for dates (or class-transformer `@Transform`)
- [ ] CORS allow `http://localhost:3000`
- [ ] Global validation pipe with class-validator DTOs matching Zod schemas
- [ ] Exception filter returning Nest `{ statusCode, message, error }`
- [ ] Pagination query `page` / `pageSize` (or cursor) on list endpoints
- [ ] `GET /employees/:id/profile-extras` returns `EmployeeProfileExtras`
- [ ] Domain notification producers for leave / attendance / work

## Frontend readiness status

| Domain | Dual-mode service | API client | Nest + Prisma |
| --- | --- | --- | --- |
| Auth (+ `/me` hydrate) | ✅ | ✅ | ✅ seeded users |
| Employees CRUD + status + profile-extras | ✅ | ✅ | ✅ |
| Attendance / Leave | ✅ | ✅ | ✅ |
| Schedule / Settings / Dashboard | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ |
| Work tasks & meetings | ✅ | ✅ | ✅ |
| Org (locations/positions/shifts/approvals) | ✅ | ✅ | ✅ |
| Payroll | ✅ | ✅ | ✅ policies JSON (+ payslip stubs) |
| User preferences | ✅ | ✅ | ✅ |
| Health live/ready | ✅ | ✅ | ✅ |

Flip `NEXT_PUBLIC_DATA_SOURCE=api` after `npm run docker:db` + `npm run api:prisma` + `npm run api:dev`.
