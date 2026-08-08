# Phase 09 - Two-sided Connection Payment

Responsive route:

- `/matches/:matchId/payment`

Both participants now pay their own fee:

- Consumer: 10,000 VND
- Provider: 5,000 VND

The page shows both payment states. Paying one side displays a waiting state; chat remains locked. When the second participant pays, the Match becomes a successful connection and the realtime chat button becomes available.

The payment UI continues to simulate MoMo, ZaloPay and bank transfer. No real payment gateway, Cloudinary configuration, or notification implementation is introduced in this phase.
