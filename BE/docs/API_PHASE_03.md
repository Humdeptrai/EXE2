# Phase 03 API — Profile and application mode

## Business decisions

- One account can operate in both `CONSUMER` and `PROVIDER` mode.
- Switching `currentMode` changes the current product experience only.
- Switching mode does not change `role`, revoke permissions, remove active jobs, or create another account.
- A profile is complete when all of the following are present:
  - full name;
  - location;
  - bio;
  - at least one profile tag.
- Phone and avatar URL are optional for the MVP.
- A user can store at most eight unique profile tags.

## Endpoints

### `GET /api/v1/users/me`
Returns the authenticated user and all profile fields.

### `PATCH /api/v1/users/me`
Updates the current user's profile.

Example body:

```json
{
  "fullName": "Nguyen Van A",
  "phone": "0901234567",
  "avatarUrl": "https://example.com/avatar.jpg",
  "bio": "Available for delivery and pet-care work after 18:00.",
  "location": "Thu Duc, Ho Chi Minh City",
  "tags": ["Delivery", "Pet care"]
}
```

### `PATCH /api/v1/users/me/mode`
Switches the current product mode.

```json
{
  "mode": "PROVIDER"
}
```

All three endpoints require a bearer access token.
