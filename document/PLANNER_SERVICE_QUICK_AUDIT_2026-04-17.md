# Planner Service Quick Audit (2026-04-17)

## Scope
- Service: apps/planner-service
- Mode: Quick audit, hybrid dependencies
- Focus: correctness + resilience first, then test/lint/type health

## Commands Executed
1. npm run test -w @repo/planner-service
2. npm run lint -w @repo/planner-service
3. npm run check-types -w @repo/planner-service

## Results Snapshot
- Tests: 12 files passed, 1 failed; 120 tests passed, 1 failed.
- Lint: passed (no output, max warnings 0).
- Typecheck: passed (no errors).

## Implementation Update
- Fixed task route ordering so GET /api/tasks/categories is no longer shadowed by GET /api/tasks/:id.
- Restored WhatsApp internal-capture behavior while preserving the no-session guard for the fully mocked WhatsApp test harness.
- Validated the affected task and WhatsApp slices after the code changes.

## Architecture Summary
- Entry: src/index.ts mounts operational middleware/routes, global rate limit, and all API routers.
- Auth model:
  - Most planner routes are wrapped at mount time with isAuth + enforceReadOnlyWrites.
  - Payment, revenue, and WhatsApp integration routers are mounted without global auth; these rely on route-level guards/signature checks.
- Core dependencies:
  - DB: Prisma via @repo/db
  - Queue: BullMQ + Redis (toggle via QUEUE_ENABLED)
  - Integrations: Razorpay, Meta WhatsApp, Mistral/Gemini AI, Web Push
- Workers:
  - Push worker initialized at service startup.
  - Renewal/retry/reconciliation workers started outside test mode.

## Verified Findings (Ordered by Severity)

### 1) HIGH: Route-order bug shadows GET /api/tasks/categories
Evidence:
- In task routes, router.get('/:id', getTaskById) is defined before router.get('/categories', taskCategories).
- Express will match /categories as :id first for GET requests.
Impact:
- Intended categories endpoint is unreachable or behavior is ambiguous depending on handler internals.
Likely fix:
- Move router.get('/categories', taskCategories) above router.get('/:id', getTaskById).

### 2) HIGH: WhatsApp capture path now hard-requires active mobile session; existing test and likely client behavior regressed
Evidence:
- capture core returns 403 for internal source when no active session.
- hasActiveWhatsAppSession returns false on lookup errors, leading to deny-by-default.
- Test expectation still expects 201 for successful capture from WhatsApp payload and currently fails with 403.
Impact:
- Legitimate WhatsApp capture may be blocked when session table/model is unavailable, stale, or mocked incompletely.
- Backward compatibility risk for existing internal capture workflow.
Likely fix options:
- Make session check feature-flagged for internal capture route.
- Adjust tests and API contract explicitly if strict session requirement is intentional.
- Distinguish DB errors from true no-session and degrade gracefully for internal trusted path.

### 3) MEDIUM: Redis connection errors are noisy and repeated in test runs
Evidence:
- Multiple ECONNREFUSED errors to 127.0.0.1:6380 and ::1:6380 during test execution.
Impact:
- Signal-to-noise drop in CI and local diagnostics.
- Potential hidden flaky behavior if queue/cache calls are expected to fail-open but still emit unhandled logs.
Likely fix:
- Ensure test env defaults queue/cache to mocked mode consistently.
- Guard Redis clients in tests or set QUEUE_ENABLED=false and test-specific Redis config.

### 4) MEDIUM: Payment webhook path relies on raw body preservation through global JSON parser behavior
Evidence:
- Controller expects req.rawBody for webhook signature validation fallback logic.
- Global express.json verify hook stores rawBody; route-specific raw parser is not used.
Impact:
- Any middleware/order change that removes rawBody capture can silently break webhook signature verification.
Likely fix:
- Add route-local raw parser for /api/payments/webhook and /api/integrations/whatsapp/webhook or explicit invariant tests.

### 5) MEDIUM: Multiple external side effects in task completion/update flows can fail independently without durable retry
Evidence:
- Task side effects fan out to analytics/habit + queue; outage windows suppress retries temporarily.
Impact:
- Potential data drift between planner state and analytics/habit projections during outages.
Likely fix:
- Persist failed side effects for replay (DB outbox or queue-backed retry with dedupe key).

## Quick Wins (Same Day)
1. Reorder task routes to place static paths before parameterized :id path.
2. Decide WhatsApp internal-capture contract (session required or not) and align tests + docs.
3. Stabilize test env queue/cache defaults to suppress Redis connection noise.
4. Add contract tests proving webhook signature validation depends on raw body integrity.

## Follow-ups (Next Sprint)
1. Introduce durable outbox/retry pattern for habit/analytics side effects.
2. Add endpoint-to-dependency matrix in docs for failure-mode ownership.
3. Add explicit monitoring counters for side-effect suppression windows and recovery replay outcomes.

## Open Questions
1. Should internal WhatsApp capture trust x-whatsapp-secret enough to bypass active-session gating?
2. Is Redis expected on port 6380 in all dev/test contexts, or should this be fully optional in tests?
3. Is /api/tasks/categories consumed by any client today, and has it been silently failing?
