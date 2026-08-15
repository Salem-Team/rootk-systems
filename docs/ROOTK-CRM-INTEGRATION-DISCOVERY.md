# ROOTK CRM — Integration Discovery & Architecture Audit

**Status:** Discovery complete. **No implementation. No schema changes. No new APIs. No new permissions.**  
**Scope:** Read-only reverse engineering of `/Users/salem/Desktop/projects/rootk-systems`  
**Date:** 2026-08-15  
**Purpose:** Understand the existing system before any phone-contacts or call-log integration.

Every claim below is backed by repository evidence. Items that cannot be confirmed from source are marked **UNKNOWN — requires confirmation**.

---

## 1. Executive Summary

Rootk is **not a standalone CRM product**. It is an **internal HR + operations platform** (`rootk-systems` / backend package `rootk-hr-api`) with a **lead-pipeline CRM module** attached.

The current CRM is **lead-centric**:

- There is **no Contact model**, **no Deal model**, **no Call model**, **no CRM Task model**, and **no Follow-up table**.
- A lead **is** the person + the opportunity: `name`, single `phone`, single `email`, `companyName`, pipeline `stageId`, owner, follow-up fields.
- “Calls” are **not telephony**. They are either (a) a `CrmLeadActivity` with `type = call`, or (b) a `CrmLeadFeedback` row whose `callAnswered` boolean is counted as Active vs Inactive call in analytics.
- Click-to-call is a **browser `tel:` / `wa.me` link**. Clicking it does **not** create an activity, capture duration, or know incoming vs outgoing vs missed.
- There is **no native mobile app**, no Capacitor, no React Native, no Flutter, no PWA/service worker, no Firebase/FCM, no call-log plugin.
- Auth is **JWT Bearer** (access 1d hardcoded + hashed refresh tokens). Tenant = **`Company`**. RBAC is a permission catalog + per-user overrides.
- The mobile phone-contacts / call-log product must be a **native client of this existing API**, not a second CRM.

**Safest future shape:** Capacitor (or equivalent) wrapper around the existing web app + a thin native bridge that (1) never bulk-uploads the device address book, (2) matches numbers on-device against existing leads, (3) writes call outcomes into the **existing** `POST /api/crm/leads/:id/feedback` and `POST /api/crm/leads/:id/activities` paths, (4) prompts the user after a dialer return because iOS cannot read cellular call logs.

---

## 2. Current Architecture

```
Rootk Systems
├── Next.js 15 App Router  (src/)          port 3010 / 3000
│     UI → src/services/* only
│     Dual-mode: NEXT_PUBLIC_DATA_SOURCE = local | api
│       local → LocalStorage repositories + mocks
│       api   → src/api/* → HttpClient → Nest
│
├── NestJS 11 API          (backend/)      port 3001, global prefix /api
│     Controllers → Services → Prisma → PostgreSQL 16
│     Global: JwtAuthGuard + PermissionsGuard
│     Envelope: { success, data } / { success: false, code, statusCode }
│
└── PostgreSQL 16 (Docker: backend/docker-compose.yml)
      Database name: rootk_hr
      Tenant column: companyId on nearly every table
```

**Evidence:** `package.json` (Next 15.5.19, React 19.1.0), `backend/package.json` (Nest `^11.0.0`, Prisma `^6.0.0`), `backend/src/main.ts` (prefix `api`, port 3001), `README.md`, `src/lib/env.ts`, `.cursor/rules/clean-code.mdc` (UI must not import `src/api/*`).

**What this system is *not*:**

| Pattern | Evidence it does not exist |
|---|---|
| Laravel / Eloquent / PHP | No `app/Models`, no `composer.json` |
| Redis / Bull / queues | No `bull`, `ioredis`, `@nestjs/bull` in `backend/package.json`; grep empty |
| Nest EventEmitter / `@OnEvent` | No matches in `backend/` |
| Webhooks | No webhook controllers/routes |
| Cache layer | No `cache-manager` / Redis |
| GraphQL | REST only |
| Socket.IO / realtime CRM | No socket dependency |
| Multi-region / SaaS signup | Login binds to `DEFAULT_COMPANY_ID` (`backend/src/auth/auth.service.ts`) |

**Request flow today (web CRM):**

```
User (browser)
  → Next.js page src/app/(app)/crm/page.tsx
  → hooks (useCrmHub / useCrmLeadSheet / …)
  → src/services/crm/*  (isApiMode() branch)
  → src/api/crm.api.ts → src/lib/http-client.ts
      Authorization: Bearer <JWT>
      X-Company-Id: env.companyId   ← sent by client, NOT read by Nest
  → Nest @Controller("crm")
  → CrmService façade → domain services
  → Prisma
  → PostgreSQL
  → optional: CrmLeadHistoryEvent, CrmLeadActivity, HR Activity, AppNotification
  → ResponseInterceptor wraps { success: true, data }
  → UI timeline / performance / notification popover
```

**Evidence that Nest ignores `X-Company-Id`:** frontend sets it in `src/lib/http-client.ts` and `src/components/providers/api-bootstrap-provider.tsx`. Grep of `backend/` for `X-Company-Id` / `x-company-id` = **zero matches**. Tenant comes from JWT via `@CompanyId()` (`backend/src/common/tenant.ts`).

---

## 3. Technology Stack

| Layer | Technology | Version / notes | Evidence |
|---|---|---|---|
| Frontend framework | Next.js App Router | **15.5.19** | root `package.json` |
| UI library | React | **19.1.0** | root `package.json` |
| Styling | Tailwind CSS v4, Radix/shadcn, Lucide | Tailwind 4 | `package.json`, `src/app/layout.tsx` |
| Tables / charts | TanStack Table 8, Recharts 3 | | `package.json` |
| Forms / validation (FE) | react-hook-form, Zod | `src/schemas/crm.schema.ts` | FE only — Nest CRM has **no class-validator DTOs** |
| Client state | Zustand + persist (`rootk-session`) | `src/stores/session-store.ts` | |
| i18n | Custom `src/i18n/locales/{ar,en}.ts` | | |
| Backend | NestJS | **^11.0.0** | `backend/package.json` |
| ORM | Prisma | **^6.0.0** | `backend/prisma/schema.prisma` |
| Database | PostgreSQL 16 Alpine | `rootk_hr` | `backend/docker-compose.yml` |
| Auth | `@nestjs/jwt` + `passport-jwt` | Bearer access JWT 1d hardcoded; refresh JWT + `RefreshToken.tokenHash` | `backend/src/auth/auth.module.ts`, schema |
| Password hash | Node `scrypt$salt$hash` | `backend/src/auth/password.util.ts` | not bcrypt |
| HTTP contract | `{ success, data }` | `backend/src/common/interceptors/response.interceptor.ts` | |
| API prefix | `/api` | `backend/src/main.ts` | |
| Frontend API origin | `NEXT_PUBLIC_API_BASE_URL` default `http://localhost:3001/api` | `src/lib/env.ts` | |
| Deploy | **No Dockerfile for the app.** Postgres only in Docker. Frontend likely Vercel-style (`public/vercel.svg`) but **UNKNOWN — no vercel.json**. | |

Default frontend data source is **`api`** (`process.env.NEXT_PUBLIC_DATA_SOURCE ?? "api"` in `src/lib/env.ts`). README still describes local demo; `.env.example` sets `NEXT_PUBLIC_DATA_SOURCE=api`.

---

## 4. Current Business Logic

Rootk CRM, as implemented, is a **sales-lead tracker for internal employees**, not a full CRM graph.

**What a salesperson can do today:**

