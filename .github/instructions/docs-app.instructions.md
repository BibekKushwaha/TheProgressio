---
description: "Use when editing apps/docs Next.js pages, dashboard UI, React components, hooks, or form flows. Covers docs-app structure, shared package usage, and UI consistency."
name: "Docs App Conventions"
applyTo: "apps/docs/**/*.{ts,tsx}"
---
# Docs App Conventions

- Keep route pages and layouts focused on orchestration. Move reusable form logic, parsing, async state, and cross-field behavior into hooks or feature components instead of expanding page files further.
- Prefer existing workspace boundaries and imports. Reuse `@repo/store`, `@repo/schemas`, and local `@/` modules rather than re-declaring contracts, auth state, or API shapes inside the docs app.
- Preserve the established docs-app UI language: Tailwind utility classes, bold gradient/glass surfaces, and motion that supports state changes or feedback. Match nearby screens before introducing a new visual pattern.
- Keep forms explicit. Surface validation close to the field, pass only the state each child component needs, and avoid hiding important submit or mode-switch behavior behind implicit side effects.
- Make focused changes. Do not broaden a docs-app task into service, schema, or package refactors unless the task clearly requires a cross-package change.