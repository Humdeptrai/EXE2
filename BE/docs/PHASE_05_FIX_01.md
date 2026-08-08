# Phase 05 Fix 01

Fixed PostgreSQL error `function lower(bytea) does not exist` in the discovery feed query.

Cause: optional `keyword` and `location` parameters were passed as `null` and wrapped in `lower(...)`. PostgreSQL could bind the null parameter as `bytea`, while `lower` accepts textual types.

Resolution:
- Normalize text filters to lowercase strings.
- Use an empty string to represent an omitted filter.
- Apply `lower(...)` only to text columns, not nullable parameters.
