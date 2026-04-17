# Low-Input Capture Engineering Breakdown

## Backend: `apps/planner-service`

- add timetable import preview route/controller/service path
- extract text from text/file sources
- parse deterministic line formats
- parse spaced and pipe table formats
- normalize OCR artifacts
- decorate rows with warnings
- infer missing end times
- return parser metadata
- compare preview rows against existing timetable entries

## Backend: `apps/habit-service`

- add one-line habit parse endpoint
- infer frequency, target, unit, category hint, and schedule hint
- keep endpoint preview-only

## Store: `packages/store`

- expose `usePreviewTimetableImportMutation`
- expose `useParseHabitMutation`
- type preview response with parser metadata
- type habit parse response with schedule hint
- keep preview as a mutation, not a cached query

## Frontend: `apps/docs`

- integrate timetable import into weekly timetable management
- keep preview UI isolated from write path
- allow partial import of resolved rows
- block only unresolved ambiguous rows
- keep subject matching in a reusable utility
- show confidence and warnings in the review UI
- integrate habit quick-create near the manual flow
- normalize parsed drafts via capture utilities

## Shared Capture Model

Use:

```ts
type CaptureDraft = {
  id: string;
  entityType: 'task' | 'habit' | 'exam' | 'timetable_entry';
  payload: unknown;
  confidence: number;
  source: 'text' | 'file' | 'voice' | 'image' | 'pdf' | 'whatsapp';
  warnings?: string[];
};
```

## Test Focus

- parser formats
- OCR normalization
- overlap and duplicate warnings
- missing end-time inference
- subject ambiguity handling
- habit parse unit and schedule hint
- capture normalization consistency
