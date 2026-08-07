# Enterprise Target Management

Production module for ROOTK HR: categories, types, templates, assignments, automatic progress from `WorkTask` completion, warnings, delayed center, dashboard, and employee performance.

## Architecture

```
UI → services/targets.service → (api | repositories)
WorkTask status change → recalculateTargetProgress / TargetsService.onLinkedTaskStatusChanged
```

Progress is **never** edited manually. Completing linked tasks increments `completedQuantity` and recalculates health, risk, status, and performance score via `lib/target-progress.ts` (mirrored in backend).

## Routes

| Path | Access |
| --- | --- |
| `/targets` | Admin + Employee (scoped) |
| `/targets/warnings` | Admin + Employee |
| `/targets/delayed` | Admin + Employee |

## API (`/api/targets`)

- Catalog: `GET/PUT/DELETE categories|types|templates`
- Targets: `GET /`, `GET/:id`, `POST /`, `PATCH/:id`, `DELETE/:id`, `POST/:id/recalculate`
- Analytics: `GET dashboard`, `GET delayed`, `GET employees/:id/performance`
- Warnings: `GET/POST warnings`, `PATCH warnings/:id/acknowledge`

## Permissions

Role-mapped capabilities in `lib/target-policies.ts` (admin full / employee view own). Extensible to fine-grained RBAC later.

## Local demo

`SEED_VERSION` 13 seeds categories, types, templates, targets, warnings, and auto-linked work tasks.