1. Create a lead (name + phone required).
2. Own it (or be assigned it if they have `crm.assignLeads`).
3. Move it through configurable pipeline stages (default 9: New Lead → … → Won/Lost).
4. Schedule a next action + follow-up datetime on the lead.
5. After talking to the person, open **Add Feedback**: answered / no-answer, notes, optional stage change, optional next meeting (online/offline).
6. See dashboard KPIs, delay (overdue follow-ups), pipeline kanban (read-only), activities feed, feedback list, performance (if permitted), reports (if permitted).
7. Click phone → OS dialer or WhatsApp. **Manual** feedback afterwards.

**What they cannot do today (confirmed missing):**

- Store a Contact independently of a Lead.
- Convert a lead into a Deal / Account / Contact.
- Detect duplicate phones.
- Record call duration, direction, or missed-call automatically.
- See a merged timeline of activities + feedback + history (timeline API returns activities only).
- Use CRM from a native mobile app.
- Receive device push for follow-ups (in-app only; category `schedule`).

---

## 5. Leads Architecture

### 5.1 Model

**Finding:** Leads live in Prisma model `CrmLead`.  
**Evidence:** `backend/prisma/schema.prisma` lines 1308–1355; frontend type `src/types/crm.ts` `export interface CrmLead`.

Required fields: `name`, `phone`, `stageId`, `companyId`.  
Optional / defaulted: `email` (`""`), `companyName` (`""`), `businessTypeId`, `source` (enum, default `other`), `ownerEmployeeId` (plain **string, no FK to Employee**), `subStageId`, `status` (default `active`), `tags[]`, `nextAction` (default `none`), `nextFollowUpAt`, `lastActivityAt`, `lossReasonTypeId`, `notes`, `convertedAt`.

Soft delete: `deletedAt`, `isArchived`, `status: archived`.  
Optimistic-looking `version` column exists; **no conflict-resolution protocol** uses it on write (last write wins).

**No unique index on `phone`.** Duplicate phones are allowed.

### 5.2 Creation

**Flow:**

```
CrmLeadFormSheet → useCrmLeadForm → createCrmLead
  API: POST /api/crm/leads
  Nest: CrmController.createLead → CrmLeadCreateService.createLead
```

**Evidence:** `backend/src/crm/crm-lead-create.service.ts`.

- Capability: `assertCap(actor, "create")` → permission `crm.createLeads`.
- `name` and `phone` required; phone is `String(body.phone).trim()` only — **no E.164**.
- If actor cannot `assign`, `ownerEmployeeId` is forced to `actor.employeeId`.
- Default stage = first active stage.
- Side effects: `CrmLeadHistoryEvent` action `lead_created`; `CrmLeadActivity` type `created`; HR `Activity` type `crm_lead_created`.

### 5.3 Assignment / ownership

- Field: `CrmLead.ownerEmployeeId` (string). **No Prisma relation to `Employee`.**
- Changing owner on PATCH requires `crm.assignLeads` (`assertCap assign`).
- Bulk `{ action: "assign" }` also requires assign (`backend/src/crm/crm-leads.service.ts`).
- History: `lead_assigned` / `lead_reassigned`; activity type `assignment`.

Employees without `crm.viewOthersLeads` **and** `dataAccess.viewOtherUsers` only see their own `ownerEmployeeId` (`scopeOwnerFilter` in `backend/src/crm/crm-shared.service.ts`).

### 5.4 Lifecycle — status vs stages vs conversion

Two independent axes:

| Axis | Values | Meaning |
|---|---|---|
| `status` | `active` \| `inactive` \| `archived` | Record state, not sales stage |
| `stage.category` | `open` \| `won` \| `lost` \| `other` | Pipeline outcome |

Default stages (`backend/src/crm/crm-defaults.ts`):

1. New Lead (open, 10%)  
2. Contacted (open, 20%)  
3. Qualified (open, 35%)  
4. Interested (open, 50%)  
5. Meeting (open, 60%)  
6. Proposal (open, 70%)  
7. Negotiation (open, 80%)  
8. Won (won, 100%)  
9. Lost (lost, 0%)

**Conversion:** moving to a stage with `category === won` sets `convertedAt = now` and keeps `status = active` (`applyStageSideEffects` in `crm-shared.service.ts`). Lost requires `lossReasonTypeId`. Open clears `convertedAt`.

**There is no Convert-to-Deal / Convert-to-Contact API or UI.** Dashboard “converted” = won-category leads.

### 5.5 Duplicate detection

**Does not exist for CRM.**

Create/import does not look up existing phones. Contrast: Organic Ads has `findDuplicate` / `AdStatus.duplicate` — unrelated.

Grep of `backend/src/crm` for `duplicate` / phone uniqueness = empty.

### 5.6 List / search / filters

`GET /api/crm/leads` query: `page`, `pageSize`, `sort` (`createdAt|updatedAt|name|nextFollowUpAt|lastActivityAt`), `order`, `search`, `stageId`, `subStageId`, `status`, `source`, `ownerEmployeeId`, `tag`, `followUp` (`today|upcoming|overdue|none`).

Search is `contains` on `name|phone|email|companyName` (`crm-leads-query.ts`). `010` will **not** match stored `+2010…` unless the stored string contains those characters.

### 5.7 Import / export

- `POST /api/crm/leads/import` — max 500 rows (`CRM_IMPORT_MAX_ROWS`). Gated by **`create`**, not catalog permission `crm.importLeads`.
- `GET /api/crm/leads/export` — gated by **`view`**, not `crm.exportLeads`.

Each import row calls create independently → duplicate phones possible.

### 5.8 Delete

Soft-delete. Owner may delete without `crm.deleteLeads`; others need `delete` (`crm-leads.service.ts`).

---

## 6. Contacts Architecture

**Finding: there is no Contact system.**

Searched `model Contact`, `CrmContact`, `export interface Contact` across Prisma + `src/types` → **zero CRM contact entities**.

Person data lives **on the lead**:

| Field | Cardinality | Notes |
|---|---|---|
| `CrmLead.phone` | **one string** | Required. No `phones[]`. |
| `CrmLead.email` | **one string** | Default `""`. |
| `CrmLead.companyName` | string | Not an Account/Organization CRM entity. `OrgModule` is **HR** org (locations/depts). |
| `CrmLead.businessTypeId` | optional FK | Industry catalog only. |

Employee phones (`Employee.phone`) and company settings phone are **HR**, not CRM contacts.

**Contact-to-lead / contact-to-deal relationships:** **do not exist** (no Contact, no Deal).

**Implication for phone-book integration:** importing a phone contact must become a **Lead** (or a *new* Contact model, which would be a schema change — not present today). Reusing leads is the only zero-schema path.

---

## 7. Activities Architecture

### 7.1 CRM activities (`CrmLeadActivity`)

**Evidence:** schema lines 1357–1380; `backend/src/crm/crm-activities.service.ts`; type `src/types/crm.ts`.

Fields: `leadId`, `type` (`CrmActivityType`), `title`, `description`, `actorEmployeeId`, `occurredAt`, plus mixin audit columns. **No duration, no direction, no phone number, no outcome enum.** Frontend type allows optional `meetingMode` / `meetingLocation` on activities; Prisma activity model does **not** have those columns (they live on **feedback**).

`CrmActivityType` enum: `call | whatsapp | email | meeting | note | stage_change | assignment | feedback | follow_up | status_change | created | other`.

**Create path:** `POST /api/crm/leads/:id/activities`  
Gated by **edit own lead** (`assertCanEditLead`), **not** `crm.logActivities` (catalog ID exists but is unused at HTTP/service layer).

