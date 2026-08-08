# Phase 07 - Connection Payment Simulator (superseded by Phase 09 revision)

The route remains:

- `/matches/:matchId/payment`

The current source no longer uses the original Consumer-only Phase 07 rule. Phase 09 revised the screen and backend to two-sided payment:

- Consumer pays 10,000 VND.
- Provider pays 5,000 VND.
- Chat stays locked until both sides are PAID.

See `PHASE_09.md` for the canonical current behavior.
