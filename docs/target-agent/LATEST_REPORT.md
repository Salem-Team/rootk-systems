# Target User Agent — Test Report

Generated: **2026-08-07T16:00:15.574Z**

Result: **10/10 passed**

Agent target id: `pt_c5e25c562f7b4027`

## Scenarios (real user flows)

| # | Actor | Scenario | Result | Detail |
|---|-------|----------|--------|--------|
| 1 | admin | Open Target Catalog | ✅ PASS | 4 categories, 6 types |
| 2 | admin | Create category + type (Operations / Site Visits) | ✅ PASS | category=tcat_9a2b821e8fb54519 type=ttype_7037c16163a2453c |
| 3 | admin | Assign target + auto-create 5 tasks | ✅ PASS | target=pt_c5e25c562f7b4027, linkedTasks=5, progress=0% |
| 4 | employee | Complete 2 tasks → target progress auto-updates to 40% | ✅ PASS | completedQuantity=2, percentage=40% |
| 5 | employee | Employee cannot edit target (permission gate) | ✅ PASS | correctly forbidden |
| 6 | admin | Send performance warning | ✅ PASS | warning=tw_c4e6b88c622142c7 |
| 7 | employee | Employee acknowledges warning | ✅ PASS | acknowledgedAt=2026-08-07T16:00:09.867Z |
| 8 | admin | Dashboard + delayed center load with agent target visible | ✅ PASS | total=7, completed=1, delayedTargets=4, avgScore=41.8 |
| 9 | employee | Employee performance page shows target + warning | ✅ PASS | score=57.9, targets=3, warnings=1 |
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
  "critical": 4,
  "completionRate": 14.3,
  "averagePerformance": 41.8,
  "employeesAtRisk": 3,
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
      "id": "tcat_9a2b821e8fb54519",
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
      "avgScore": 62.8
    },
    {
      "department": "Engineering",
      "count": 2,
      "avgScore": 6.9
    },
    {
      "department": "Sales",
      "count": 2,
      "avgScore": 45.2
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
      "score": 57.9,
      "completed": 0,
      "total": 3
    },
    {
      "employeeId": "emp-014",
      "score": 45.2,
      "completed": 0,
      "total": 2
    },
    {
      "employeeId": "emp-002",
      "score": 13.8,
      "completed": 0,
      "total": 1
    },
    {
      "employeeId": "emp-001",
      "score": 0,
      "completed": 0,
      "total": 1
    }
  ],
  "bottomPerformers": [
    {
      "employeeId": "emp-001",
      "score": 0,
      "completed": 0,
      "total": 1
    },
    {
      "employeeId": "emp-002",
      "score": 13.8,
      "completed": 0,
      "total": 1
    },
    {
      "employeeId": "emp-014",
      "score": 45.2,
      "completed": 0,
      "total": 2
    },
    {
      "employeeId": "emp-003",
      "score": 57.9,
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
      "date": "2026-07-25",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-07-26",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-07-27",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-07-28",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-07-29",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-07-30",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-07-31",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-08-01",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-08-02",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-08-03",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-08-04",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-08-05",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-08-06",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-08-07",
      "created": 7,
      "completed": 1
    }
  ]
}
```
