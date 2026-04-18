# TheProgressio

A unified academic productivity platform that combines:
- fast task capture (NLP + WhatsApp),
- planning (timetable/rotations),
- habit streaks + nudges,
- performance analytics (SWOT, GPA what-if, rank bands),
- local-first web persistence with sync.

## Repo layout

### Apps
- `apps/docs`: Web dashboard (Next.js)
- `apps/auth-service`: Auth + profile + family/mentor share links (Express)
- `apps/planner-service`: Tasks, timetable, notes, attendance, WhatsApp bot, sync (Express)
- `apps/habit-service`: Habits + streak engine + nudges + WhatsApp outbound (Express)
- `apps/analytics-service`: Predictions + analytics (Express)
- `apps/mobile`: Expo shell (not yet feature-parity with web)

### Packages
- `packages/store`: RTK Query + local-first (Dexie) + sync engine
- `packages/db`: Prisma schema + generated client
- `packages/schemas`: Zod API schemas/contracts
- `packages/cache`: Redis helpers

## Local development

### 1) Install deps
```sh
npm ci
```

### 2) Start infra (Postgres + Redis)
```sh
docker compose up -d postgres redis
```

### 3) Generate Prisma client
```sh
npx prisma generate --schema=./packages/db/prisma/schema.prisma
```

### 4) Run services + web dashboard
```sh
npm run dev
```

Services default ports:
- `apps/auth-service`: `http://localhost:4000`
- `apps/planner-service`: `http://localhost:4001`
- `apps/habit-service`: `http://localhost:4002`
- `apps/analytics-service`: `http://localhost:4003`
- `apps/docs`: `http://localhost:3000`

## Docs
- `docs/COMPARE_PHASES_STATUS.md`: roadmap feature matrix
- `docs/ARCHITECTURE.md`: C4-lite architecture + data flow + trust boundaries
- `docs/DATABASE_STRATEGY.md`: current DB strategy and future migration notes
