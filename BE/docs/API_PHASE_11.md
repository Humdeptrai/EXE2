# Phase 11 - Candidate Expertise & Hiring Reputation

Phase 11 exposes Provider reputation and proven work categories directly in the Consumer candidate-review flow.

## Candidate hiring insights

Existing candidate endpoints now include `hiringInsights`:

```json
{
  "averageRating": 4.85,
  "ratingCount": 18,
  "successfulMatchCount": 24,
  "topExpertise": [
    {
      "categoryId": "...",
      "code": "PET_CARE",
      "name": "Thú cưng",
      "icon": "...",
      "successfulMatchCount": 12
    }
  ]
}
```

Rules:

- Rating uses only feedback the candidate received while acting as `PROVIDER`.
- Successful Match count uses only `job_matches.connection_succeeded_at is not null`.
- Expertise uses only successful connections where the candidate was the Provider.
- Categories are ordered by successful connection count descending, then category name for deterministic ties.
- Only the top 3 categories are returned to the hiring UI.
- Candidate identity remains masked before Consumer acceptance; reputation and expertise are intentionally visible before acceptance.
- A new Provider with no history returns zero counts, `averageRating = null`, and an empty expertise list.

## API affected

No extra round-trip endpoint is required. Existing APIs are enriched:

- `GET /api/v1/jobs/{jobId}/candidates`
- `GET /api/v1/jobs/{jobId}/candidates/{interestId}`

The paginated candidate endpoint loads reputation/expertise in batch for the current page rather than issuing one database query per candidate.

Cloudinary configuration and realtime Notification remain deferred to the final phase.
