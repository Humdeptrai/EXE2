# Matching requirements and notification bell

## Deployment

Run `BE/deployment/017_matching_requirements.sql` against the database used by Render **before deploying BE**. It adds `platform_settings.matching_requirements_enabled BOOLEAN NOT NULL DEFAULT TRUE`. Existing verification requirements remain enabled. With `JPA_DDL_AUTO=validate`, skipping this migration prevents startup. Then deploy BE and FE together.

## Admin policy

Open **Admin → Cấu hình → Điều kiện matching (`/admin/matching-settings`)**. Toggle **Bắt buộc hồ sơ và xác thực khi matching**, then select **Lưu điều kiện matching**.

`PATCH /api/v1/admin/settings/matching` accepts `{ "matchingRequirementsEnabled": false }` (or `true`). ADMIN only; writes `MATCHING_REQUIREMENTS_SETTINGS` audit entries. Ordinary fee settings updates do not change this policy.

- ON (default): require name, valid phone, area, VERIFIED identity, verified live selfie and confirmed document number.
- OFF: active registered accounts can publish jobs, express interest and accept candidates without these profile/identity requirements. Both sides still pay the normal wallet connection fee. Job validity, ownership, capacity, pending-interest checks and account status stay enforced.
- Turning ON again enforces requirements for new actions. Existing matches, payments and contact access retain their existing behavior.
- `/identity/eligibility` returns the policy in `matchingRequirementsEnabled` and computes `eligible` from it. Actual `identityVerified`, `selfieVerified`, `documentConfirmed` and `profileComplete` remain truthful. Bypass never marks an account verified or modifies identity evidence.
- All current matching entry points call the same server gate. Existing frontend guards consume its `eligible` flag, including login onboarding.

## Notification bell

User header has a 44px bell with unread count, ten recent notifications, read/unread styling, mark-all-read and a link to the full list. New socket events merge with REST results. Outside click, Escape and route changes close the panel. Clicking a notification navigates immediately; failure to save read state does not prevent navigation.

Destinations prefer safe internal `actionUrl`, with type-based fallback for older notifications:

| Event | Destination |
| --- | --- |
| New interested applicant | Job candidate list |
| Accepted applicant / payment received | Match payment page |
| Connection succeeded | Match chat opener |
| Chat message | Conversation |
| Report resolved / rejected | Report detail |
| Rating / identity review | Profile |
| Skill review | Profile skills |

No browser push permission is required: this uses the existing in-app notification service. Unknown events fall back to the full notification list.

## Validation

Backend tests: `MatchingRequirementsTest`, `MatchingRequirementsHttpTest` and existing identity review tests. HTTP fixture uses isolated H2 with no production credentials. Frontend: build, lint and `tests/notification-bell.test.cjs` with synthetic REST/socket fixtures (see existing test environment conventions).
