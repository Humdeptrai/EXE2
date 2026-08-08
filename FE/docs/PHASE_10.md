# Phase 10 - Rating & Reputation

New route:

- `/matches/:matchId/rating`

After both sides finish connection payment, Match cards expose an `Đánh giá` action. Opening it before the allowed time is safe: the page shows the exact eligibility time and the backend still rejects early submissions.

The rating gate is:

- successful two-sided connection; and
- scheduled job time + 1 hour.

The rating page supports 1-5 stars and an optional 500-character comment. After submission the rating is read-only for the MVP.

The Profile page now shows real reputation totals instead of placeholders:

- successful connection count;
- average received rating;
- received rating count.

Role-specific aggregates (`asConsumer`, `asProvider`) are already returned by the API so the next Candidate Expertise phase can use Provider-only reputation without mixing hiring-side feedback into worker selection.
