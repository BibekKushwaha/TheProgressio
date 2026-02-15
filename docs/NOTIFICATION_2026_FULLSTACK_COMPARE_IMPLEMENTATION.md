# 2026 Notifications — Full-Stack Compare & Implementation

## Scope Covered

- Backend services:
  - `apps/planner-service`
  - `apps/habit-service`
  - `apps/analytics-service`
- Frontend:
  - `apps/docs`
  - `packages/store`

## 1) Advanced Content & Rich Media

| Requirement | Implementation | Where |
|---|---|---|
| Progress templates | Progress payload (`current/total/label`) supported in notification metadata and rendered as visual bars | planner compose API + docs notification UI |
| Anatomy components | Title/body limits enforced (title 25–50, body <= 150) in compose schema | `@repo/schemas/notification` |
| Rich media support | GIF/VIDEO/IMAGE contract + platform size limits (Android <=10MB, iOS <=2MB) | `@repo/schemas/notification` |
| Lock-screen persistence | Existing live activity contract and bridge retained for focus sessions | analytics live APIs + mobile focus bridge + docs live widget |

## 2) Interactive & Action-Oriented

| Requirement | Implementation | Where |
|---|---|---|
| Interactive decision buttons | Up to 3 action buttons supported in payload and executed in UI (`MARK_COMPLETED`, `SNOOZE_1_HOUR`, `BREAK_IT_DOWN`) | planner compose schema + docs NotificationCenter |
| Direct reply | New API to submit quick in-notification reply to task/nudge | planner `/api/notifications/direct-reply` + docs NotificationCenter |
| Deep linking | Deep-link resolver endpoint + per-notification deep links in metadata + frontend open action | planner `/api/notifications/deeplink/:entityType/:entityId` + docs |

## 3) Smart Timing & Behavioral Intelligence

| Requirement | Implementation | Where |
|---|---|---|
| Peak activity optimization | Best send window computed from 21-day activity histogram | analytics `/api/stats/notifications/intelligence` |
| Environmental triggers | Motion/brightness-aware non-urgent suppression context endpoint | analytics `/api/stats/notifications/context` |
| Geolocation pings | Geofence-triggered nudge endpoint for library/campus/home/coaching center | planner `/api/notifications/geofence/ping` |
| Automatic silence periods | Quiet hours + focus profile suppression + category controls | habit nudge settings + docs settings UI |

## 4) Strategic Academic Reminders

| Requirement | Implementation | Where |
|---|---|---|
| Morning briefing | Existing briefing enhanced in UI with weather-smart tip and personalized badge | habit briefing API + docs MorningBriefing |
| Advance warning alerts | 3-week exam alert category (`ADVANCE_ALERT_3WEEK`) in nudge generation | habit nudge service |
| Drip campaigns | Revision drip campaign API (Mon/Wed/Fri schedule) | planner `/api/notifications/drip-campaign/revision` |
| Outcome-based nudges | Existing WhatsApp outcome nudge endpoint preserved | planner WhatsApp integration |

## 5) Fatigue & Retention

| Requirement | Implementation | Where |
|---|---|---|
| Category-level controls | Per-bucket toggles in persisted notification settings | habit settings API + docs settings |
| Grouped summaries/digests | Non-urgent nudges grouped into digest summary | habit nudge service |
| Positive motivation tone | Supportive message framing and `positiveTone` setting | habit nudge service + settings |
| WhatsApp integration | Existing interactive and outbound WhatsApp pathways retained and compatible | planner + habit outbound services |

## New/Updated Endpoints

### planner-service
- `POST /api/notifications/compose`
- `POST /api/notifications/direct-reply`
- `POST /api/notifications/drip-campaign/revision`
- `POST /api/notifications/geofence/ping`
- `GET /api/notifications/deeplink/:entityType/:entityId`

### habit-service
- `GET /api/habits/nudges/settings`
- `PUT /api/habits/nudges/settings`
- Enhanced `GET /api/habits/nudges` filtering/grouping behavior

### analytics-service
- `GET /api/stats/notifications/intelligence`
- `GET /api/stats/notifications/context`

## Frontend Data Layer Updates

- `packages/store/services/habitsApi.ts`:
  - Added notification settings types/hooks
  - Extended nudge interface for richer payload metadata
- `packages/store/services/tasksApi.ts`:
  - Added planner notification orchestration endpoints/hooks
- `packages/store/services/analyticsApi.ts`:
  - Added intelligence/context query endpoints/hooks

## Frontend UI Updates (apps/docs)

- `NotificationCenter`:
  - Renders rich media
  - Displays progress bars
  - Supports action buttons
  - Supports direct reply input
  - Supports deep-link open action
- `Settings`:
  - Category-level controls
  - Digest + positive-tone toggles
  - Intelligence/context insight surface
- `QuietHoursPanel`:
  - Persists quiet-hour settings to backend notification settings
- `MorningBriefing`:
  - Added weather-smart tip block

## Validation

- Planner tests: pass
- Analytics tests: pass
- Docs build: pass
