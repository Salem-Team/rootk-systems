# Target User Agent — Test Report

Generated: **2026-08-06T11:21:48.928Z**

Result: **10/10 passed**

Agent target id: `pt_feb7b006f0884086`

## Scenarios (real user flows)

| # | Actor | Scenario | Result | Detail |
|---|-------|----------|--------|--------|
| 1 | admin | Open Target Catalog | ✅ PASS | 4 categories, 6 types |
| 2 | admin | Create category + type (Operations / Site Visits) | ✅ PASS | category=tcat_85a6ca609550418a type=ttype_46409238723246fb |
| 3 | admin | Assign target + auto-create 5 tasks | ✅ PASS | target=pt_feb7b006f0884086, linkedTasks=5, progress=0% |
| 4 | employee | Complete 2 tasks → target progress auto-updates to 40% | ✅ PASS | completedQuantity=2, percentage=40% |
| 5 | employee | Employee cannot edit target (permission gate) | ✅ PASS | correctly forbidden |
| 6 | admin | Send performance warning | ✅ PASS | warning=tw_4ad6648c26314d0a |
| 7 | employee | Employee acknowledges warning | ✅ PASS | acknowledgedAt=2026-08-06T11:21:43.489Z |
| 8 | admin | Dashboard + delayed center load with agent target visible | ✅ PASS | total=7, completed=1, delayedTargets=4, avgScore=43.2 |
| 9 | employee | Employee performance page shows target + warning | ✅ PASS | score=59.1, targets=3, warnings=1 |
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
  "critical": 3,
  "completionRate": 14.3,
  "averagePerformance": 43.2,
  "employeesAtRisk": 3,
  "upcomingDeadlines": 6,
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
      "id": "tcat_85a6ca609550418a",
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
      "avgScore": 63.5
    },
    {
      "department": "Engineering",
      "count": 2,
      "avgScore": 8.2
    },
    {
      "department": "Sales",
      "count": 2,
      "avgScore": 47.8
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
      "score": 59.1,
      "completed": 0,
      "total": 3
    },
    {
      "employeeId": "emp-014",
      "score": 47.8,
      "completed": 0,
      "total": 2
    },
    {
      "employeeId": "emp-002",
      "score": 16.3,
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
      "score": 16.3,
      "completed": 0,
      "total": 1
    },
    {
      "employeeId": "emp-014",
      "score": 47.8,
      "completed": 0,
      "total": 2
    },
    {
      "employeeId": "emp-003",
      "score": 59.1,
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
      "date": "2026-07-24",
      "created": 0,
      "completed": 0
    },
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
      "created": 7,
      "completed": 1
    }
  ]
}
```
