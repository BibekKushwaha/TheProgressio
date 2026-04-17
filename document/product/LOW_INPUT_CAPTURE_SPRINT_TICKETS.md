# Low-Input Capture Sprint Tickets

## Ticket 1: Timetable Import Preview API

- Owner: `apps/planner-service`
- Goal: preview-only import endpoint for pasted or uploaded timetable input
- Deliverables:
  - `POST /api/timetable/import/preview`
  - `entries`, `detectedSubjects`, `warnings`, `parser`
  - no persistence in preview path

## Ticket 2: Timetable Parser Hardening

- Owner: `apps/planner-service`
- Goal: support practical line and table timetable formats
- Deliverables:
  - deterministic line parsing
  - spaced and pipe grid parsing
  - OCR normalization
  - overlap, duplicate, invalid-time, missing-field warnings
  - end-time inference with explicit warnings

## Ticket 3: Timetable Import Review UI

- Owner: `apps/docs`
- Goal: editable review UI before import
- Deliverables:
  - import entry point in timetable manager
  - row editing
  - confidence display
  - row warnings
  - bulk actions:
    - `Remove Invalid Rows`
    - `Apply Subject Mapping`

## Ticket 4: Subject Resolution Safety

- Owner: `apps/docs`
- Goal: prevent subject duplication during import
- Deliverables:
  - centralized subject matcher
  - normalized alias matching
  - `auto`, `ambiguous`, `new` states
  - score-aware ambiguous options
  - explicit new-subject creation

## Ticket 5: Habit Quick-Create Parse API

- Owner: `apps/habit-service`
- Goal: parse one-line habit input into a preview draft
- Deliverables:
  - `POST /api/habits/parse`
  - parse `name`, `frequency`, `targetValue`, `unit`, `scheduleHint`, `confidence`
  - no persistence side effects

## Ticket 6: Habit Quick-Create UI Scaffold

- Owner: `apps/docs`
- Goal: expose a secondary low-input habit flow
- Deliverables:
  - quick-create UI near the manual habit flow
  - preview before create
  - manual flow remains available

## Ticket 7: Unified Capture Foundation

- Owner: `apps/docs`
- Goal: normalize parsed drafts into one shared capture envelope
- Deliverables:
  - `apps/docs/lib/capture/`
  - normalized `CaptureDraft`
  - confidence, warning, and source helpers

## Ticket 8: Documentation and Rollout Notes

- Owner: Product/Engineering
- Goal: record scope, safety model, and rollout expectations
- Deliverables:
  - product doc
  - engineering breakdown
  - monitoring checklist
