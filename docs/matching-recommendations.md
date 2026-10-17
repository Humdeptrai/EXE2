# Matching recommendation index — phase 2026-10-17

## Approved scope

Recommend candidates to employers and jobs to workers using existing data only.
All valid repeat connections and ratings between the same pair contribute; no pair cap.
No new schedule, availability, skills or salary-preference requirements.
Keep identity/contact access and payment conditions unchanged.

## Formula (version 1)

- `r`: average stars in the evaluated user's relevant role; `n`: rating count in that role.
- `k`: successful provider connections in the displayed job's category.
- `e`: successful connections of the evaluated user in the relevant role.
- `R = 20 * (n*r + 17.5)/(n+5)` (implementation uses sum of stars to avoid rounded averages).
- `C = 50 + 50*k/(k+3)`.
- `E = 50 + 50*e/(e+10)`.
- Display `round(0.45*R + 0.35*C + 0.20*E)` out of 100.
- No-history default: 59/100, actual average remains null, not fabricated stars.
- Fewer than five role-specific ratings: label "Ít dữ liệu".

Employer view: `r,n,e` describe the applicant as PROVIDER; `k` is that applicant's history.
Worker view: `r,n,e` describe the job owner as CONSUMER; `k` is the viewing worker's history.
Successful means `connectionSucceededAt != null`, consistent with existing statistics;
it does not mean actual work completion. No scores from verification biometrics or private documents.

## Ordering and access

The database sorts before offset/limit; no full-dataset in-memory sorting.
Candidate ties: rounded score desc, same-category connections desc, requested time asc, ID asc.
Job ties: rounded score desc, same-category connections desc, published/created time desc, ID asc.
Scores are re-evaluated on explicit loads, not on an unsolicited live reordering event.
Existing candidate-owner authorization and feed filters remain in use.
RecommendationService is an interface implemented by RecommendationServiceImpl.
Controllers continue to call service interfaces. RecommendationRepository builds parameterized HQL;
request input is bound as parameters, never concatenated into query text.

## UI and deployment

Candidate list is the default; the existing swipe view remains available. Both show scores.
Candidate pages contain at most 20 items and expose page controls.
Feed defaults to RECOMMENDED; NEWEST and NEAREST remain selectable.
Score breakdown is expandable and uses the existing HandsFree teal design and touch-size controls.

Deploy both BE and FE together. No SQL migration, API key or new environment variable is required.
No test files are added to the repository. Verification is performed using temporary external fixtures.

## Verification

- All backend main sources compiled with Java 21 and the project's dependency versions.
- Temporary Spring Boot/H2 PostgreSQL-mode fixtures executed the actual ranking queries and services:
  exact 81/100 example, 59/100 newcomer, role-specific ratings, repeat-pair inclusion,
  unpaid exclusion, category counts, candidate ownership, database pagination,
  skipped-job exclusion, radius/text intersection and prepayment address privacy.
- FE production build (`tsc -b && vite build`) passed.
- Mock-API browser checks at widths 320, 390, 768 and 1280 cover candidate list/pagination,
  swipe mode, rating breakdown, feed sorting and horizontal overflow.
- These checks do not modify production users, matching records or payments.
  Production PostgreSQL load/performance and real deployed end-to-end flows were not exercised.