Auto-created on: lead create, stage change, assignment, status change, feedback.

### 7.2 Timeline

`GET /api/crm/leads/:id/timeline` loads activities **and** feedback **and** history, then **returns only activities**. Comment in `crm-activities.service.ts` lines 90–92: history/feedback “remain available via dedicated endpoints.” There is **no public history list endpoint**. UI sheet tab “timeline” shows activities only.

`crm.viewAudit` is catalog-only — never asserted in CRM services.

### 7.3 Feedback (`CrmLeadFeedback`) — the real “call log”

**Evidence:** schema 1382–1414.

This is how communication is actually scored:

- `callAnswered` boolean — comment in schema: `true = answered call (Active), false = no answer (Inactive)`.
- `nextAction`, `nextFollowUpAt`
- `meetingMode` (`online|offline`) and `meetingLocation` (`our_company|client_company`) when next action is meeting
- `customerFeedback`, `notes`
- `recordedByEmployeeId`

`POST /api/crm/leads/:id/feedback` also patches the lead (`nextAction`, `nextFollowUpAt`, optional `stageId`, tags) and writes an activity titled `Feedback: answered|no_answer`.

**UI:** `src/components/crm/crm-feedback-form.tsx` — primary dialog from the lead sheet.

Dead UI: `CrmLeadActivityDialog` / `CrmLeadFollowUpDialog` in `crm-lead-quick-dialogs.tsx` are **not imported** elsewhere.

### 7.4 Follow-ups

**Not a table.** Encoded as `CrmLead.nextFollowUpAt` + `CrmLead.nextAction`.

Filters: Delay hub tab uses `followUp=overdue`. Reminders: in-process `setInterval(60_000)` in `CrmFollowUpRemindersService` — leads with follow-up in the next 15 minutes, one-shot via `metadata.followUpReminderSentFor`. Not Redis/Bull. **Poller WHERE is not company-scoped** (it selectors all companies, then notifies using each row’s `companyId`).

Local-mode frontend has a parallel poller: `src/services/crm/crm-follow-up-reminders.service.ts` (API mode relies on Nest).

### 7.5 Tasks & Work meetings (HR — not CRM)

- `WorkTask` / `GET|POST /api/work/tasks` — operations tasks. **No `leadId`.**
- `WorkMeeting` / `GET|POST /api/work/meetings` — employee meetings. **No `leadId`.** Fields: date, startTime, endTime, organizerId, participantIds.

Do **not** reuse Work meetings as CRM call/meeting records without a new FK — they are a different domain.

### 7.6 How activities affect lead state

| Event | Lead fields updated |
|---|---|
| Any `writeLeadActivity` | `lastActivityAt`, `version++` |
| Feedback | `nextAction`, `nextFollowUpAt`, `lastActivityAt`, optional stage/`convertedAt`/tags |
| Stage change | `stageId`, `convertedAt`, possibly `lossReasonTypeId`; disconnects sub-stage |
| Assignment | `ownerEmployeeId` |

Feedback is the only path that records call answered/unanswered and meetings for **performance analytics**.

---

## 8. Call / Communication Architecture

### 8.1 What actually happens today

```
User clicks phone in CrmPhoneActions
        │
        ▼
src/lib/crm/phone-links.ts
  strip non-digits
  if local 0… or 10-digit 1… → prepend Egypt 20
  open tel:+<digits>  OR  https://wa.me/<digits>
        │
        ▼
OS dialer / WhatsApp  (outside the app)
        │
        ▼
NOTHING is written to the database
        │
        ▼
(optional, later) user opens Add Feedback
        │
        ▼
POST /api/crm/leads/:id/feedback
  { callAnswered, customerFeedback, nextAction, nextFollowUpAt, meetingMode?, stageId? }
        │
        ▼
CrmLeadFeedback row + CrmLeadActivity(type=feedback)
+ lead.nextAction / nextFollowUpAt / lastActivityAt
        │
        ▼
Performance / Reports bins Active vs Inactive calls
from feedback rows (crm-interaction-breakdown.ts)
```

**Evidence:** `src/components/crm/crm-phone-actions.tsx` — `<a href={callUrl}>` with no `onClick` logging. `crm-interaction-breakdown.ts` counts **feedback**, not `CrmActivityType.call`.

### 8.2 Incoming / outgoing / missed / duration

| Metadata | Exists today? | Where |
|---|---|---|
| Phone number | Yes, on lead | `CrmLead.phone` — not stored on the activity |
| Incoming vs outgoing | **No** | — |
| Missed | **No** | Inactive = `callAnswered: false` (manual, any “no answer”) |
| Timestamp | Partial | Feedback `createdAt`; activity `occurredAt` (user-optional) |
| Duration | **No column** | — |
| Associated user | Partial | `recordedByEmployeeId` / `actorEmployeeId` / lead owner |
| Associated lead | Yes | `leadId` |
| Associated contact | N/A | no Contact |
| Notes | Yes | feedback `notes` / `customerFeedback`; lead `notes` |
| Call outcome | Partial | boolean answered / no_answer only |

### 8.3 Interaction reports

`buildInteractionBreakdown` (`backend/src/crm/crm-interaction-breakdown.ts`) aggregates feedback into:

- `activeCalls` / `inactiveCalls`
- `meetings` online/offline / our_company / client_company
- by day, by hour, by client

Surfaced in Performance + Reports tabs (`CrmInteractionBreakdownPanel`). Frontend `API_ROUTES.crm.reports` exists; reports UI largely **reuses dashboard data** (frontend agent found no `fetchCrmReports` call). Backend **does** implement `GET /api/crm/reports`.

---

## 9. Database Relationships

**Only relationships that exist in Prisma:**

```
Company
 ├── User  ○─ UserPermissionOverride
 │            UserPreferences
 ├── Employee                    (phone: String? — HR, not CRM)
 ├── AppNotification
 ├── Activity                    (HR company feed)
 ├── WorkTask / WorkMeeting      (HR work — no leadId)
 ├── CrmStage ── CrmSubStage
 ├── CrmFeedbackType
 ├── CrmBusinessType
 └── CrmLead
      ├── CrmLeadActivity        (1:N)
      ├── CrmLeadFeedback        (1:N) ── CrmFeedbackType
      └── CrmLeadHistoryEvent    (1:N)

CrmLead.ownerEmployeeId ──✕── NO FK to Employee
CrmLead.stageId         ──── CrmStage
User.employeeId         ──── optional string (no FK in schema snippet; used in queries)
```

**Does not exist:** Contact, Deal, Call, CrmTask, FollowUp, AuditLog, Tenant, Organization (as CRM account), Device, PushToken, PhoneSyncState.

`CrmLead.version` is incremented on writes; there is no `If-Match` / conflict API.

---

## 10. API Architecture

Global:

- Prefix `/api`
- JWT required except `@Public()` (`/auth/login`, `/auth/refresh`, `/health/live`, `/health/ready`)
- Success envelope `{ success: true, data }`
- Errors `{ success: false, code, statusCode }` via `HttpExceptionFilter`
- ValidationPipe whitelist + `forbidNonWhitelisted` — **but CRM bodies are `Record<string, unknown>`**, so whitelist does not shape CRM payloads
- **No rate limiting**, **no idempotency keys**, **no retry/queue**, **no offline protocol**

### 10.1 CRM endpoints (complete)

Base: `/api/crm`. All require JWT. In-service capability in last column.

