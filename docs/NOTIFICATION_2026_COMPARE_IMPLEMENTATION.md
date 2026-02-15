# 2026 Notification Features — Compare & Implementation

## Functional Categorization

| Requested Bucket | Implemented Mapping | Status |
|---|---|---|
| Urgency-Driven | `URGENCY_DRIVEN` bucket support + high-priority handling in nudge filtering | ✅ Implemented |
| Morning Briefing | Existing `GET /api/habits/briefing` + bucket-aware settings | ✅ Implemented |
| Behavioral Nudges | `BEHAVIORAL_NUDGE` type used for streak risk nudges with positive tone | ✅ Implemented |
| 3-Week Advance Alerts | `ADVANCE_ALERT_3WEEK` type used in exam warning pipeline | ✅ Implemented |
| Transaction/System | `TRANSACTION_SYSTEM` type + automatic system nudge on successful habit logs | ✅ Implemented |

## Design Strategy: Nudges, Not Alarms

| Requested Behavior | Implementation | Status |
|---|---|---|
| Contextual Timing | Streak nudges use preferred hour from recent behavior (`computePreferredNudgeTime`) | ✅ Implemented |
| Interactive Decision Buttons | Existing quick actions in WhatsApp reminder flow (`Mark as Completed`, `Snooze 1 Hour`, `✨ Break it down`), mirrored in nudge metadata | ✅ Implemented |
| Lock-Screen Persistence | Existing mobile bridge + lock-screen live session contract (`focusBridge.ts`, lock screen contract doc) | ✅ Already present |
| Positive Motivation | Loss-framed copy replaced with supportive framing in streak/exam messages | ✅ Implemented |

## Reducing Notification Fatigue

| Requested Behavior | Implementation | Status |
|---|---|---|
| Category-Level Controls | New user settings with per-bucket toggles (`enabledBuckets`) | ✅ Implemented |
| Quiet Hours & Focus Profiles | New `quietHours` and `focusProfiles` in settings, non-urgent nudge suppression | ✅ Implemented |
| Grouped Summaries | Digest mode collapses multiple non-urgent nudges into one summary item | ✅ Implemented |

## API Additions

- `GET /api/habits/nudges/settings`
- `PUT /api/habits/nudges/settings`

## Notes

- Notification settings are persisted without schema migration by writing a `SYSTEM_PREFS` nudge record with serialized settings in `metadata`.
- Existing clients continue to work because legacy nudge types are still accepted in schemas and constants.
