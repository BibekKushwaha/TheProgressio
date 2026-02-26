# Database Strategy

## Current (enforced in runtime)

This repo currently runs with a **shared Postgres database + shared Prisma schema**:
- Prisma schema: `packages/db/prisma/schema.prisma`
- Services use `@repo/db` / `@repo/db/client` to access the same schema.
- `docker-compose.yaml` wires each service with `DATABASE_URL=.../transition` (shared).

This is intentional in the short term to keep:
- cross-service feature work simple,
- local development friction low,
- analytics + notifications consistent while mobile/offline parity is still in progress.

## Applying schema changes (local dev)

When `packages/db/prisma/schema.prisma` changes:
- Regenerate Prisma client: `npm run generate-db`
- Apply schema to your local Postgres:
  - quick/dev: `npx prisma db push --schema packages/db/prisma/schema.prisma`
  - migration-based: `npx prisma migrate dev --schema packages/db/prisma/schema.prisma`

## Future (optional migration)

DB-per-service is a valid target once boundaries are stable and operational readiness is higher.

The previous migration guide has been moved to `docs/future/DATABASE_PER_SERVICE.md`.
If/when you migrate:
- enforce per-service URLs in `docker-compose.yaml` (e.g. `AUTH_DATABASE_URL`, `PLANNER_DATABASE_URL`, etc),
- ensure each service runs Prisma migrations independently,
- replace cross-DB foreign keys with eventing + opaque IDs.
