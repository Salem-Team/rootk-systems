# Target User Agent — Test Report

Generated: **2026-09-16T17:52:57.015Z**

Result: **10/10 passed**

Agent target id: `pt_c644273383dc4971`

## Scenarios (real user flows)

| # | Actor | Scenario | Result | Detail |
|---|-------|----------|--------|--------|
| 1 | admin | Open Target Catalog | ✅ PASS | 4 categories, 7 types |
| 2 | admin | Create category + type (Operations / Site Visits) | ✅ PASS | category=tcat_83a1ac7b032748c2 type=ttype_66c17065f1ce47d6 |
| 3 | admin | Assign target + auto-create 5 tasks | ✅ PASS | target=pt_c644273383dc4971, linkedTasks=5, progress=0% |
| 4 | employee | Complete 2 tasks → target progress auto-updates to 40% | ✅ PASS | completedQuantity=2, percentage=40% |
| 5 | employee | Employee cannot edit target (permission gate) | ✅ PASS | correctly forbidden |
| 6 | admin | Send performance warning | ✅ PASS | warning=tw_5984ca2a128449e1 |
| 7 | employee | Employee acknowledges warning | ✅ PASS | acknowledgedAt=2026-09-16T17:52:50.450Z |
| 8 | admin | Dashboard + delayed center load with agent target visible | ✅ PASS | total=7, completed=1, delayedTargets=5, avgScore=27.5 |
| 9 | employee | Employee performance page shows target + warning | ✅ PASS | score=34.2, targets=3, warnings=1 |
| 10 | employee | Complete remaining tasks → target reaches 100% / completed | ✅ PASS | status=completed, percentage=100% |

## How to view in the app

1. Run the app in **local** mode (`NEXT_PUBLIC_DATA_SOURCE=local`).
2. Open **Settings → Reset Demo Data** (or bump seed by reloading after seed update).
3. Go to `/targets` — look for rows titled **Agent Demo — …** plus seeded Sales/Dev/Marketing targets.
4. Complete linked tasks under `/tasks` and watch progress rings update automatically.

## Dashboard snapshot

```json
{
  "total": 7,
  "completed": 1,
  "inProgress": 5,
  "delayed": 1,
  "critical": 5,
  "completionRate": 14.3,
  "averagePerformance": 27.5,
  "employeesAtRisk": 4,
  "upcomingDeadlines": 5,
  "byCategory": [
    {
      "id": "tcat-mkt",
      "name": "Marketing",
      "color": "#B45309",
      "count": 1
    },
    {
      "id": "tcat-dev",
      "name": "Development",
      "color": "#082868",
      "count": 2
    },
    {
      "id": "tcat-sales",
      "name": "Sales",
      "color": "#0F766E",
      "count": 3
    },
    {
      "id": "tcat_83a1ac7b032748c2",
      "name": "Agent Demo — Operations",
      "color": "#0F766E",
      "count": 1
    }
  ],
  "byStatus": [
    {
      "status": "completed",
      "count": 1
    },
    {
      "status": "delayed",
      "count": 1
    },
    {
      "status": "behind_schedule",
      "count": 1
    },
    {
      "status": "in_progress",
      "count": 1
    },
    {
      "status": "on_track",
      "count": 3
    }
  ],
  "byDepartment": [
    {
      "department": "Design",
      "count": 3,
      "avgScore": 54.8
    },
    {
      "department": "Engineering",
      "count": 2,
      "avgScore": 0
    },
    {
      "department": "Sales",
      "count": 2,
      "avgScore": 14.2
    }
  ],
  "topPerformers": [
    {
      "employeeId": "emp-004",
      "score": 90,
      "completed": 1,
      "total": 1
    },
    {
      "employeeId": "emp-003",
      "score": 34.2,
      "completed": 0,
      "total": 3
    },
    {
      "employeeId": "emp-014",
      "score": 14.2,
      "completed": 0,
      "total": 2
    },
    {
      "employeeId": "emp-001",
      "score": 0,
      "completed": 0,
      "total": 1
    },
    {
      "employeeId": "emp-002",
      "score": 0,
      "completed": 0,
      "total": 1
    }
  ],
  "bottomPerformers": [
    {
      "employeeId": "emp-002",
      "score": 0,
      "completed": 0,
      "total": 1
    },
    {
      "employeeId": "emp-001",
      "score": 0,
      "completed": 0,
      "total": 1
    },
    {
      "employeeId": "emp-014",
      "score": 14.2,
      "completed": 0,
      "total": 2
    },
    {
      "employeeId": "emp-003",
      "score": 34.2,
      "completed": 0,
      "total": 3
    },
    {
      "employeeId": "emp-004",
      "score": 90,
      "completed": 1,
      "total": 1
    }
  ],
  "completionTrend": [
    {
      "date": "2026-09-03",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-04",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-05",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-06",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-07",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-08",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-09",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-10",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-11",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-12",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-13",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-14",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-15",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-16",
      "created": 7,
      "completed": 1
    }
  ]
}
```
