# Lock-Screen Live Session Contract

This API contract is intended for native/mobile clients (React Native, Flutter, Swift/Kotlin)
that need stable focus timer lifecycle APIs for lock-screen widgets / live activities.

## Base URL

`/api/activity/live`

## Session States

- `RUNNING`
- `PAUSED`
- `COMPLETED`
- `CANCELLED`

## Endpoints

### 1) Start Session

`POST /start`

Request:

```json
{
  "taskId": "task-uuid",
  "taskTitle": "Physics Mock Test",
  "plannedDurationMinutes": 25,
  "sessionType": "DEEP_WORK",
  "deviceId": "iphone-15-pro",
  "source": "ios-lock-screen",
  "recommendedStart": "09:00",
  "recommendedEnd": "09:25"
}
```

Response:

```json
{
  "message": "Live focus session started",
  "session": {
    "sessionId": "session-uuid",
    "status": "RUNNING",
    "elapsedSeconds": 0,
    "remainingSeconds": 1500
  }
}
```

### 2) Read Active Session

`GET /active`

Response:

```json
{
  "message": "Active focus session fetched",
  "session": { "sessionId": "session-uuid", "status": "RUNNING" }
}
```

If none:

```json
{
  "message": "No active focus session",
  "session": null
}
```

### 3) Pause Session

`PATCH /pause`

Request:

```json
{
  "sessionId": "session-uuid",
  "deviceId": "iphone-15-pro"
}
```

### 4) Resume Session

`PATCH /resume`

Request:

```json
{
  "sessionId": "session-uuid",
  "deviceId": "iphone-15-pro"
}
```

### 5) Heartbeat

`PATCH /heartbeat`

Request:

```json
{
  "sessionId": "session-uuid",
  "remainingSeconds": 840,
  "deviceId": "iphone-15-pro"
}
```

Recommended heartbeat interval: every 10-20 seconds while running.

### 6) Stop Session

`PATCH /stop`

Request:

```json
{
  "sessionId": "session-uuid",
  "outcome": "COMPLETED"
}
```

`outcome` values:

- `COMPLETED`
- `CANCELLED`

If the session duration is at least ~30 seconds, the backend writes a durable `ActivityLog` entry.

## Error Contract

Errors are returned as JSON with an HTTP status and stable code when available:

```json
{
  "message": "No active focus session found for this user/sessionId",
  "code": "NOT_FOUND"
}
```

Known codes:

- `NOT_FOUND`
- `CONFLICT`
- `BAD_REQUEST`

## Native Bridge Reference

For the Expo/mobile shell, the lock-screen integration bridge lives at:

- `apps/mobile/src/native/focusBridge.ts`

Bridge methods:

- `start(session, auth)`
- `update({ sessionId, remainingSeconds }, auth)`
- `pause(sessionId, auth)`
- `resume(sessionId, auth)`
- `stop(sessionId, auth, outcome)`
- `isSupported()`
