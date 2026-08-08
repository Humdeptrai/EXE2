# Hands-free BE - MVP Final Phase 12

Java 21, Spring Boot 4 and PostgreSQL. The project keeps the N-layer direction used by the supplied architecture reference:

`controller -> service -> serviceImpl -> repository -> entity`

DTOs form the API boundary; controllers do not access repositories and entities are not returned directly.

## Included modules

- Local and Google authentication
- JWT access token and rotating refresh token
- Current-user profile and Consumer/Provider mode
- Swagger/OpenAPI with Bearer authorization
- PostgreSQL through Docker Compose
- Job categories and job-post lifecycle
- Configurable local/Cloudinary image storage with a maximum of five images per post
- Managed profile-avatar upload using the same storage abstraction
- Provider discovery feed with search and filters
- Saved, skipped, interested and very-interested job states
- Consumer candidate queue with `VERY_INTERESTED` priority
- Accept/reject candidate decisions
- Active `JobMatch` records for both Consumer and Provider
- Capacity enforcement using `requiredWorkers`
- Cancellation lock after the first active match
- Simulated two-sided connection payment: Consumer 10,000 VND + Provider 5,000 VND per Match
- `connectionSucceededAt` is created only after both sides pay
- Chat unlock is created only at successful connection
- Realtime chat conversations and text-message history
- WebSocket/STOMP delivery with JWT authentication on STOMP CONNECT
- Per-conversation unread counts and read marking
- Bilateral one-time Match ratings after scheduled time + 1 hour
- Overall and role-specific reputation aggregates
- Persistent notification center with realtime WebSocket/STOMP delivery and unread state

## Environment

```powershell
Copy-Item .env.example .env
```

Keep the existing real JWT secret and Google Client ID in `.env`. The example file contains placeholders only.

For IntelliJ + PostgreSQL Docker:

```env
DB_URL=jdbc:postgresql://localhost:5432/handsfree
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads/jobs
PUBLIC_BASE_URL=http://localhost:8080/uploads/jobs
BUSINESS_TIME_ZONE=Asia/Ho_Chi_Minh
```

For Cloudinary final deployment:

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=handsfree
```

Do not commit the real API secret.

Docker Compose overrides the database hostname to `postgres` inside the API container and mounts uploaded files in a named volume.

## Run PostgreSQL in Docker and API in IntelliJ

```powershell
docker compose up -d postgres
.\mvnw.cmd spring-boot:run
```

## Run API and PostgreSQL in Docker

```powershell
docker compose up --build
```

Open:

- Swagger: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`
- Uploaded images: `http://localhost:8080/uploads/jobs/<stored-name>`

## Phase 06 APIs

```http
GET  /api/v1/jobs/{jobId}/candidates
GET  /api/v1/jobs/{jobId}/candidates/{interestId}
POST /api/v1/jobs/{jobId}/candidates/{interestId}/accept
POST /api/v1/jobs/{jobId}/candidates/{interestId}/reject
GET  /api/v1/matches/provider
GET  /api/v1/matches/consumer
```

Business rules:

- `VERY_INTERESTED` candidates are returned before regular `INTERESTED` candidates.
- Accept is concurrency-protected by a pessimistic lock on the job row.
- Accepted active matches cannot exceed `requiredWorkers`.
- Remaining pending candidates are not automatically rejected when the job reaches capacity.
- A job with any active match cannot be cancelled through the ordinary Phase 04 endpoint.
- After the first active Match, title, description, category, schedule, location and budget are locked.
- After the first active Match, `requiredWorkers` may only increase; any decrease is rejected.
- Fully matched jobs disappear from the provider discovery feed and reject new interest requests.
- Phone/email remain outside the matching response. Chat permission is unlocked by Phase 07 payment; actual realtime chat is Phase 08.

No automated tests are included, per project instruction.

## Local `.env` loading

The application imports `.env` automatically when it is started either from the `BE` directory or from the project root containing `BE/.env`. This keeps IntelliJ local runs independent of the EnvFile plugin. Docker Compose still injects the same `.env` values and overrides the database host to the `postgres` service for the API container.

## Phase 07 APIs

```http
GET  /api/v1/matches/{matchId}/payment
POST /api/v1/matches/{matchId}/payment/pay
```

Phase 07 originally used a Consumer-only simulator. Phase 09 revises this flow: Consumer pays 10,000 VND and Provider pays 5,000 VND; only both PAID creates a successful connection and unlocks chat.


## Phase 08

Realtime chat uses WebSocket/STOMP at `/ws`; REST history is under `/api/v1/conversations`. Chat is gated by an ACTIVE Match with both `connectionSucceededAt` and `chatUnlockedAt`.


## Phase 09

Two-sided payment is the canonical successful-connection gate. Consumer and Provider pay their own simulated fee through the same endpoint. One-sided payment stays PENDING; both PAID writes `connectionSucceededAt`, unlocks chat, and creates/reuses the conversation. This timestamp is the source of truth for later successful-match statistics and rating eligibility.

## Phase 10

Rating and reputation are available after a successful two-sided paid connection. A participant can submit one 1-5 star rating for the counterpart only from the scheduled job time + 1 hour onward. The API also exposes overall and role-specific reputation aggregates for later candidate-ranking screens.


## Phase 11

Candidate-review responses include Provider-role rating, successful connection count and top 3 proven job categories derived only from paid successful connections.

## Phase 12 - Final MVP

Cloudinary is available through the existing `MediaStorageService` abstraction using `STORAGE_PROVIDER=cloudinary`; local storage remains the default development fallback. Job images require no API change, and profile avatars now use `POST/DELETE /api/v1/users/me/avatar`. The Java integration uses Cloudinary's HTTP 5 SDK.

Notifications are persisted in PostgreSQL and delivered realtime to `/user/queue/notifications` over the same JWT-authenticated STOMP endpoint. The notification REST APIs expose list, unread count, mark-one-read and mark-all-read.

The final MVP deliberately does not manage work execution after connection. The platform's core responsibility is discovery, candidate decision, two-sided connection fee, communication and reputation.
