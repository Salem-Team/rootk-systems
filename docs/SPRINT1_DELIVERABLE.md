# Sprint 1 — Enterprise UI/UX Upgrade · Deliverable

**Scope:** Presentation layer only  
**Architecture / routing / services / repositories / stores / API:** unchanged  

---

## 1) Files modified

### Design system
- `src/app/globals.css`
- `src/lib/animations.ts`

### UI primitives
- `src/components/ui/card.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/data-table.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/select.tsx`

### Layout / shell
- `src/components/layout/app-shell.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/layout/navbar.tsx`
- `src/components/layout/brand-mark.tsx`
- `src/components/layout/role-banner.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/components/layout/auth-gate.tsx`

### Shared
- `src/components/shared/page-header.tsx`
- `src/components/shared/breadcrumbs.tsx` *(new)*
- `src/components/shared/empty-state.tsx`
- `src/components/shared/loading-state.tsx`
- `src/components/shared/filter-shell.tsx`
- `src/components/shared/status-badge.tsx`

### Dashboard
- `src/components/dashboard/kpi-cards.tsx`
- `src/components/dashboard/quick-actions.tsx`
- `src/components/dashboard/today-snapshot.tsx`
- `src/components/dashboard/activity-feed.tsx`
- `src/components/dashboard/announcements.tsx`
- `src/components/dashboard/employee-dashboard.tsx`
- `src/components/dashboard/weekly-chart.tsx` *(prior surface polish retained)*
- `src/components/dashboard/monthly-chart.tsx` *(prior surface polish retained)*

### Feature surfaces
- `src/components/employees/employee-card.tsx`
- `src/components/employees/employee-table.tsx`
- `src/components/leave/leave-card.tsx`
- `src/components/leave/leave-timeline.tsx`
- `src/components/attendance/attendance-timeline.tsx`
- `src/components/attendance/attendance-history.tsx`
- `src/components/attendance/team-attendance-board.tsx`
- `src/components/attendance/check-in-panel.tsx` *(enterprise surface retained)*
- `src/components/schedule/schedule-form.tsx`
- `src/components/schedule/weekly-planner.tsx`
- `src/components/schedule/holidays-list.tsx`
- `src/components/reports/report-charts.tsx`
- `src/components/reports/report-stats.tsx` *(surface KPIs)*
- `src/components/settings/settings-form.tsx`
- `src/app/(app)/reports/page.tsx` *(card hover classes only)*
- `src/app/login/page.tsx` *(visual polish only)*

---

## 2) Components improved

| Area | Components |
| --- | --- |
| Shell | Sidebar, Navbar, BrandMark, RoleBanner, MobileNav, AuthGate |
| Navigation | Breadcrumbs + PageHeader |
| Primitives | Card, Button, Input, Textarea, Badge, Select, Dialog, DataTable |
| States | EmptyState, PageSkeleton, TableSkeleton, CardGridSkeleton |
| Dashboard | KPIs, Snapshot, Quick Actions, Activity, Announcements |
| Domain cards | Employee, Leave, Attendance boards/history/timeline |
| Forms/settings | Settings sections, schedule/holiday surfaces |
| Auth | Login role picker + CTA density |

---

## 3) UX improvements implemented

- Stronger visual hierarchy (title → description → content)
- Professional breadcrumbs under every page header
- Tighter enterprise spacing / density (Stripe/Linear inspired)
- ROOTK navy monochromatic system with quieter surfaces
- Consistent card borders + soft layered shadows (no oversized glow)
- Sticky table headers + denser readable rows
- Premium form controls (inputs/selects/dialogs)
- Cleaner empty / loading skeletons
- Refined status badges (teal/slate instead of violet/indigo)
- Login experience tightened for enterprise first impression
- Sidebar / navbar height & active states refined
- Role banner made quieter (less chrome noise)

---

## 4) Animation improvements

- Page transitions: shorter fade/slide (less blur theatrics)
- Sidebar active pill spring retained (meaningful)
- KPI / list stagger kept, hover elevation reduced
- Empty states: subtle fade (no floating bounce)
- Cards: quiet hover elevation only
- Charts / snapshot bars: retained purposeful reveal
- `prefers-reduced-motion` respected globally

---

## 5) Remaining UI improvements (recommended for Sprint 2)

1. Dedicated settings side-nav / section jump links  
2. Advanced table: column visibility, bulk selection bar, sticky action column  
3. Richer employee profile drawer (preview panel)  
4. Calendar heat-map for attendance month view  
5. Command palette (⌘K) for global search/navigation  
6. Chart tooltip/legend restyle pass for dark mode parity  
7. Form field helper/error component kit (shared Field wrapper)  
8. Print / PDF report layout polish  
9. Onboarding empty-state illustrations (brand-safe, no stock)  
10. Microcopy audit for AR/EN consistency in dense tables  

---

## Constraints respected

- No rewrite  
- No architecture / routing / business-logic changes  
- No services / repositories / stores / API modifications  
- No feature removals  
