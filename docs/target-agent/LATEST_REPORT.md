# Target User Agent — Test Report

Generated: **2026-09-27T10:28:26.116Z**

Result: **10/10 passed**

Agent target id: `pt_12468ed8bb884bd9`

## Scenarios (real user flows)

| # | Actor | Scenario | Result | Detail |
|---|-------|----------|--------|--------|
| 1 | admin | Open Target Catalog | ✅ PASS | 4 categories, 7 types |
| 2 | admin | Create category + type (Operations / Site Visits) | ✅ PASS | category=tcat_b8f44addc8834814 type=ttype_1fb4439771b248ac |
| 3 | admin | Assign target + auto-create 5 tasks | ✅ PASS | target=pt_12468ed8bb884bd9, linkedTasks=5, progress=0% |
| 4 | employee | Complete 2 tasks → target progress auto-updates to 40% | ✅ PASS | completedQuantity=2, percentage=40% |
| 5 | employee | Employee cannot edit target (permission gate) | ✅ PASS | correctly forbidden |
| 6 | admin | Send performance warning | ✅ PASS | warning=tw_296eac3f133b497f |
| 7 | employee | Employee acknowledges warning | ✅ PASS | acknowledgedAt=2026-09-27T10:28:19.722Z |
| 8 | admin | Dashboard + delayed center load with agent target visible | ✅ PASS | total=7, completed=1, delayedTargets=5, avgScore=27.7 |
| 9 | employee | Employee performance page shows target + warning | ✅ PASS | score=34.6, targets=3, warnings=1 |
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
  "averagePerformance": 27.7,
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
      "id": "tcat_b8f44addc8834814",
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
      "avgScore": 55.1
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
      "score": 34.6,
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
      "score": 34.6,
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
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-17",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-18",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-19",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-20",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-21",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-22",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-23",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-24",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-25",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-26",
      "created": 0,
      "completed": 0
    },
    {
      "date": "2026-09-27",
      "created": 7,
      "completed": 1
    }
  ]
}
```
