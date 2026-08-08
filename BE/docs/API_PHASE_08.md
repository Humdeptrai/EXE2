# Phase 08 - Realtime Chat

Phase 08 adds one private conversation per paid `JobMatch` and realtime text messaging over WebSocket/STOMP.

## Access rules

- A conversation can only be opened for a Match with `status = ACTIVE` and `chatUnlockedAt != null`.
- Only the Consumer and Provider belonging to that Match can read the room or its history.
- Message sending is allowed only while the Match is ACTIVE and chat remains unlocked.
- Conversation history is modeled separately from Match lifecycle so a later disconnect/completion phase can preserve read-only history.
- Text messages are limited to 2,000 characters.
- A client-generated UUID makes a send idempotent for the same conversation/sender/client message id.
- Existing Phase 07 paid Matches are backward-compatible: the inbox lazily backfills any missing conversation under a Match row lock. New payments create the conversation immediately.

## REST API

- `GET /api/v1/conversations?page=0&size=20`
- `GET /api/v1/conversations/{conversationId}`
- `POST /api/v1/conversations/matches/{matchId}` - get-or-create the room for an unlocked Match.
- `GET /api/v1/conversations/{conversationId}/messages?page=0&size=50` - pages are newest-first.
- `POST /api/v1/conversations/{conversationId}/read`

## WebSocket/STOMP

Handshake endpoint:

`ws://localhost:8080/ws`

STOMP `CONNECT` must include:

`Authorization: Bearer <access-token>`

Client sends messages to:

`/app/chat.send`

Payload:

```json
{
  "conversationId": "<uuid>",
  "clientMessageId": "<uuid>",
  "content": "Xin chào"
}
```

Each authenticated participant subscribes to:

- `/user/queue/chat` for new message events.
- `/user/queue/chat-errors` for send errors.

The HTTP `/ws` handshake is intentionally permitted by Spring Security because browsers cannot attach a custom Authorization header to a native WebSocket handshake. Authentication is performed on the STOMP `CONNECT` frame by decoding the same access JWT used by the REST API.
