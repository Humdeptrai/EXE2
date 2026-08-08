# Phase 10 - Rating & Reputation

Phase 10 adds bilateral ratings after a successful paid connection without introducing a job-execution lifecycle.

## Eligibility

A participant can rate the other participant only when both conditions are true:

1. `job_matches.connection_succeeded_at` is present (Consumer and Provider have both paid their connection fee).
2. Current time is at or after the job's scheduled date/time plus 1 hour.

The job date/time is interpreted in `app.business.time-zone`, defaulting to `Asia/Ho_Chi_Minh` and configurable through `BUSINESS_TIME_ZONE`.

Example: a job scheduled for `2026-08-08 13:00` becomes rateable at `2026-08-08 14:00` in the configured business time zone.

## Rating rules

- Consumer can rate Provider.
- Provider can rate Consumer.
- Each participant can submit at most one rating for the same Match.
- Stars are integers from 1 to 5.
- Comment is optional and limited to 500 characters.
- Ratings are immutable in the MVP.
- Rating does not mark a job completed and does not create any work-progress state.

## Reputation

Reputation exposes three aggregates:

- `overall`
- `asConsumer`
- `asProvider`

Each aggregate contains:

- average rating;
- rating count;
- successful Match count.

A successful Match is counted from `connection_succeeded_at`, not from candidate acceptance.

## API

- `GET /api/v1/matches/{matchId}/rating` - eligibility, current user's existing rating, counterpart and counterpart reputation.
- `POST /api/v1/matches/{matchId}/rating` - submit the current user's one-time rating.
- `GET /api/v1/users/{userId}/reputation` - public reputation summary for an authenticated user.

Cloudinary configuration and realtime notification remain deferred to the final phase.
