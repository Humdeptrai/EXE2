# Frontend architecture - Phase 08

The responsive web frontend follows the supplied FE reference conventions without modifying the reference project.

- `components`: reusable brand, UI, layout and route guards
- `config`: environment and Axios transport configuration
- `context`: authentication and current-user session state
- `features/<feature>/components|pages|utils`: feature-owned UI and logic
- `routes`: public/private route composition
- `services`: API boundaries and token persistence
- `types`: shared API contracts

Rules:

1. Pages call context/services, never Axios directly.
2. Axios owns access-token attachment and one refresh retry.
3. `AuthContext` owns authentication, profile and current mode.
4. Consumer/Provider are product modes, not security roles.
5. One account may post work and accept other users' work.
6. Every screen is mobile-first and scales to tablet/desktop.
7. Bottom navigation is used below `lg`; the desktop sidebar starts at `lg`.
8. Feature code stays inside its feature folder so later phases can be refactored independently.
9. Job posting uses `jobService`; form pages do not construct HTTP requests directly.
10. Matching/swipe behavior belongs to the matching feature and must use real backend state, never page-local mock data.

11. Realtime chat uses REST services for history/state and a dedicated WebSocket/STOMP service for live delivery; pages do not construct socket frames directly.