| METHOD | ROUTE | HTTP permission decorator | In-service gate | Request (observed) | Response | DB effect | Side effects |
|---|---|---|---|---|---|---|---|
| GET | `/crm/stages` | — | none (any authed; seeds defaults) | — | stages + nested sub-stages | may insert default catalog | — |
| PUT | `/crm/stages` | `crm.manageStages` + `@Roles(admin)` | `manage_stages` | body record | stage | upsert `CrmStage` | history |
| POST | `/crm/stages/reorder` | same | `manage_stages` | body | ok | sortOrder | — |
| DELETE | `/crm/stages/:id` | same | `manage_stages` | `moveToStageId` | ok | soft-delete / move leads | history |
| PUT | `/crm/sub-stages` | `crm.manageStages` | `manage_stages` | body | sub-stage | upsert | — |
| POST | `/crm/sub-stages/reorder` | same | same | body | ok | sortOrder | — |
| DELETE | `/crm/sub-stages/:id` | same | same | — | ok | delete | — |
| GET | `/crm/feedback-types` | — | none | — | list | may seed defaults | — |
| PUT | `/crm/feedback-types` | `crm.manageFeedbackTypes` | `manage_feedback_types` | body | type | upsert | — |
| DELETE | `/crm/feedback-types/:id` | same | same | — | ok | delete | — |
| GET | `/crm/business-types` | — | none | — | list | may seed | — |
| PUT | `/crm/business-types` | `crm.manageBusinessTypes` | `manage_business_types` | body | type | upsert | — |
| DELETE | `/crm/business-types/:id` | same | same | — | ok | delete | — |
| GET | `/crm/leads` | — | `view` + owner scope | filters above | `{ items, total, page, pageSize, totalPages }` | read | — |
| POST | `/crm/leads` | — | `create`; assign or force self | name, phone, … | lead | insert lead | history + activity + HR Activity |
| POST | `/crm/leads/bulk` | — | `edit`; `assign` if assign | `{ action, ids, … }` | results | patch many | history per change |
| POST | `/crm/leads/import` | — | **`create` only** (not `crm.importLeads`) | `{ rows: [...] }` max 500 | per-row results | create N leads | same as create |
| GET | `/crm/leads/export` | — | **`view` only** (not `crm.exportLeads`) | filters | rows | read | — |
| GET | `/crm/leads/:id` | — | `view` + owner scope | — | lead | read | — |
| PATCH | `/crm/leads/:id` | — | `edit` + own unless view-others; `assign` if owner changes | partial | lead | update | history/activity on stage/owner/status |
| DELETE | `/crm/leads/:id` | — | owner **or** `delete` | — | ok | soft-delete | history + HR Activity |
| POST | `/crm/leads/:id/activities` | — | **`edit` / own lead** (not `crm.logActivities`) | `{ title, type?, description?, occurredAt? }` | activity | insert activity; bump `lastActivityAt` | history + HR Activity |
| GET | `/crm/leads/:id/timeline` | — | `view` + owner | — | `CrmLeadActivity[]` only | read | — |
| POST | `/crm/leads/:id/feedback` | — | **`edit` / own** (not `crm.addFeedback`) | callAnswered, nextAction, … | feedback | insert feedback; patch lead | activity `feedback` + history + HR Activity |
| GET | `/crm/dashboard` | — | `view_dashboard` + scope | date bounds | KPIs | read | — |
| GET | `/crm/performance` | — | `view_dashboard` if no others else `view_performance` | date | rows | read | — |
| GET | `/crm/performance/:employeeId` | — | same | — | profile | read | — |
| GET | `/crm/activities` | — | `view` + owner scope on parent lead | page, pageSize | activities | read | — |
| GET | `/crm/feedback` | — | `view` + owner scope | page, leadId, owner, type | feedback[] | read | — |
| GET | `/crm/reports` | — | `view_reports` **or fallback** `view_dashboard` | date | bundle | read | — |

**Missing routes (searched controllers):** `/crm/contacts`, `/crm/deals`, `/crm/calls`, `/crm/meetings`, `/crm/tasks`, `/crm/follow-ups`, `/crm/webhooks`, `/crm/history`, `/crm/sync`, `/crm/devices`.

### 10.2 Auth

| METHOD | ROUTE | Auth | Permission | Effect |
|---|---|---|---|---|
| POST | `/auth/login` | Public | — | JWT access + refresh; **lookup scoped to `DEFAULT_COMPANY_ID`** |
| POST | `/auth/refresh` | Public (body refreshToken) | — | rotate access |
| POST | `/auth/logout` | JWT | — | revoke refresh |
| GET | `/auth/me` | JWT | — | current user |
| POST | `/auth/profile` | JWT | — | update name + **employee phone** (not CRM) |
| POST | `/auth/change-password` | JWT | — | password |
| POST | `/auth/impersonate` | JWT | `settings.impersonateUsers` | new JWT with `impersonatorId` |
| POST | `/auth/stop-impersonate` | JWT | impersonation claim | restore |

**Evidence:** `backend/src/auth/auth.controller.ts`, `auth.module.ts` (`expiresIn: "1d"` hardcoded; env `JWT_EXPIRES_IN` unused).

### 10.3 Users / notifications (reusable for mobile)

| METHOD | ROUTE | Permission |
|---|---|---|
| GET | `/users` | JWT |
| GET | `/users/accounts` | `employees.view` |
| GET | `/users/:id` | JWT |
| GET/PUT | `/users/:id/preferences` | JWT |
| PUT | `/users/:id/login-password` | `employees.resetPassword` |
| GET | `/notifications` | `notifications.viewOwn` |
| POST | `/notifications` | `notifications.sendCompany` |
| PATCH | `/notifications/:id/read` | `notifications.viewOwn` |
| POST | `/notifications/read-all` | `notifications.viewOwn` |

**No device-registration, push-token, or sync endpoints.**

### 10.4 Idempotency / retry / offline / conflict

| Concern | Status |
|---|---|
| Idempotency-Key | **Does not exist** |
| Duplicate activity if client retries POST feedback | **Will insert a second row** |
| Rate limiting | **Does not exist** (grep `throttle`/`rateLimit` empty) |
| Offline queue | **Does not exist** (local mode is LocalStorage demo, not an offline sync engine) |
| Conflict resolution | `version` incremented but **not compared on write** |
| HTTP 409 | used in frontend `ConflictError` type; CRM writes do not emit version conflicts |

---

## 11. Authentication

**Mechanism:** JWT Bearer in `Authorization` header. Not cookie sessions.

**Access token:** signed with `JWT_SECRET` (default `"rootk-dev-secret"` if env missing — **unsafe for production**). Expiry **hardcoded `"1d"`** in `auth.module.ts`. Env `JWT_EXPIRES_IN` is documented in `backend/.env.example` but **not read**.

**Refresh token:** JWT with `jti`; SHA-256 hash stored in `RefreshToken` model (`backend/prisma/schema.prisma` ~885). 7d hardcoded. `JWT_REFRESH_EXPIRES_IN` unused.

**Validate:** `JwtStrategy.validate` reloads User from DB every request (active, not deleted), loads effective permissions, requires employees to have `employeeId`.

**Frontend session:** Zustand persist key `"rootk-session"` stores tokens + user + permissions (`src/stores/session-store.ts`). HttpClient refreshes on 401 then `signOut` → `/login`.

**Login tenant:** `auth.service.ts` `login()` uses `DEFAULT_COMPANY_ID` (`cmp_rootk_001`). **Not a global email lookup.** Multi-company login by email is **not implemented**.

**Demo password:** `Rootk@2026` (`password.util.ts`) for seed only.

