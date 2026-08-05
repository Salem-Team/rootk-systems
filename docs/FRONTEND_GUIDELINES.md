# Frontend Guidelines

## Folder structure

```
src/
  app/                 # Next.js App Router (no new routes in Sprint 9)
  components/
    ui/                # Primitives (button, input, table…)
    shared/            # Empty/Error/Loading, headers
    layout/            # Shell, navbar, sidebar
    dashboard/         # Admin/employee dashboards
    portal/            # Employee self-service
    operations/        # Daily ops widgets
    reports/           # Analytics center
    admin/             # Company admin
    attendance|leave|employees|…
  constants/           # Chart colors, tooltip styles
  i18n/                # en + ar dictionaries
  lib/                 # animations, utils
```

## Responsive rules

1. Desktop-first enterprise density, but never horizontal page overflow.
2. Tables: wrap in `.table-scroll` / `overflow-x-auto`; min-width allowed inside.
3. Section navs may scroll horizontally on small screens.
4. FAB sits above mobile bottom nav (`z-50`, safe-area padding).
5. Content frame max width: `1440px` (`.content-frame`).

## Accessibility guidelines

1. Every interactive control must be keyboard reachable with visible focus.
2. Prefer semantic elements; do not put focus rings on non-interactive badges.
3. Provide `aria-label` for icon-only buttons and chart `role="img"` regions.
4. Honor `prefers-reduced-motion` in AppShell and chart animations.
5. Loading states announce via `role="status"`.

## Animation guidelines

1. One route-level transition (AppShell). Do not nest competing opacity layers.
2. Micro-interactions: 150–280ms easings, soft springs for cards.
3. No animation without purpose (status change, enter, feedback).
4. Tooltips / charts share `chartTooltipStyle` for visual consistency.
