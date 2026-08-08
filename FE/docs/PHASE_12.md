# Phase 12 - Final MVP

## Notification experience

- `/notifications` is now a real persistent notification center instead of a placeholder.
- The app opens an authenticated STOMP subscription to `/user/queue/notifications` after login.
- Desktop and mobile navigation show a realtime unread badge.
- Users can mark one notification or all notifications as read.
- Notification actions route back to the relevant candidate queue, payment, chat or profile screen.
- REST is the source of truth and remains usable if realtime reconnect is temporarily unavailable.

## Managed avatar upload

- Profile editing now supports JPEG/PNG/WEBP file upload up to 5 MB.
- The same backend storage abstraction is used for profile avatars and job images.
- With `STORAGE_PROVIDER=cloudinary`, new assets are stored in Cloudinary; local storage remains the development fallback.

## Final scope

The MVP intentionally stops after successful paid connection and communication. It does not manage work execution, schedules, work agreements or completion lifecycle. Rating eligibility remains `CONNECTION_SUCCESS + scheduled job time + 1 hour`.
