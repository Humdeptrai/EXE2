# Phase 05 — Job discovery and interest flow

All endpoints require a Bearer access token.

## Discovery

- `GET /api/v1/jobs/feed`
  - Filters: `keyword`, `categoryId`, `location`, `minBudget`, `maxBudget`, `page`, `size`.
  - Excludes the current user's posts, skipped posts, expired schedules and jobs with a pending/accepted/rejected interest.
- `GET /api/v1/jobs/discovery/{jobId}`
- `GET /api/v1/jobs/discovery/summary`

## Personal lists

- `GET /api/v1/jobs/saved`
- `GET /api/v1/jobs/interests?level=INTERESTED`
- `GET /api/v1/jobs/interests?level=VERY_INTERESTED`
- `GET /api/v1/jobs/skipped`

## Interactions

- `POST /api/v1/jobs/{jobId}/save`
- `DELETE /api/v1/jobs/{jobId}/save`
- `POST /api/v1/jobs/{jobId}/skip`
- `DELETE /api/v1/jobs/{jobId}/skip`
- `POST /api/v1/jobs/{jobId}/interest`

```json
{
  "level": "INTERESTED"
}
```

Accepted levels are `INTERESTED` and `VERY_INTERESTED`.

- `DELETE /api/v1/jobs/{jobId}/interest`

## Business rules

- Saving is only a bookmark; it does not create an application.
- Swipe left creates a restorable skipped-history entry.
- Swipe right creates a pending `INTERESTED` request.
- Super-interest creates or upgrades a pending request to `VERY_INTERESTED`.
- A user cannot interact with their own job post.
- A real match is not created in this phase. The owner decision is handled in Phase 06.
