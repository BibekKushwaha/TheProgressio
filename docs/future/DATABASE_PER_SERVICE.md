# Database-per-Service Migration Guide (Future)

This document is not enforced by runtime today.

The current system uses a **shared database**. See `docs/DATABASE_STRATEGY.md`.

---

## Overview

Each microservice can migrate to its own Prisma schema in its `prisma/` directory. This follows the **Database-per-Service** pattern, ensuring each service owns its independent state.

## Architecture

```
apps/
├── auth-service/prisma/schema.prisma      → AUTH_DATABASE_URL
├── planner-service/prisma/schema.prisma   → PLANNER_DATABASE_URL
├── habit-service/prisma/schema.prisma     → HABIT_DATABASE_URL
├── analytics-service/prisma/schema.prisma → ANALYTICS_DATABASE_URL
packages/
└── db/prisma/schema.prisma                → DATABASE_URL (shared, legacy)
```

## Environment Variables

Each service needs its own database URL:

```env
# Auth Service
AUTH_DATABASE_URL=postgresql://user:pass@localhost:5432/transition_auth

# Planner Service
PLANNER_DATABASE_URL=postgresql://user:pass@localhost:5432/transition_planner

# Habit Service
HABIT_DATABASE_URL=postgresql://user:pass@localhost:5432/transition_habits

# Analytics Service
ANALYTICS_DATABASE_URL=postgresql://user:pass@localhost:5432/transition_analytics

# Shared (legacy, still used by @repo/db during transition)
DATABASE_URL=postgresql://user:pass@localhost:5432/transition
```

## Migration Steps

### Phase 1: Create separate databases
```bash
createdb transition_auth
createdb transition_planner
createdb transition_habits
createdb transition_analytics
```

### Phase 2: Generate clients for each service
```bash
cd apps/auth-service && npx prisma generate
cd apps/planner-service && npx prisma generate
cd apps/habit-service && npx prisma generate
cd apps/analytics-service && npx prisma generate
```

### Phase 3: Push schemas (dev only)
```bash
cd apps/auth-service && npx prisma db push
cd apps/planner-service && npx prisma db push
cd apps/habit-service && npx prisma db push
cd apps/analytics-service && npx prisma db push
```

### Phase 4: Data migration
1. Export data from the shared DB per domain
2. Import into each service's own database
3. Verify data integrity

### Phase 5: Switch services to own clients
Each service creates its own PrismaClient instance from its local generated client instead of importing from `@repo/db`.

## Cross-Service Communication

Services communicate via:
- **BullMQ events** (task.created, task.completed, etc. via Redis)
- **HTTP APIs** (service-to-service with internal auth)
- **userId as opaque string** (no cross-DB foreign keys)

