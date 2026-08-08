# Phase 12 - Final MVP: Cloudinary media + realtime notifications

Phase 12 closes the MVP with configurable Cloudinary media storage, managed profile avatars and a persistent realtime notification center.

## Cloudinary

Storage is selected by `STORAGE_PROVIDER`:

- `local` (default): preserves the existing filesystem implementation.
- `cloudinary`: stores new job images and managed profile avatars in Cloudinary.

Required when Cloudinary is enabled:

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=handsfree
```

The application fails fast if Cloudinary is selected without credentials. Database rows keep the Cloudinary public ID as the storage key and the secure CDN URL as the public URL. Existing local assets are not migrated automatically.

### Avatar APIs

```http
POST   /api/v1/users/me/avatar
DELETE /api/v1/users/me/avatar
```

`POST` consumes multipart form data with one `file` field. JPEG, PNG and WEBP are allowed, maximum 5 MB. Replacing/deleting a managed avatar also cleans the previous storage asset.

Job-post media keeps the existing APIs; switching storage provider requires no controller change.

## Realtime notification center

Persistent notifications are stored in `notifications` and delivered after transaction commit over the existing authenticated STOMP connection.

```http
GET  /api/v1/notifications?page=0&size=20
GET  /api/v1/notifications/unread-count
POST /api/v1/notifications/{notificationId}/read
POST /api/v1/notifications/read-all
```

Realtime destination:

```text
/user/queue/notifications
```

Events currently generated:

- Provider expresses interest in a job -> Consumer.
- Consumer accepts or rejects an applicant -> Provider.
- Either side completes its connection fee -> counterpart.
- Both sides complete payment -> both participants (`CONNECTION_SUCCESS`).
- New chat message -> recipient.
- New rating -> rated user.

The REST notification center remains the source of truth; WebSocket delivery provides instant UI updates and unread badges.
