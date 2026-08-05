# Sprint 7 — Employee Self-Service Portal & Leave Workflow

**Status:** Complete  
**Scope:** Frontend UI only — no architecture, routing, repositories, services, stores, or API changes. Mock data for portal extras and workflow visuals.

---

## 1. Files created

| File | Purpose |
|------|---------|
| `src/components/portal/portal-mock-data.ts` | Portal docs, requests, timeline, achievements, events, notifications + leave workflow mocks |
| `src/components/portal/portal-section-nav.tsx` | Personal workspace section navigation |
| `src/components/portal/employee-portal-workspace.tsx` | Multi-section employee self-service shell |
| `src/components/portal/portal-profile-panel.tsx` | Large profile header + employment / emergency / docs |
| `src/components/portal/portal-panels.tsx` | Attendance, leave, requests, documents, notifications, team, manager, timeline, events, achievements, stats |
| `src/components/leave/leave-workflow-panels.tsx` | Balance viz, approval timeline, team availability, dept calendar, conflicts, coverage, admin review |
| `docs/SPRINT7_DELIVERABLE.md` | This report |

---

## 2. Files modified

| File | Change |
|------|--------|
| `src/components/dashboard/employee-dashboard.tsx` | Thin Suspense wrapper → `EmployeePortalWorkspace` |
| `src/app/(app)/leave/page.tsx` | Approval workspace tab + workflow sidebar + stats strip |
| `src/components/layout/navbar.tsx` | Profile menu → `/dashboard?section=profile` for employees |
| `src/i18n/locales/en.ts` | `portal.*`, `leaveWorkflow.*`, leave title copy |
| `src/i18n/locales/ar.ts` | Matching Arabic portal / leave workflow copy |

**Preserved:** `/dashboard` and `/leave` routes; existing leave approve/reject via services (called from UI only as before).  
**Untouched:** services, repositories, stores, API, route definitions.

---

## 3. Reusable components

- Portal section nav + workspace shell (same pattern as admin/reports)
- Profile, attendance calendar, leave balance, requests, documents, notifications panels
- Personal timeline, events, achievements, stats
- Leave workflow: balance visualization, team availability, department calendar, conflict indicators, coverage overview, admin review panel

---

## 4. UX improvements

- Employee dashboard is now a **personal self-service portal**, not a single scroll of widgets
- Deep-linkable sections via `?section=` (same route)
- Navbar Profile opens the personal profile section
- Leave module gains an **approval workspace** for admins plus richer employee sidebar (balance, calendar, coverage)
- Mock requests cover leave / WFH / correction / overtime

---

## 5. Animation improvements

- Section cross-fade with Framer Motion
- Staggered lists (requests, notifications, timeline, achievements)
- Calendar / heatmap cell hover scale
- Animated counters on personal stats and leave balance
- Respects `prefers-reduced-motion`

---

## 6. Accessibility improvements

- Portal / leave nav `aria-label` + `aria-current`
- Calendar/heatmap `role="img"` labels
- Focus-visible rings on document cards and section buttons
- Status badges and keyboard-friendly tabs/dialogs retained

---

## 7. Employee experience improvements

| Area | Outcome |
|------|---------|
| My Profile | Large header, employment, emergency, mock docs |
| My Attendance | Score, hours, late, monthly calendar |
| My Leave | Balance, history, approval timeline |
| My Requests | Leave / WFH / correction / overtime (mock) |
| Documents | Contract, policies, payslips, certificates, training (UI) |
| Notifications / Team / Manager | Dedicated sections |
| Timeline / Events / Achievements / Stats | Personal BI-style surfaces |

---

## 8. Leave workflow improvements

| Area | Outcome |
|------|---------|
| Manager approval queue | Admin review panel with pending cards |
| Approval timeline | Enhanced sidebar timeline |
| Team availability | Mock in/WFH/leave roster |
| Department calendar | Heat-style month grid |
| Conflict indicators | UI severity chips |
| Balance visualization | Progress + remaining/used/pending |
| Coverage overview | Daily on-leave vs capacity |
| Stats strip | Pending / approved / rejected / upcoming |

---

## 9. Recommendations before Sprint 8

1. **Persist portal documents** — replace UI-only vault with real file metadata when storage exists.
2. **Manager role slice** — today admin ≈ manager; introduce true manager queue scoped by team.
3. **Attendance correction / OT / WFH request APIs** — wire mock request kinds without changing store contracts first.
4. **Conflict engine** — compute overlaps from live leave data instead of static mock labels.
5. **Notification preferences** — connect portal notifications to the settings toggles already in admin/employee settings.
6. **Do not start Sprint 8** until product prioritizes the next module (payroll, performance cycles, or live document vault).

---

**Sprint 8:** Not started.
