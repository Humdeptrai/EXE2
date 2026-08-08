# Backend architecture — Phase 02

## Dependency direction

`controller -> service -> serviceImpl -> repository -> entity`

Supporting packages:

- `dto/request`, `dto/response`: external API contracts
- `mapper`: entity-to-response mapping
- `security`: access-token generation, Google credential verification and token hashing
- `config`: Security, JWT and Swagger wiring
- `properties`: typed environment configuration
- `exception`: central error contract

## Authentication decisions

- Authorization role (`USER`/`ADMIN`) remains separate from marketplace mode (`CONSUMER`/`PROVIDER`).
- Local passwords are BCrypt hashes.
- Access tokens are short-lived HS256 JWTs.
- Refresh tokens are random opaque values; only SHA-256 hashes are stored in PostgreSQL.
- Refresh rotates the token pair and invalidates the prior session.
- Google `sub` is stored as the stable Google account identifier; email is used only for account linking.

## Database

PostgreSQL is the only runtime database for this phase. Hibernate `ddl-auto=update` is intentionally retained for MVP speed; schema migrations should replace it before production release.
