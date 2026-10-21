# Profile skills and responsive chat — 2026-10-21

Base: main 7c30bad5e50d0e7c0ab03fce208916875f767429.

## Deployment

1. Back up PostgreSQL and run `BE/deployment/012_profile_skills.sql` before deploying the backend. It creates the moderated catalog, seeds the 12 previous choices and updates the notification type check. It does not change a user's existing tags. Script can be rerun.
2. Deploy BE and FE from the same commit. No additional API keys or environment variables. Face worker is unchanged.
3. ADMIN opens `/admin/skills`. USER opens Profile → edit → Skills & interests. Notifications open `/profile?skills=1`.

## Rules

- Catalog entries: PENDING, APPROVED, REJECTED. Only approved choices are public.
- USER proposes a name (2–40 characters); normalized NFC, trimmed/collapsed whitespace and case-insensitive duplicate check. Database unique constraint covers races.
- ADMIN may add a new approved choice directly or approve/reject a pending proposal. Rejection reason is required (≤300 characters). A row lock prevents two admins deciding the same proposal. A decision creates a notification after commit, with a profile link.
- STAFF cannot add or moderate, enforced by both Spring security and service role checks.
- Updating profile accepts only approved choices or that user's own legacy saved choices, max 8. Existing private legacy choices do not become public catalog entries. Skills remain optional for posting/accepting work; existing completion-bar calculation stays in place.

## Chat

- Each submit creates an optimistic row and clears the composer immediately. Text, attachments and locally rendered emoji stickers use the same existing client message ID idempotency contract.
- HTTP, polling and WebSocket acknowledgements merge by sender + clientMessageId, replacing optimistic rows. Failed rows can retry with their original ID and file. Composer remains available during uploads.
- Local image/video previews are object URLs; sent own-image rows reuse them instead of downloading the file again. URLs are released when leaving the conversation. Pending/failed outbox files are in memory, not persistent across reload or navigation.
- Image/video bubbles are transparent; original dimensions are constrained proportionally. Images use the existing viewer with zoom/save/copy; no long download filename below images. Documents retain filename/download.
- Server validates attachment type, size and signature, authorizes before upload and again before commit. Storage upload runs outside database transactions and locks. Short final transaction serializes idempotent insert; unused concurrent uploads and failed commits clean up storage.
- Attachment download authorizes in a short transaction then opens storage outside it. Private media routes remain participant-only.
- Transport/storage/free-host cold-start latency is not eliminated; optimistic display does not claim delivery until server acknowledgement.

## Logo

The original PNG was supplied again and applied throughout the shared brand component, operator login/workspace, favicon and PWA icons. Pixel artwork and red color are preserved. Horizontal lockup uses the original mark and wordmark; small app icons use the original mark on white, with a maskable safe area. Public brand assets are included in the PWA cache.

## Validation

- Java 21 Maven main compilation passes.
- Temporary Spring/JPA + H2 PostgreSQL-mode integration checks pass: approved-only catalog, role checks, duplicate normalization, legacy retention, rejection reason/notification/action URL, search wildcard escaping, text send during blocked storage upload, concurrent retries storing one message, unused-file cleanup, participant checks and authorization recheck after upload.
- Migration executed twice with PostgreSQL/PGlite: 12 seed rows, legacy tags retained, new notification accepted and invalid type rejected.
- FE TypeScript + production build passes. ESLint passes for new components and chat changes. Full-repo lint still has unrelated pre-existing errors.
- Playwright with mocked HTTP checks optimistic display before acknowledgement, composer during upload, failure/retry reuses the client ID, preserved portrait ratio, stickers, proposal and ADMIN rejection UI, and no horizontal overflow at 320/390/768/1280px. No runtime JS errors in the verified flows.
- No test files added to the repository. Production external-storage latency, device-specific emoji rendering and live PostgreSQL concurrency have not been benchmarked.
