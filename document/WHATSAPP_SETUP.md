# WhatsApp (Meta Cloud API) Setup

This repo supports a WhatsApp bot using the official **Meta WhatsApp Business Platform (Cloud API)**.

It covers:
- **Inbound** WhatsApp messages → `planner-service` webhook
- **Pairing** via `PAIR-XXXXXX` code (generated in the app)
- **Task actions** via WhatsApp for create, reschedule, and complete
- **Outbound nudges** (scheduled) via **template messages** from `habit-service`

---

## 1) Meta setup (required)

### A. Create / configure Meta app
1. Create a Meta Developer App.
2. Add the **WhatsApp** product to the app.

### B. Get credentials
From WhatsApp “API Setup”:
- **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
- **Access token** (temporary for dev; later use a permanent system-user token) → `WHATSAPP_ACCESS_TOKEN`

From App “Settings → Basic”:
- **App secret** → `WHATSAPP_APP_SECRET`

### C. Configure webhook
In the WhatsApp webhook settings:
- Callback URL:
  - `https://<PUBLIC_DOMAIN>/api/integrations/whatsapp/webhook`
- Verify token:
  - pick any random string → `WHATSAPP_VERIFY_TOKEN`
- Subscribe to at least the **messages** field.

### D. Create a template (for proactive nudges)
Scheduled nudges are sent as template messages (to work outside WhatsApp’s 24h customer-service window).

Create and approve a template:
- Template name: `study_nudge` (or your choice)
- Language: `en_US` (or your approved language)
- Body: should accept **one variable**, e.g.:
  - `Reminder: {{1}}`

---

## 2) Environment variables

### `planner-service` (inbound webhook + bot replies)
Required:
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET` (used to verify `x-hub-signature-256`)
- `WHATSAPP_VERIFY_TOKEN` (Meta webhook verification handshake)

Internal-only (used by non-Meta internal planner endpoints like `/capture`, `/templates/send`, etc. and not by the Meta webhook):
- `WHATSAPP_WEBHOOK_SECRET`

Optional:
- `WHATSAPP_GRAPH_VERSION` (default `v22.0`)
- `WHATSAPP_TRANSCRIBE_URL` (voice notes → transcription)
- `WHATSAPP_OCR_URL` (image OCR)

### `habit-service` (scheduled outbound nudges)
Required:
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_NUDGE_TEMPLATE_NAME` (default is `study_nudge`)
- `WHATSAPP_NUDGE_TEMPLATE_LANG` (default is `en_US`)

Optional:
- `WHATSAPP_GRAPH_VERSION` / `WHATSAPP_API_VERSION`
- `WHATSAPP_USER_PHONE_MAP={"<userId>":"<phoneDigits>"}` (dev override only)

### `apps/docs` (web UI)
Required (to show the bot number + enable the one-click WhatsApp pairing link):
- `NEXT_PUBLIC_WHATSAPP_BOT_NUMBER` (display number, e.g. `+15551234567`)

---

## 3) Local development (ngrok)

Meta requires a public HTTPS callback URL. The simplest approach is ngrok:

```bash
ngrok http 4001
```

Then set the webhook callback URL in Meta to:
`https://<NGROK_SUBDOMAIN>.ngrok-free.app/api/integrations/whatsapp/webhook`

---

## 4) Pairing flow (how it works)
1. User opens the web app → Settings → WhatsApp Bot.
2. App calls `auth-service` to generate (or reuse) a pairing code: `PAIR-XXXXXX`.
3. User sends the code to the bot number on WhatsApp.
4. Meta sends the inbound message to:
   - `planner-service` `POST /api/integrations/whatsapp/webhook`
5. `planner-service` verifies Meta signature (`x-hub-signature-256`) and:
   - finds the user by `whatsappPairingCode`
   - stores `user.whatsappNumber` (digits only)
   - sets `user.whatsappVerified=true`
   - clears `whatsappPairingCode`
6. UI polling shows “Paired”.
7. For normal WhatsApp task capture after pairing, the user must still have at least one active Study OS session (`MobileRefreshToken`). Pairing alone is not enough to authorize task actions.

---

## 5) Validation checklist
1. **Meta webhook verification handshake**
   - `GET /api/integrations/whatsapp/webhook` returns the challenge when:
     - `hub.verify_token === WHATSAPP_VERIFY_TOKEN`
2. **Webhook signature protection**
   - `POST /api/integrations/whatsapp/webhook` returns `401` when:
     - signature is missing/invalid
3. **Pairing**
   - Sending `PAIR-XXXXXX` from WhatsApp updates the user record and triggers a confirmation message.
4. **Task actions**
   - Sending a normal task message creates a task.
   - Sending a completion message like `complete chemistry assignment` marks the matched open task as completed.
   - Sending a reschedule message like `move chemistry assignment to tomorrow 7pm` updates the matched task due date.
5. **Outbound nudges**
   - A scheduled nudge should be delivered as a template message via `habit-service`.