---

## 12. RBAC

### 12.1 Model

1. Role `admin | employee` (`User.role`).
2. Catalog defaults: admin = all IDs; employee = `employeeDefault: true` entries.
3. Per-user `UserPermissionOverride` (`companyId, userId, permissionId, granted`).
4. Master data-access switch `dataAccess.viewOtherUsers` **plus** module flag (e.g. `crm.viewOthersLeads`) via `canViewOthersInModule`.

**Evidence:** `backend/src/common/permissions-catalog.ts`; mirrored in `src/constants/permissions.ts`.

### 12.2 CRM permissions (catalog)

| ID | Employee default | Actually enforced on matching endpoint? |
|---|---|---|
| `crm.viewLeads` | true | Yes (`view`) |
| `crm.viewOthersLeads` | false | Yes (needs also `dataAccess.viewOtherUsers`) |
| `crm.createLeads` | true | Yes |
| `crm.editLeads` | true | Yes (and used as stand-in for activities/feedback) |
| `crm.deleteLeads` | false | Partial (owner bypass) |
| `crm.assignLeads` | false | Yes on owner change / bulk assign |
| `crm.bulkEditLeads` | false | **Not checked** (bulk uses `edit`) |
| `crm.importLeads` | false | **Not checked** (uses `create`) |
| `crm.exportLeads` | false | **Not checked** (uses `view`) |
| `crm.manageStages` | false | Yes + `@Roles(admin)` |
| `crm.manageFeedbackTypes` | false | Yes |
| `crm.manageBusinessTypes` | false | Yes |
| `crm.viewDashboard` | true | Yes |
| `crm.viewReports` | false | Yes (with dashboard fallback) |
| `crm.viewPerformance` | false | Yes |
| `crm.viewAudit` | false | **Never asserted; no audit UI** |
| `crm.logActivities` | true | **Never asserted** (uses `edit`) |
| `crm.addFeedback` | true | **Never asserted** (uses `edit`) |

Route gate: `/crm` requires `crm.viewLeads` (`ROUTE_PERMISSIONS`).

### 12.3 Who can see what (current behavior)

| Question | Answer today |
|---|---|
| View contacts | N/A — no contacts. Leads only. |
| View leads | Own leads if lacking view-others; all company leads if both `dataAccess.viewOtherUsers` + `crm.viewOthersLeads` |
| View activities | Same owner scope as parent lead |
| View calls | Same as feedback list (owner-scoped). No Call entity. |
| Create activities | Users with `crm.editLeads` who own the lead (or view-others) |
| Modify activities | **No PATCH activity endpoint** |
| View others’ activities | Only with view-others combo |
| Access CRM reports | `crm.viewReports` or fallback `crm.viewDashboard` |
| Tenant isolation | `companyId` from JWT on every query; login locked to `DEFAULT_COMPANY_ID` |
| Ownership | `ownerEmployeeId` string; no DB FK |

### 12.4 Future phone permissions (NOT created)

Recommended later (do not add now):

- `phone.contacts.read` — on-device contact picker / match
- `phone.contacts.sync` — server-side import of **user-selected** contacts
- `phone.calls.read` — on-device call-log read (Android only, high risk)
- `phone.calls.sync` — upload call metadata to CRM
- `phone.call.initiate` — native dialer from CRM
- `communication.activity.create` — or **reuse** `crm.logActivities` / `crm.addFeedback` once HTTP actually checks them

**Do not invent a parallel permission system.** Extend `PERMISSION_CATALOG` later, in both `backend/src/common/permissions-catalog.ts` and `src/constants/permissions.ts`.

---

## 13. Existing Mobile Architecture

**Finding: there is no mobile application.**

| Question | Answer | Evidence |
|---|---|---|
| Native app? | No | No `android/`, `ios/`, `*.xcodeproj`, `AndroidManifest.xml` |
| Capacitor? | No | No `capacitor.config.*`, no `@capacitor/*` in package.json |
| React Native / Expo? | No | No `react-native` dependency |
| Flutter? | No | No `pubspec.yaml` |
| PWA? | No | `public/` contains only SVGs; no `manifest.json`; no service worker; no `next-pwa` / workbox; viewport exists but `display: standalone` does not |
| WebView wrapper? | No | — |
| Package / application ID? | **Does not exist** | — |
| Native permissions? | None | — |
| Native plugins? | None | — |
| Firebase / FCM / APNs? | No | no `google-services.json`, `GoogleService-Info.plist`, firebase deps |
| Push infrastructure? | **Flag only** | `CompanyNotificationSettings.push: boolean` default true; **no FCM sender**. Frontend copy: “Device push notifications (provider-ready)” |
| Responsive web? | **Yes** | `MOBILE_NAV` in `src/constants/navigation.ts`; `src/components/layout/mobile-nav.tsx`; CRM hub horizontal tabs on small screens; `viewportFit: "cover"`; safe-area padding in AppShell |
| Can native Android APIs be accessed? | **Not from this repo** | Would require a new native shell |

What exists is a **responsive Next.js web app** with a five-item mobile bottom nav: dashboard, attendance, **crm**, tasks, more.

---

## 14. Phone Contacts Feasibility

**Repo status:** no Contacts API, no device storage, no import-from-phone. Frontend Egypt-aware formatting exists only for `tel:`/`wa.me` (`src/lib/crm/phone-links.ts`).

### 14.1 Browser (current product)

| Capability | Possible? |
|---|---|
| Read the device address book | **No** (except user-mediated Contact Picker on **Chrome Android**; not Safari iOS; not desktop) |
| `READ_CONTACTS` | **No** — not a native app |
| Match numbers with CRM | Partial: user types search; server `contains` — **not** normalized |
| Import contacts | Manual CSV `POST /crm/leads/import` (becomes **leads**) |
| Detect duplicates | **No** |
| Sync contact changes | **No** |

### 14.2 Android (requires a future native app)

| Capability | Possible? | Requires |
|---|---|---|
| Read contacts | Yes | `READ_CONTACTS` + user grant; or `ACTION_PICK` (one-shot, no permission for full dump) |
| Match with CRM | Yes | native normalize + `GET /crm/leads?search=` **or a new digits-search API** |
| Import selected | Yes | map to `POST /crm/leads` (today) |
| Detect duplicates | Needs new server logic | canonical phone |
| Sync changes | Possible but high privacy risk | background sync + account adapter; **not recommended as default** |

Play policy: a full address-book upload is a privacy and store-review risk. Prefer **picker / on-device match**.

### 14.3 iOS (requires a future native app)

| Capability | Possible? | Notes |
|---|---|---|
| Read contacts | Yes, with `NSContactsUsageDescription` + `CNContactStore` | Limited vs Android; user can grant limited access (iOS 18+) |
| Contact picker (`CNContactPicker`) | Yes | No full-book permission needed |
| Background sync of all contacts | Restricted | Apple review + user expectation |
| Match / import selected | Yes | Same CRM APIs |

### 14.4 Separation of concerns

| | Browser | Native app |
|---|---|---|
| Possible without native code | `tel:`, `wa.me`, Contact Picker (Chrome Android only), manual form/CSV | — |
| Requires native code | — | full book, background sync, Android call log |
| Requires user permission | Contact Picker is user-initiated | `READ_CONTACTS` / Privacy - Contacts |
| Cannot be done from a browser | full address book, reliable iOS contacts, call logs | — |
| Requires a mobile application | yes for real contacts+calls | yes |

---

## 15. Call Logs Feasibility

