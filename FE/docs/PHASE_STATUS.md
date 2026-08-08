# Hands-free Web - Final Phase 12

## Phase 01-03 foundation retained

- Independent Hands-free FE/BE projects based on the supplied architecture references.
- Registration, local login, Google login, JWT access/refresh flow and protected routes.
- PostgreSQL, Docker Compose and Swagger.
- Responsive app shell for mobile, tablet and desktop.
- One account supports both `CONSUMER` and `PROVIDER` via `currentMode` without changing system role.
- Profile view/edit, profile tags and profile-completion state.

## Phase 04 - Job posting retained

- Responsive create/edit job form.
- Draft, publish, cancel, delete and repost lifecycle.
- Up to five job images.
- Consumer post-management screen with Active, Completed and Draft tabs.
- Real applicant and matching counts on active posts.

## Phase 05 - Discovery retained

- Provider feed excludes own, expired, skipped, already-interested and fully matched jobs.
- Dating-app style swipe deck supports touch, mouse, keyboard arrows and visible action buttons.
- Swipe left stores a restorable skip; swipe right creates pending `INTERESTED`.
- `VERY_INTERESTED` is a separate priority level; bookmark remains independent.
- Search/filter by keyword, category, location and budget range.
- Saved, Interested, Very interested and skipped-history views use real backend data.

## Phase 06 - Candidate matching completed

- Consumer navigation includes a dedicated `Ứng viên` workspace.
- Candidate queues are grouped by active job and show `pending / matched / requiredWorkers` state.
- `VERY_INTERESTED` applicants are ordered before normal `INTERESTED` applicants.
- Candidate identity is masked before acceptance. Bio, area and profile tags remain visible for the decision.
- Consumer can swipe left to reject or swipe right to accept; buttons and keyboard arrows provide equivalent controls.
- Accepting creates a real active `JobMatch`; rejecting sets the interest to `REJECTED`.
- A job can accept at most `requiredWorkers` providers.
- When capacity is full, remaining PENDING applicants are kept as backup and are not auto-rejected.
- Once the first active Match exists, ordinary job cancellation is blocked. Later disconnect/refund flow owns that lifecycle.
- After the first active Match, core job terms are locked; `requiredWorkers` can only be increased.
- Provider Matching tab now shows real accepted matches.
- Consumer candidates workspace shows active matches with provider identity revealed.
- Contact information remains private. Chat permission is opened only after Phase 07 connection payment; actual realtime chat is Phase 08.

## Responsive viewport checklist

- 320 x 568
- 360 x 800
- 390 x 844
- 430 x 932
- 768 x 1024
- 1024 x 768
- 1440 x 900

## Current business invariants

- One account can post jobs as Consumer and receive jobs as Provider.
- A user cannot interact with their own job.
- Bookmark is not an application.
- Swipe-right interest is not a Match until the Consumer accepts it.
- After the first Match, core job terms cannot be edited and `requiredWorkers` can only increase.
- Fully matched jobs stop accepting new interest and disappear from discovery feed.

## Phase 07 - Connection payment completed

- Each active Match has one lazily initialized `ConnectionPayment`, so existing Phase 06 data is compatible.
- Phase 07 introduced the payment simulator; Phase 09 revises it to two-sided payment.
- Consumer pays 10,000 VND and Provider pays 5,000 VND; total platform fee is 15,000 VND per successful connection.
- Supported MVP payment methods: MoMo, ZaloPay and bank transfer.
- Payment is idempotent and concurrency-safe at the Match row.
- One-sided payment remains pending and does not unlock chat.
- Both sides PAID writes `connectionSucceededAt` and `chatUnlockedAt`.


## Phase 08 - Realtime chat completed

- One private conversation is created per paid active Match.
- Match cards open the correct chat room instead of a placeholder.
- `/messages` provides a responsive inbox with last-message previews and unread counts.
- `/messages/:conversationId` provides REST history plus realtime WebSocket/STOMP text messaging.
- STOMP CONNECT authenticates with the existing access JWT; private user queues deliver chat events only to Match participants.
- Incoming messages are marked read while the room is open.
- Conversation history remains modeled separately from Match lifecycle to support later disconnect/completion behavior.
- Notification-center WebSocket work remains reserved for the Notification phase.


## Phase 09 - Two-sided payment & successful connection completed

- Consumer and Provider independently pay their own connection fee from the same payment screen.
- Payment status is visible for both sides.
- Chat stays locked until both fees are PAID.
- `connectionSucceededAt` is the canonical successful-match timestamp for later reputation and rating phases.
- Legacy Phase 07 one-sided PAID rows are normalized to Consumer PAID / Provider PENDING before chat can unlock again.
- Existing chat history cannot bypass the new gate because conversation APIs require a successful connection.
- Cloudinary configuration and realtime notification remain deferred to the final phase.

## Phase 10 - Rating & reputation completed

- Both Match participants can rate each other, but only after the Match is a successful two-sided paid connection.
- Rating remains locked until the scheduled job date/time plus 1 hour.
- Each participant can submit one immutable 1-5 star rating per Match with an optional comment.
- Reputation exposes overall, Consumer-role and Provider-role aggregates.
- Successful Match counts use `connectionSucceededAt`, not candidate acceptance.
- The profile screen now shows real connection/rating statistics.
- Candidate cards do not consume these aggregates yet; Provider reputation and top expertise are reserved for the next phase.
- Cloudinary and realtime Notification remain deferred to the final phase.

## Phase 11 - Candidate expertise & hiring reputation completed

- Candidate swipe cards now show Provider-role rating, rating count and successful connection count before acceptance.
- Candidate detail shows the same reputation data with a clearer decision-support layout.
- Top 3 expertise categories are derived from successful paid connections where the applicant acted as Provider.
- Expertise is historical evidence from `connectionSucceededAt`, not self-declared profile tags.
- Self-declared tags remain visible separately so Consumers can distinguish claimed skills from proven connection history.
- New Providers with no successful history show a neutral new-member state.
- Candidate identity privacy remains unchanged before Matching.
- Stale Work Agreement source left from the discarded old roadmap was removed so the backend no longer contains dead agreement APIs that referenced removed error codes.
- Cloudinary and realtime Notification remain deferred to the final phase.


## Phase 12 - Final MVP completed

- Added configurable Cloudinary media storage while retaining local development storage.
- Job image APIs now transparently use the selected storage provider.
- Profile supports managed avatar file upload/delete.
- Added persistent notification history and unread state.
- Added authenticated realtime notification delivery on `/user/queue/notifications`.
- Realtime events cover new interest, candidate accept/reject, payment progress, successful connection, new chat message and received rating.
- Desktop/mobile notification badges update without refresh.
- Discarded Work Agreement source remains removed; the system intentionally stops managing work after connection/chat.
