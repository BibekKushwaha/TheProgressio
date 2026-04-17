# Architecture (C4-lite)

This repo implements a web-first academic productivity platform with supporting microservices.

## Components

### Frontends
- `apps/docs` (Next.js): primary dashboard UI.
- `apps/mobile` (Expo): mobile shell (partial parity; lock-screen focus bridge exists).

### Backend services
- `apps/auth-service` (Express): authentication, profile, WhatsApp pairing, family/mentor share links.
- `apps/planner-service` (Express): tasks, categories, timetable/rotation, notes, attendance, notifications orchestration, WhatsApp inbound webhook/capture, sync endpoints.
- `apps/habit-service` (Express): habit + streak engine, nudge scheduling, outbound WhatsApp template messages.
- `apps/analytics-service` (Express): predictions (PERT/cycle-time), performance analytics (SWOT, rank bands), GPA what-if, notification intelligence/context.

### Shared packages
- `packages/db`: Prisma schema + generated client (shared DB schema today).
- `packages/store`: RTK Query data layer + local-first persistence (Dexie/IndexedDB) + sync engine.
- `packages/schemas`: Zod request/response contracts used by services.
- `packages/cache`: Redis cache helpers.

## Data flow (high level)

1. **User → Web UI**
   - The user interacts with `apps/docs`.
   - API calls go through RTK Query (`@repo/store`) to services.

2. **Auth**
   - `auth-service` issues a JWT access token stored in an HTTP-only cookie (`token`).
   - For native clients, Bearer access tokens are supported on many endpoints.

3. **Planner (core domain)**
   - Tasks, categories, notes, attendance live in `planner-service`.
   - AI-assisted parsing/subtasking/scan is implemented in `planner-service` (`AIService`).

4. **Events**
   - Planner emits events for cross-service side effects (BullMQ + internal HTTP).
   - Habit service consumes task events to drive habit automation + nudges.
   - Analytics service consumes task completion events to update stats.

5. **Local-first sync (web)**
   - `packages/store` persists tasks/categories to IndexedDB (Dexie).
   - A background sync engine pushes/pulls an operation log to `planner-service` `/api/sync/*`.

## Trust boundaries & secrets

### Public traffic
- Browser ↔ services: authenticated via cookie session.
- CORS is configured per service (dev allows wide origin; prod is locked to `FRONTEND_URL`).

### Internal service-to-service calls
- Internal endpoints rely on shared secrets (e.g. `ANALYTICS_INTERNAL_SECRET`, `HABIT_INTERNAL_SECRET`).
- Recommendation: keep these on private networks only in production.

### WhatsApp
- Inbound: Meta Cloud API → `planner-service` webhook (signature verified).
- Pairing: `auth-service` issues `PAIR-XXXXXX`, user sends to bot, webhook links phone number to user.
- Outbound: `habit-service` sends template messages (outside WhatsApp 24h window).

## Database model ownership (today)

The system currently runs with a **shared Postgres database schema** (Prisma in `packages/db`).
Services are separated at the API/process boundary but share the same DB schema.

Future: DB-per-service is possible, but not enforced in runtime today. See `docs/DATABASE_STRATEGY.md`.

## API contracts

- Service base URLs are configured via:
  - `NEXT_PUBLIC_*_SERVICE_URL` (web)
  - `EXPO_PUBLIC_*_SERVICE_URL` (mobile)

## Operational notes

### Running locally
- `docker-compose.yaml` provides Postgres + Redis + service containers.
- The root `npm run dev` starts the web dashboard + selected services via Turborepo.

### “Disable AI” mode
The web UI can run in “fallback-only” mode by sending `x-ai-disabled: 1` on planner requests.
Planner endpoints must treat that header as “do not call external AI providers”.

