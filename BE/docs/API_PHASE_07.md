# Phase 07 - Connection Payment Simulator (superseded by Phase 09 revision)

Phase 07 originally introduced the simulated connection fee after an ACTIVE JobMatch. The current source uses the Phase 09 two-sided revision:

- Consumer pays 10,000 VND.
- Provider pays 5,000 VND.
- One-sided payment remains pending.
- Only both sides PAID creates `connectionSucceededAt` and `chatUnlockedAt`.
- MoMo, ZaloPay and bank transfer remain simulator methods; no real gateway is called.

Current endpoints remain:

- `GET /api/v1/matches/{matchId}/payment`
- `POST /api/v1/matches/{matchId}/payment/pay`

See `API_PHASE_09.md` for the canonical current behavior.
