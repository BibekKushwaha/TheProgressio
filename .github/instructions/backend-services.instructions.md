---
description: "Use when editing Express backend services in apps/auth-service, apps/planner-service, apps/habit-service, or apps/analytics-service. Covers controller-service-route boundaries, shared schema usage, and service-side testing expectations."
name: "Backend Service Conventions"
applyTo: "apps/*-service/src/**/*.ts"
---
# Backend Service Conventions

- Keep the existing service layering intact: routes register endpoints, controllers handle request and response flow, and reusable business logic belongs in service or helper modules rather than growing controller files further.
- Reuse shared types and validation from `@repo/schemas` and data access from `@repo/db` instead of redefining request, response, or persistence shapes inside a service.
- In service code, prefer `@repo/*` imports for workspace packages and relative imports within the same service. Do not import source files directly from another app.
- Keep controller behavior explicit: validate inputs early, return clear HTTP status codes, and isolate network, queue, AI, or side-effect integrations behind service helpers so routes and controllers stay thin.
- When backend logic changes in a meaningful way, update or add nearby Vitest coverage in that service's `tests/` directory. Favor focused mocks around database and external boundaries rather than broad end-to-end setup.