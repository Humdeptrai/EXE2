# Phase 06 - Candidate Matching API

## Candidate queue

`GET /api/v1/jobs/{jobId}/candidates?page=0&size=20`

Only the job owner can read the queue. Pending candidates are ordered with `VERY_INTERESTED` first, then by request time.

## Candidate preview

`GET /api/v1/jobs/{jobId}/candidates/{interestId}`

Before acceptance, identifying name/avatar are masked. Area, bio and profile tags are intentionally available to support the hiring decision.

## Accept

`POST /api/v1/jobs/{jobId}/candidates/{interestId}/accept`

Creates one `job_matches` record and changes the interest to `ACCEPTED`. A pessimistic job-row lock prevents concurrent requests from exceeding `requiredWorkers`.

## Reject

`POST /api/v1/jobs/{jobId}/candidates/{interestId}/reject`

Changes a pending interest to `REJECTED`. No Match is created.

## Match lists

- `GET /api/v1/matches/provider`
- `GET /api/v1/matches/consumer`

Only active Matches are returned in Phase 06. Contact fields are not included.

## Post lifecycle safeguards after Matching

After the first active Match exists:

- ordinary job cancellation is rejected; later disconnect/refund flow owns that lifecycle;
- title, description, category, schedule, location and budget are locked;
- `requiredWorkers` may only increase and cannot be decreased;
- when active matches reach `requiredWorkers`, the job disappears from Provider discovery and accept rejects additional candidates;
- pending candidates remain available as backup instead of being auto-rejected.