The **current architecture can store a human-logged call outcome** (`CrmLeadFeedback.callAnswered` + activity). It **cannot** store duration, direction, or missed-call automatically.

Desired flow vs today:

```
Incoming (desired)                         Today
Phone rings                         →      not observed
App records metadata                →      no app
Number extracted                    →      N/A
Match CRM                           →      N/A
Create Call Activity                →      N/A
Timeline                            →      N/A

Outgoing (desired)                         Today
User taps Call in CRM               →      exists (tel:)
Dialer opens                        →      exists
Call result/duration available      →      NOT captured
CRM records Activity                →      NOT automatic; optional later Feedback
```

### 15.1 Metadata capture (future)

| Field | Android native | iOS native | Browser today |
|---|---|---|---|
| Number | CallLog.Calls.NUMBER with `READ_CALL_LOG` | **Not available** for cellular Phone.app | Only the number already on the lead |
| Incoming/outgoing | `TYPE_INCOMING` / `OUTGOING` | Not for cellular | Unknown |
| Missed | `TYPE_MISSED` / `REJECTED` | Not for cellular | Unknown |
| Timestamp | DATE | Not for cellular | Feedback createdAt if user logs |
| Duration | DURATION seconds | Not for cellular | **No field in DB** |
| Associated user | the logged-in device user | same | JWT user |
| Lead/Contact match | after normalize | after normalize if user logs | if they open that lead |
| Notes | user | user | feedback notes |
| Outcome | inferred + user | user prompt only | `callAnswered` boolean |

**iOS limitation (platform, not this repo):** Third-party apps **cannot read the system Phone call history**. CallKit `CXCallObserver` can observe that *a* call started/ended while the app is alive but **does not provide the remote phone number** for cellular calls. Duration/missed-number sync like Android is **not possible** without becoming the dialer/VoIP app.

**Android limitation (policy, not API):** `READ_CALL_LOG` is a **restricted permission** on Google Play. Default-dialer / core-functionality exception is hard to get for a CRM companion. Safer design: **do not sync the whole call log**; prompt after returning from `tel:` (`resume` event) and let the user confirm outcome — optionally fill duration **if** the permission is granted and Play policy allows.

### 15.2 Can current APIs support the integration?

**Reuse without schema (limited):**

- After a call, `POST /api/crm/leads/:id/feedback` with `callAnswered`.
- Or `POST /api/crm/leads/:id/activities` with `type: "call"` (not counted in call KPIs today — **analytics ignore activity type `call`**).

**Schema gaps if we want real call logs:** duration, direction, missed, externalCallId (idempotency), source (`manual|android_call_log|ios_prompt`), phoneNormalized, deviceId.

**Do not create a second Call product.** Extend `CrmLeadFeedback` and/or `CrmLeadActivity.metadata` later if approved.

---

## 16. Android Analysis

**In this repository:** no Android project, no Gradle, no applicationId, no permissions manifest.

**If a native shell is added later (not implemented):**

| Topic | Assessment |
|---|---|
| WebView / Capacitor | Natural fit: wrap existing Next.js (`NEXT_PUBLIC_DATA_SOURCE=api`) |
| Auth | Reuse JWT in Capacitor Preferences / Secure Storage; same `/auth/login` |
| READ_CONTACTS | Standard; user prompt |
| READ_CALL_LOG | API exists; **Play restricted** |
| PROCESS_OUTGOING_CALLS | Deprecated/restricted |
| Role of Default Phone app | Would unlock call log + overlay; **huge product/policy cost** — not recommended as v1 |
| Match CRM | Need canonical digits locally + better search API |
| Initiate calls | `tel:` already works; native `ACTION_CALL` needs `CALL_PHONE` (optional) |
| After-call return | `App.resume` / Capacitor `appStateChange` → prompt feedback (works **without** call log) |

---

## 17. iOS Analysis

**In this repository:** no Xcode project, no bundle id, no Info.plist permissions.

**If a native shell is added later:**

| Topic | Assessment |
|---|---|
| Contacts | `NSContactsUsageDescription`; prefer `CNContactPickerViewController` |
| Call log | **Cannot read Phone.app history** |
| Dial | `tel:` / `telprompt:` |
| After-call | App resume → **always prompt**; never auto-import iOS call DB |
| Push | APNs requires Apple Developer + backend FCM/APNs — **not present** |
| Background fetch of calls | **Not available** for cellular logs |

---

## 18. Synchronization Architecture

**Finding: there is no sync subsystem.**

| Mechanism | Present? |
|---|---|
| Device registry | No |
| Sync cursor / checkpoint | No |
| Offline outbox | No (local mode = demo storage, not outbox) |
| Webhooks | No |
| Queues / workers | No (only in-process follow-up `setInterval`) |
| Conflict / CRDT | No (`version` unused for compare-and-swap) |
| Idempotent upsert by phone | No |
| Push-driven sync | No |

**Live reload on web:** frontend `useLiveReload` + `CRM_UPDATED_EVENT` every ~40s (`use-crm-hub.ts`). This is polling, not sync.

**For a future native client, replace-nothing: add** a server-side idempotent write path (e.g. `clientMutationId` / `externalCallId` unique per company) and an on-device outbox. Do not sync the entire address book.

---

## 19. Security & Privacy Analysis

### 19.1 Tenant isolation

- Almost every table has `companyId`.
- Runtime isolation: JWT `companyId` via `@CompanyId()`.
- Login is **single-tenant env** (`DEFAULT_COMPANY_ID`). True multi-tenant SaaS login is **not implemented**.
- Follow-up poller reads due leads **across all companies** then notifies by row `companyId` — isolation of *writes/notifications* is preserved; query is cross-tenant internally.

### 19.2 User isolation

`scopeOwnerFilter`: without view-others, queries constrain `ownerEmployeeId`. `assertCanEditLead` extra-checks owner on writes.

**Gap:** `GET /crm/stages` (and other catalogs) is unscoped by CRM capability — any authenticated user of the company can list stages.

### 19.3 Encryption

| Data | Protection |
|---|---|
| Passwords | scrypt (`password.util.ts`) |
| Refresh tokens | SHA-256 hash at rest |
| JWT | HMAC secret; default secret in code if env missing |
| CRM phones, notes, feedback | **Postgres plaintext** — no column encryption |
| TLS | **UNKNOWN — requires confirmation** (no reverse-proxy config in repo) |

Grep for `encrypt` / AES / at-rest = empty in backend.

### 19.4 Audit / retention / deletion / export

| Concern | CRM reality |
|---|---|
| Audit logs | `CrmLeadHistoryEvent` (no list API); HR `Activity` types `crm_*` on dashboard feed |
| Access logging | **No** dedicated access log for who viewed a lead |
| Retention | Notifications `retentionDays` default 90 (`notification-policy.ts`). **No CRM retention/purge** |
| Deletion | Soft-delete on leads/activities/feedback (`deletedAt`) |
| Data export | `GET /crm/leads/export` (rows of leads, permission actually `view`) |
| GDPR dump / right-to-be-forgotten | **Does not exist** |

### 19.5 Privacy risks if phone contacts / call logs were uploaded

| Risk | Why |
|---|---|
| Address-book exfiltration | Device contacts include family, doctors, unrelated numbers — **not CRM data** |
| Call log is highly sensitive | Reveals communication graph, timestamps, duration |
| Cross-user leakage | View-others admins would see imported personal contacts if stored as company leads |
| Retention forever | Soft-delete only; no CRM purge |
| Duplicate blow-up | No phone unique + import creates new leads |
| Play / App Store rejection | `READ_CALL_LOG` / bulk contacts |
| Egypt PDPL / employer monitoring | Logging personal calls on a work phone needs policy + consent — **UNKNOWN legally; requires confirmation** |

