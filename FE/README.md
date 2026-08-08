# Hands-free FE - MVP Final Phase 12

React, TypeScript, Vite and Tailwind CSS. This is the independent Hands-free project; the supplied FE reference is architecture guidance only.

## Included flow

- Registration and login, including Google Identity Services
- JWT access/refresh session handling
- Responsive protected app shell
- Consumer/Provider mode switching
- Responsive profile view/edit
- Create, edit, publish and manage job posts
- Image selection and upload for job posts
- Dating-app style provider discovery with mouse/touch swipe
- Search, category, location and budget filters
- Saved, interested, very-interested and skipped-history screens
- Consumer candidate overview grouped by active job
- Dating-app style candidate review: swipe left to reject and right to accept
- `VERY_INTERESTED` candidates are prioritized in the review queue
- Accepted candidates become real active Matches
- Provider and Consumer matching lists
- Job core fields lock after the first Match; `requiredWorkers` can only increase
- Responsive mobile/tablet/desktop navigation and layout
- Stitch-aligned connection payment screen per accepted Match
- Simulated MoMo, ZaloPay and bank-transfer payment options
- Two-sided payment state: Consumer 10,000 VND and Provider 5,000 VND
- One-sided paid waiting state; chat unlocks only after both sides pay
- Realtime private chat after paid Matching
- REST message history, unread badges and WebSocket/STOMP live delivery
- Candidate Provider reputation + top proven expertise before acceptance
- Bilateral rating after successful connection + scheduled time + 1 hour
- Managed avatar file upload
- Persistent notification center with realtime unread badge

## Configure

```powershell
Copy-Item .env.example .env
```

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

## Run

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verify

```powershell
npm run lint
npm run build
```

Use Chrome DevTools responsive mode with the viewport list in `docs/PHASE_STATUS.md`.
No automated tests are included, per project instruction.


## Phase 08

Realtime chat is available under `/messages` only after the two-sided connection payment succeeds. It combines REST history with WebSocket/STOMP delivery.


## Phase 09

`/matches/:matchId/payment` now lets both participants pay their own simulated connection fee. The page shows Consumer and Provider payment statuses independently and exposes chat only after both sides are PAID. Cloudinary and notification configuration remain deferred to the final phase.

## Phase 10

`/matches/:matchId/rating` lets either participant rate the counterpart after the two-sided connection succeeds and the scheduled job time has passed by at least one hour. Profile reputation counters now use real backend aggregates.


## Phase 11

Candidate cards and candidate detail show Provider-role rating, rating count, successful paid connection count and top 3 proven job categories while preserving pre-match identity privacy.

## Phase 12 - Final MVP

`/notifications` is a real notification center backed by REST and authenticated WebSocket/STOMP delivery. Navigation badges update without page refresh. Profile editing uploads avatar files through the backend storage abstraction, which can be switched to Cloudinary in the final environment.
