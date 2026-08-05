# ROOTK Frontend Design System

Enterprise design language for the ROOTK Internal HR System.

## Brand

- Primary navy: `#082868` (light) / `#a8bfee` (dark)
- Quiet surfaces, high craft, minimal chrome
- Prefer `surface-panel` for operational cards and widgets

## Typography

| Role | Face | Notes |
|------|------|--------|
| Arabic UI (primary) | **Noto Sans Arabic** (`--font-arabic`) | RTL product copy, weights 400–700 |
| Latin / display / numerals | **Plus Jakarta Sans** (`--font-display`) | EN labels, headings, KPI numbers |
| Mono | **Geist Mono** (`--font-geist-mono`) | IDs, timers, codes |

Stacks (on `body`):

- `--font-ui` / `--font-ui-ar` — body UI
- `--font-heading` / `--font-heading-ar` — titles
- `--font-numeric` — KPI / tabular values (Latin-first for clarity)

`html[lang="ar"]` prefers Arabic first for body and headings. Locale switches via `LocaleProvider`.

Utility classes:

- `.type-eyebrow` / `.section-label` — quiet labels
- `.type-title` — page H1
- `.type-subtitle` — supporting copy
- `.stat-value` — KPI numerals (tabular)
- `.font-display` / `.font-arabic` / `.font-numeric` — explicit stacks
- `.font-mono` — monospace

## Tokens

Defined in `src/app/globals.css`:

| Token | Role |
|-------|------|
| `--primary` / `--brand` | ROOTK identity |
| `--background` / `--card` | Page + elevated surfaces |
| `--muted` / `--border` | Quiet structure |
| `--chart-1…5` | Series colors |
| `--shadow-card` / `--shadow-card-hover` | Elevation |
| `--radius` | Base radius (~0.8rem) |

## Components

| Pattern | Use |
|---------|-----|
| `.surface-panel` | Default operational panel |
| `.panel-header` / `.panel-body` | Panel chrome |
| `.icon-well` | Small icon containers |
| `.focus-ring` | Shared focus recipe |
| `.skip-link` | Keyboard skip to `#main-content` |
| `.table-scroll` | Table overflow fade hint |
| `EmptyState` | Empty collections |
| `ErrorState` | Recoverable errors |
| `PageSkeleton` | Route loading |

## Motion

- Route transitions live in `AppShell` only (respects reduced motion)
- Stagger parents must **not** animate `opacity` (prevents nested opacity traps)
- Prefer Framer `useReducedMotion` for springs / staggers
- `Reveal` / `MotionSurface` for section enter-on-view
- KPI cards: stagger + hover lift + icon pop + shine sweep
- Recharts: set `animationDuration={0}` when reduced motion
- CSS: `.surface-shine`, `.lift-hover` (disabled under `prefers-reduced-motion`)

## Accessibility

- Skip link → `#main-content`
- `main` has `aria-label`
- Skeletons expose `role="status"` + polite live region
- Focus: `ring-ring/30` + `ring-offset-2` + `ring-offset-background`
- Badges are non-interactive `<span>`s
