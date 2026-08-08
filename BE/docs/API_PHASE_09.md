# Phase 09 - Two-sided Connection Payment & Connection Success

Phase 09 revises the Phase 07 payment simulator so a Match becomes a successful connection only after both participants pay their own connection fee.

## Business rules

- Consumer fee: 10,000 VND per Match.
- Provider fee: 5,000 VND per Match.
- Platform total: 15,000 VND per successful connection.
- Both Consumer and Provider can call the same payment endpoint, but each call only pays the current user's own fee.
- One side paying does not unlock chat.
- `job_matches.connection_succeeded_at` is written only when both sides are PAID.
- `chat_unlocked_at` is written at the same successful-connection moment.
- The chat conversation is created/reused only after the successful connection gate is satisfied.
- The payment remains an MVP simulator; no real gateway is called.

## API

### Read payment state

`GET /api/v1/matches/{matchId}/payment`

Returns both participant statuses plus the current user's payable fee/status.

### Pay the current participant fee

`POST /api/v1/matches/{matchId}/payment/pay`

```json
{
  "paymentMethod": "MOMO"
}
```

Supported simulator methods:

- `MOMO`
- `ZALOPAY`
- `BANK_TRANSFER`

## Legacy Phase 07 data

The database remains compatible with `ddl-auto=update`.

Old Phase 07 rows that were `PAID` represented only the Consumer payment. They are upgraded lazily to:

- Consumer = `PAID`
- Provider = `PENDING`
- overall connection = `PENDING`

Any old early `chat_unlocked_at` is removed when that payment state is normalized. Chat APIs additionally require `connection_succeeded_at`, so legacy one-sided payments cannot bypass the new rule.
