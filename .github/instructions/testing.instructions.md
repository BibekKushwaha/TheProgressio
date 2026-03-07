---
description: "Use when writing or updating Vitest coverage, React Testing Library tests, service endpoint tests, or when changing logic with branching, validation, parsing, or data transformation. Covers test placement, environment expectations, and mocking patterns used in this repo."
name: "Testing Conventions"
applyTo: "apps/**/tests/**/*.{test,spec}.{ts,tsx}, packages/**/tests/**/*.{test,spec}.{ts,tsx}"
---
# Testing Conventions

- Keep tests near the existing package or app-level `tests/` directory and follow the current `*.test.ts` or `*.test.tsx` naming pattern.
- Match the target runtime instead of inventing new harnesses: `apps/docs` tests use Vitest with `jsdom` and React Testing Library, while services use Vitest with the `node` environment and HTTP-style tests where appropriate.
- Mock external boundaries at the nearest stable seam. In frontend tests, mock hooks, store selectors, and browser-only dependencies rather than over-rendering the whole app. In backend tests, mock database clients, queues, and third-party integrations while importing the Express app without starting a real server.
- Assert behavior users or callers care about: rendered content, accessible text, returned status codes, parsed outputs, and state transitions. Avoid brittle assertions tied to incidental implementation details unless the implementation detail is the contract.
- When a code change affects branching, validation, parsing, or transformations, update the nearest relevant test coverage in the same change rather than leaving the new path unverified.