**Privacy-first rule (design, not implemented):** do not upload the address book or raw call log. Match on-device. Upload **only** user-confirmed CRM events (selected contact → lead, or confirmed call outcome). Store canonical E.164, not the whole vCard.

---

## 20. Existing Components We Can Reuse

| Component | Location | Purpose today | Reuse? | Why | Required changes later |
|---|---|---|---|---|---|
| JWT auth | `backend/src/auth/*`, FE session store | Login/refresh/me | **Yes** | Mobile must be another client of the same IdP | Secure storage; maybe shorter-lived tokens; **do not fork auth** |
| RBAC catalog | `permissions-catalog.ts` | Grants | **Yes** | Same employees | Optionally add phone.* IDs; **fix unused CRM perms** |
| `CrmLead` | Prisma + `/api/crm/leads` | Person + opportunity | **Yes — primary entity** | There is no Contact | Decide: contact import = new lead vs new model |
| `POST /crm/leads/:id/feedback` | `crm-activities.service.ts` | Manual call outcome | **Yes — primary write for calls** | Already drives KPIs | Add duration/direction in metadata later; idempotency |
| `POST /crm/leads/:id/activities` | same | Timeline notes/calls | **Yes** | Timeline UI already reads this | Wire dead activity dialog or native prompt; analytics currently ignore `type=call` |
| `GET /crm/leads?search=` | `crm-leads-query.ts` | Find lead by name/phone contains | **Partial** | Matching entry point | Normalization / last-N-digits search |
| `phone-links.ts` + `CrmPhoneActions` | `src/lib/crm/phone-links.ts` | Dial / WhatsApp | **Yes** | Existing UX | Hook `app resume` → feedback; optional native dialer |
| `CrmFeedbackForm` | `src/components/crm/crm-feedback-form.tsx` | After-call form | **Yes** | Perfect post-call prompt | Trigger from native bridge |
| Interaction breakdown | `crm-interaction-breakdown.ts` | Call stats | **Yes** | Existing reports | Will under-count until writes go through **feedback**, not only activities |
| Follow-up reminders | `CrmFollowUpRemindersService` | In-app 15-min ping | **Yes** | Notification path | Needs real push later; add `crm` category |
| `AppNotification` | Prisma + `/api/notifications` | In-app inbox | **Yes** | Existing FE popover | Device tokens + FCM outdoors of this module |
| Owner scoping | `crm-shared.service.ts` | Tenant + owner | **Yes** | Prevents seeing others’ leads | Native sync must honor same filters |
| Dual-mode services | `src/services/crm/*` | local vs api | **Do not reuse for mobile offline** | LocalStorage is demo, not sync | Real outbox later |
| Work tasks/meetings | `/api/work/*` | HR tasks | **No for call logs** | No `leadId`; different domain | — |
| Organic Ads duplicate engine | organic-ads | Ad URL dupes | **Pattern only** | Not phone | Could inspire duplicate matching |
| Responsive `/crm` hub | `src/app/(app)/crm/page.tsx` | Web CRM | **Yes as WebView UI** | Avoid rewriting CRM | Capacitor wrap |
| HttpClient + refresh | `src/lib/http-client.ts` | REST | **Yes** | Already production-shaped | — |
| Egypt phone helper | `toInternationalPhoneDigits` | tel/wa | **Partial** | Client-only | Promote to shared server canonicalizer |

---

## 21. Missing Components

Only items that are actually absent after this investigation:

1. Native application shell (Capacitor/Android/iOS) and application IDs  
2. Native permissions UX (`READ_CONTACTS`, iOS usage strings; optionally `READ_CALL_LOG`)  
3. Contact Picker / on-device matcher  
4. Canonical phone normalization **on the server** (E.164 / Egypt national)  
5. Duplicate detection on `CrmLead.phone`  
6. Contact entity (only if product insists on Contacts ≠ Leads)  
7. Call metadata fields: duration, direction, missed, external id  
8. Automatic activity on `tel:` click  
9. Idempotent call upsert API (`externalCallId`)  
10. Sync queue / offline outbox / conflict protocol  
11. Device registration + push tokens + FCM/APNs  
12. Notification category `crm` (follow-ups use `schedule`)  
13. History/audit list endpoint + enforcement of `crm.viewAudit`  
14. HTTP enforcement of `crm.logActivities`, `crm.addFeedback`, `crm.importLeads`, `crm.exportLeads`  
15. Rate limiting  
16. CRM data retention / access logging  
17. Webhooks / workers / Redis  
18. iOS call-log reader — **impossible at OS level**; missing “post-call prompt” instead  
19. Multi-company login (email not globally unique across tenants at login time)

---

## 22. Risks

| Risk | Severity | Why it exists | Recommended solution |
|---|---|---|---|
| **Building a second CRM** | Critical | Mobile teams often add Contact/Call tables | Mandate reuse of `CrmLead` + feedback/activities |
| Duplicate leads on import | High | No unique phone; import calls create | Canonicalize + match last 9–10 digits before insert |
| Analytics ignore `type=call` activities | High | KPIs read feedback `callAnswered` only | Native integration must POST **feedback**, not only activities |
| Timeline drops history/feedback | Medium | Timeline handler discards two queries | Later: merge endpoint — not a blocker for v1 prompt |
| Unused catalog permissions | Medium | import/log/addFeedback/audit not enforced | Enforce before exposing mobile write volume |
| JWT default secret / unused expiry env | High | `rootk-dev-secret` fallback | Production secret; honor env TTL |
| Login single-company | Medium | `DEFAULT_COMPANY_ID` | Confirm product is single-tenant internally |
| Follow-up poller cross-company query | Low | In-process `findMany` without companyId | Scope per company if SaaS grows; add real scheduler |
| No rate limit on import/feedback | High (once mobile retries) | Nest has no throttle | Idempotency keys + throttle before call sync |
| Soft-delete forever | Medium | No purge | Retention policy before storing call logs |
| Plaintext phones/notes | Medium | No field encryption | TLS + access control first; encryption later if required |
| Entire address book upload | **Critical privacy** | Easy Capacitor plugin path | On-device match; picker; never bulk POST contacts |
| Android `READ_CALL_LOG` Play ban | High | Restricted permission | v1 = prompt-on-resume; skip full log sync |
| iOS cannot supply call logs | High (expectation) | OS privacy | Product copy: “confirm the call”; no auto missed-call on iOS |
| Call duration column missing | Medium | Schema gap | `metadata.durationSec` on feedback first (no migration emergency) |
| `ownerEmployeeId` without FK | Low | Orphan owners | Validate employee exists on assign (partially done for recorder) |
| Local mode mistaken for offline | Medium | Dual-mode LocalStorage | Mobile uses **api mode only** |
| HR WorkMeeting confusion | Medium | Same word “meeting” | Keep modules separate |
| `X-Company-Id` false sense of tenancy | Low | Client sends unused header | Isolation is JWT; don’t let clients pick company |
| Legal / PDPL / labor monitoring | High | Call recording/log of personal numbers | Consent, work-profile only, DPA — **UNKNOWN legally** |
| Performance of naive sync | Medium | Import 500 cap; no queue | Batch match API; never dump call log every minute |
| Multi-tenant leak via poller bug class | Medium | Pattern of unscoped jobs | All future jobs **must** filter `companyId` |

---

## 23. Recommended Future Architecture

**Do not implement yet.** Target picture after discovery:

