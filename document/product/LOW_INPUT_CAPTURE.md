# Low-Input Student Setup and Capture

## Problem

Students abandon planning tools that require heavy manual entry. In this product, timetable setup and habit creation still ask for too much structured input up front.

## Product Direction

Use `less input, more output` as the operating rule:

- parse first, ask second
- prefer one-line input, uploads, and quick review flows
- reuse existing storage and mutations
- never auto-write OCR or AI output directly

## What Ships Now

### Timetable import

Students can:

- paste timetable text
- upload `.txt`, `.csv`, `.pdf`, or image files
- review parsed timetable rows
- edit or remove rows before import
- import only valid or resolved rows

Timetable import writes through the existing timetable entry mutations and refreshes timetable/calendar views through the existing invalidation path.

## What Is Scaffolded

### Habit quick-create

Students can type a one-line habit idea and get a preview containing:

- name
- frequency
- target value
- unit
- optional category hint
- optional schedule hint

### Unified capture foundation

Parsed timetable and habit drafts now normalize into one shared capture envelope so a future universal capture surface can reuse the same review and confidence model.

## Safety Model

- preview before write
- deterministic parser first
- table/grid parser second
- AI fallback only for draft generation
- ambiguous subjects require explicit confirmation
- unresolved rows never silently create data

## Non-Goals

- no universal capture box in this sprint
- no AI or OCR auto-write path
- no rewrite of existing task NLP flows
- no replacement of the manual habit or timetable forms

## Monitoring

Track:

- preview request volume
- preview-to-import conversion
- abandonment after warnings
- parser confidence distribution
- subject resolution rate
- habit parse-to-create conversion

## Future Path

- dedicated subject resolver component
- richer OCR and table extraction
- voice capture integrated into the shared capture layer
- universal capture box for task, habit, exam, and reminder creation
