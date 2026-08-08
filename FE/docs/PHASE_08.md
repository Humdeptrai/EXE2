# Phase 08 - Realtime Chat

Routes:

- `/messages` - conversation inbox with unread badges.
- `/messages/match/:matchId` - resolves an unlocked Match to its one chat room.
- `/messages/:conversationId` - realtime chat room and REST-backed history.

Behavior:

1. A Match card shows `Nhắn tin` only after Phase 07 has set `chatUnlockedAt`.
2. Opening the Match creates or reuses its single conversation; existing Phase 07 paid Matches are also backfilled by the inbox API.
3. History is loaded over REST in pages of 50 messages.
4. New text messages are sent and received over WebSocket/STOMP.
5. The access JWT is sent in the STOMP `CONNECT` frame.
6. Each user subscribes only to Spring's private `/user/queue/chat` destination.
7. Incoming messages are marked read while the room is open; inbox cards show unread counts.
8. Message text is limited to 2,000 characters. Attachments, typing indicators, calling and notification-center events are outside this phase.

The frontend uses a small native-WebSocket STOMP 1.2 client rather than an extra npm dependency, keeping the project lightweight while still using the backend STOMP protocol.