```
Rootk CRM Web (Next.js)  ──┐
                           │  same REST contract
Rootk Mobile (Capacitor    │
  WebView of /crm          │
  + native plugins)  ───────┼──▶  Nest /api  ──▶  PostgreSQL
        │                  │         │
        ├── Contacts picker (on-device match vs GET /crm/leads)
        ├── Dialer (tel: / native) then resume → FeedbackForm
        ├── Optional Android CallLog (user-confirmed rows only)
        ├── Push (future FCM) → existing AppNotification
        └── Secure token store → existing /auth/*
```

**Communication rules:**

1. Mobile is a **client**, not a backend.  
2. Auth = existing JWT.  
3. Create/update CRM data only through existing (or minimally extended) `/api/crm/*`.  
4. Phone numbers never stored in a second database.  
5. Native layer extracts **digits**; matching and persistence stay in Nest.  
6. Default sync is **explicit user action**, not a daemon uploading the address book.  
7. iOS path is **prompt-based**; Android may later enhance with call-log fill-in.

**Canonical phone (recommended, not implemented):** store E.164 (`+2010xxxxxxxx`). Match using last 10 national digits for Egypt (010/011/012/015 → `+20` + 10 digits after stripping leading 0). Accept `0020`, `+20`, `20`, `0xxxxxxxxxx`. Frontend `toInternationalPhoneDigits` is a starting point — **move to a shared function used by Nest + native**.

---

## 24. Implementation Phases

**Gate:** do not start until this document is approved.

### Phase 0 — Product confirmation (no code)

Resolve section 25 questions: Contact vs Lead, Android call-log appetite, single-tenant, legal basis.

### Phase 1 — Server hygiene (small, still CRM)

- Canonical `normalizePhone` used on create/update/search (still one column).  
- Duplicate check on create/import (warn or reject).  
- Search by national last-digits.  
- Enforce unused CRM permissions OR document the gap as accepted.  
- Idempotency header on `POST feedback` / `POST activities`.  
**Still no native app.**

### Phase 2 — After-call loop on **web mobile** (no native)

- After tapping Call, prompt `CrmFeedbackForm` on visibilitychange/focus.  
- Optionally auto-draft `type: call` activity (but **KPI still needs feedback**).  
Validates UX before any store listing.

### Phase 3 — Capacitor shell

- Wrap production URL.  
- Secure token storage.  
- Contact **picker** (not full dump) → match → create lead if confirmed.  
- Dial + resume prompt.  
- OS permission strings.  
- **No READ_CALL_LOG yet.**

### Phase 4 — Notifications

- Device token API + FCM/APNs.  
- Route CRM follow-ups (already in-app) to push.  
- Add `crm` notification category if product wants it.

### Phase 5 — Android-only call-log assist (optional, high scrutiny)

- Read recent logs **on device**.  
- Show candidates; user confirms.  
- POST feedback with `externalCallId`.  
- Skip Play if policy fails — keep Phase 3.

### Never in v1

- Second Contact/Call database  
- Silent full-book sync  
- iOS call-history scraping  
- Recording audio of calls  
- Changing HR WorkMeeting into CRM calls  

---

## 25. Questions / Unknowns Requiring Confirmation

| ID | Question | Why it blocks design |
|---|---|---|
| Q1 | Is a CRM **Contact** (person without pipeline) required, or is **Lead-is-the-person** accepted? | Schema vs reuse |
| Q2 | Should imported phone people enter as **New Lead** stage automatically? | Business |
| Q3 | Is Rootk **single company** (`cmp_rootk_001`) in production forever? | Login + tenancy |
| Q4 | Target stores: Google Play, Apple, sideload Work Profile only? | Call-log permission |
| Q5 | Are sales devices **company-owned**? | Legal basis for call logs |
| Q6 | Must missed calls sync automatically on Android? | Policy vs UX |
| Q7 | Is WhatsApp Business / Cloud API in scope, or only `wa.me` links? | Integration size |
| Q8 | Should call KPIs count `CrmActivityType.call` as well as feedback? | Analytics contract |
| Q9 | Production TLS terminator / hosting (Vercel + which API host)? | **UNKNOWN** — no prod deploy files |
| Q10 | Data residency / PDPL / employee monitoring policy? | **UNKNOWN — legal** |
| Q11 | Accept `crm.logActivities` unused-at-HTTP as intentional? | Authz cleanup |
| Q12 | Official applicationId / bundle id / display name for a store app? | **Does not exist yet** |
| Q13 | Default country always Egypt (`+20`)? Other markets? | Normalization |
| Q14 | Call recording? | Out of scope unless explicitly required (high legal risk) |
| Q15 | Who owns a lead created from **my** phone contact — me, or unassigned? | Assignment rules already force self without `assign` |

---

## Appendix A — Application modules that actually exist

From `src/constants/navigation.ts` + `src/app/(app)/**/page.tsx` + `backend/src/app.module.ts`:

```
Rootk Systems
├── Authentication          /login, /api/auth/*
├── Dashboard               /dashboard
├── Attendance              /attendance
├── Daily plan              /daily-plan
├── Tasks (HR work)         /tasks  → /api/work/tasks
├── Targets                 /targets
├── Team                    /team
├── Organic Ads             /organic-ads
├── CRM (leads hub)         /crm    → /api/crm/*
├── Employees               /employees
├── Schedule                /schedule
├── Leave                   /leave
├── Reports (HR attendance) /reports   ← not CRM reports
├── Payroll                 /payroll
├── Permissions             /permissions
├── Settings                /settings
├── Profile                 /profile
└── Notifications (popover, not a route)
```

**Not present as modules:** Contacts, Deals, Finance (beyond payroll), Projects, Units, native Notifications center page, Portal (`README` mentions `/portal` — **no `src/app/**/portal/page.tsx` found**).

---

## Appendix B — Call/activity file index (exhaustive for discovery)

| Layer | Path |
|---|---|
| Schema | `backend/prisma/schema.prisma` (`CrmLead`, `CrmLeadActivity`, `CrmLeadFeedback`, `CrmLeadHistoryEvent`) |
| Controllers | `backend/src/crm/crm.controller.ts`, `crm-catalog.controller.ts` |
| Services | `crm-activities.service.ts`, `crm-lead-create.service.ts`, `crm-lead-update.service.ts`, `crm-leads.service.ts`, `crm-leads-import.service.ts`, `crm-interaction-breakdown.ts`, `crm-follow-up-reminders.service.ts`, `crm-shared.service.ts`, `crm-performance.service.ts` |
| Access | `backend/src/crm/crm-access.ts`, `backend/src/lib/crm-policies.ts` |
| FE types | `src/types/crm.ts` |
| FE services | `src/services/crm/crm-activities.service.ts`, `crm-leads.service.ts`, `crm-lead-mutations.service.ts` |
| FE API | `src/api/crm.api.ts`, `src/api/routes.ts` |
| FE UI | `crm-phone-actions.tsx`, `crm-feedback-form.tsx`, `crm-interaction-breakdown-panel.tsx`, `crm-activities-panel.tsx`, `crm-lead-sheet.tsx`, `crm-call-feedback-dialog.tsx` |
| Phone helper | `src/lib/crm/phone-links.ts` |
| Local repos | `src/repositories/crm.repository.ts`, `src/storage/keys.ts` |

---

## Appendix C — Stop conditions

This document completes the discovery phase.

**Do not** until explicit approval:

- modify application code  
- add Prisma models / migrations  
- add permissions  
- add APIs  
- add Capacitor  
- install packages  
- upload any phone data  

End of discovery.
