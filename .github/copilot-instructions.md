# Student Activity Tracker Guidelines

## Architecture

- Treat this repo as a Turbo monorepo with clear app and package boundaries. Keep service-specific logic inside its owning app, and move shared contracts, schemas, state, or database access into the existing `@repo/*` packages instead of duplicating them.
- Prefer public package entry points and existing aliases. In `apps/docs`, use local `@/` imports for app-local modules and `@repo/*` for shared packages. In services and packages, prefer `@repo/*` plus relative imports rather than reaching into another app's source tree.
- Keep changes scoped to the task. Do not expand a feature change into cross-service or cross-package refactors unless the task clearly depends on them.

## Build And Test

- Match the test style to the target area. `apps/docs` uses Vitest with `jsdom` and React Testing Library, while services use Vitest with the `node` environment.
- When changing logic with meaningful branching, validation, or data transformation, add or update the nearest relevant Vitest coverage rather than leaving the behavior unverified.
- Use workspace scripts and per-package scripts that already exist before introducing new commands or tools.

## Conventions

- Follow the TypeScript, ESLint, and package conventions already inherited from `@repo/typescript-config` and `@repo/eslint-config`; prefer fitting into those shared configs over creating one-off local patterns.
- Keep frontend pages focused on composition and move reusable stateful behavior into hooks or feature components. Keep backend controllers thin when behavior naturally belongs in services or shared helpers.
- Reuse existing schemas and typed contracts from `@repo/schemas` and existing store/database access from `@repo/store` and `@repo/db` before introducing new shapes.