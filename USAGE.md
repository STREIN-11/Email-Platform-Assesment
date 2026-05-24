# EmailPlatform — Usage Guide & Workflow

> Event-driven email automation for non-technical teams. Build templates, define rules, and ship emails without writing code.

---

## Table of Contents

1. [Setup & Configuration](#1-setup--configuration)
2. [Application Overview](#2-application-overview)
3. [Templates](#3-templates)
4. [Triggers](#4-triggers)
5. [Conditions Reference](#5-conditions-reference)
6. [Event Playground](#6-event-playground)
7. [AI Content Helper](#7-ai-content-helper)
8. [End-to-End Workflow](#8-end-to-end-workflow)
9. [API Reference](#9-api-reference)
10. [Database Schema](#10-database-schema)
11. [How the Rule Engine Works](#11-how-the-rule-engine-works)
12. [Scaling Considerations](#12-scaling-considerations)

---

## 1. Setup & Configuration

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Supabase account | — |
| Resend account | — |
| OpenAI account | — |

### Install & Run

```bash
cd email-platform
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@yourdomain.com
```

> **Where to find these:**
> - Supabase → Project Settings → API
> - Resend → API Keys
> - OpenAI → Platform → API Keys

### Database Migration

1. Go to your Supabase project → **SQL Editor**
2. Paste and run the contents of `supabase/migrations/001_initial_schema.sql`
3. This creates all tables, indexes, RLS policies, and seed data

---

## 2. Application Overview

The platform has three main sections accessible from the left sidebar:

```
┌─────────────────────────────────────────────────────┐
│  Sidebar          │  Main Content                   │
│                   │                                 │
│  📧 Templates     │  Browse / edit / preview        │
│  ⚡ Triggers      │  Define automation rules        │
│  🧪 Playground    │  Test the full delivery loop    │
└─────────────────────────────────────────────────────┘
```

**Core loop:**

```
Your app fires an event
        ↓
POST /api/events  →  Rule engine evaluates triggers
        ↓
Conditions match + dedup passes
        ↓
Template rendered with payload data
        ↓
Email sent via Resend  →  Logged to send_log
```

---

## 3. Templates

### What is a template?

A template is a reusable email with a subject line and HTML body. Dynamic values are injected at send time using `{{placeholder}}` syntax.

### Creating a Template

1. Go to **Templates** → click **New Template**
2. Fill in:
   - **Name** — internal label (e.g. `Welcome to Paid`)
   - **Subject** — supports placeholders (e.g. `Welcome to {{plan}}, {{name}}!`)
   - **Description** — optional, shown in the library
   - **Tags** — comma-separated (e.g. `onboarding, billing`)
3. Write your HTML body in the **HTML** tab
4. Switch to **Preview** to see it rendered
5. Click **Create Template**

### Placeholder Syntax

Use `{{field_name}}` anywhere in the subject or HTML body. The field name must match a key in the event payload.

```html
<p>Hi {{name}},</p>
<p>You're now on the <strong>{{plan}}</strong> plan.</p>
<a href="{{dashboard_url}}">Go to your dashboard →</a>
```

When the engine sends this email with payload `{ "name": "Alex", "plan": "Pro" }`, it renders:

```html
<p>Hi Alex,</p>
<p>You're now on the <strong>Pro</strong> plan.</p>
```

### Editing a Template

1. Click any template row in the library
2. Edit fields inline — changes are not saved until you click **Save Changes**
3. Use the **Preview** tab to verify rendering before saving

### Sending a Test Email

On any saved template's edit page:

1. Scroll to **Send Test Email**
2. Enter a recipient address
3. Click **Send** — the template is rendered with sample data `{ name: "Test User", email: "..." }` and delivered via Resend immediately

> Test sends bypass the trigger engine entirely — they always send regardless of conditions or deduplication.

---

## 4. Triggers

### What is a trigger?

A trigger connects an **event name** to a **template**, with optional **conditions** that must all be true before the email fires.

### Creating a Trigger

1. Go to **Triggers** → click **New Trigger**
2. Fill in the three sections:

#### Identity

| Field | Description | Example |
|-------|-------------|---------|
| Trigger Name | Internal label | `Upgrade → Welcome to Paid` |
| Event Name | Exact string to match against incoming events | `user.plan_upgraded` |
| Template | Which template to send | `Welcome to Paid` |

#### Conditions

Add one or more conditions that must all pass (AND logic). Each condition checks a field from the event payload.

See [Conditions Reference](#5-conditions-reference) for all operators.

#### Delivery Rules

| Setting | Description |
|---------|-------------|
| **Send only once per user** | If checked, the trigger will never fire twice for the same `user_id`. Enforced via `send_log`. |
| **Active** | Inactive triggers are completely skipped during event processing. Use this to pause without deleting. |

### Toggling a Trigger On/Off

From the Triggers list, click the **Active / Paused** badge on any row to toggle it instantly without opening the edit page.

---

## 5. Conditions Reference

Conditions are evaluated against the **merged payload** of the incoming event. The engine also merges the user's profile under the `user` key, so you can reference `user.unsubscribed_product`.

### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `equals` | Exact match (loose equality) | `plan` equals `pro` |
| `not equals` | Does not match | `plan` not equals `free` |
| `greater than` | Numeric comparison | `days_on_free` greater than `14` |
| `≥` | Greater than or equal | `storage_hits` ≥ `2` |
| `less than` | Numeric comparison | `team_size` less than `5` |
| `≤` | Less than or equal | — |
| `contains` | String includes substring | `email` contains `@company.com` |
| `not contains` | String does not include | `plan` not contains `enterprise` |

### Nested Field Access

Use dot notation to access nested payload fields:

```
user.unsubscribed_product  →  false
metadata.source            →  "organic"
```

### Example: The Assignment Brief

> "Send the upgrade email only if the user is not on the free plan and has not unsubscribed from product notifications."

| Field | Operator | Value |
|-------|----------|-------|
| `plan` | not equals | `free` |
| `user.unsubscribed_product` | equals | `false` |

Both conditions must pass (AND logic). If either fails, the trigger is skipped.

---

## 6. Event Playground

The Playground lets you fire a test event and observe the full engine output in real time — without needing to integrate your application.

### How to Use

1. Go to **Playground**
2. Edit the JSON payload in the left panel
3. Click **Fire Event**
4. The right panel shows:
   - The logged **Event ID**
   - Each trigger that was evaluated and its result (`Sent`, `Skipped`, or `Failed`)
   - The skip reason if applicable (`conditions_not_met`, `already_sent`, `unsubscribed`)
   - A collapsible raw JSON view of the full engine response

### Payload Structure

```json
{
  "event_name": "user.plan_upgraded",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "payload": {
    "plan": "pro",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `event_name` | ✅ | Must match a trigger's event name exactly |
| `user_id` | ✅ | UUID of the user — used for deduplication |
| `payload` | ✅ | Arbitrary key/value data — used for conditions and template rendering |

> The `email` field inside `payload` is used as the recipient address if no user profile exists in the database.

---

## 7. AI Content Helper

The AI helper is available inside the template editor. It uses **GPT-4o mini** to assist with email copy.

### Actions

| Action | What it does | Input needed |
|--------|-------------|--------------|
| **Improve** | Enhances clarity, tone, and engagement of the current HTML body | Uses current HTML automatically |
| **Rewrite** | Rewrites the email in a specified tone | Enter a tone (e.g. `friendly`, `urgent`, `professional`) |
| **Draft** | Generates a complete email from a description | Describe the email in plain English |
| **Subject Variants** | Generates 5 subject line alternatives | Uses current subject automatically |

### Using the Helper

1. Open any template in edit mode
2. Click the **AI Content Helper** panel to expand it
3. Select an action tab
4. Add any extra context if prompted
5. Click **Generate**
6. For subject variants — click any row to apply it directly to the subject field
7. For HTML results — click **Apply to editor** to replace the current HTML body

> The AI preserves `{{placeholder}}` tokens in the output so your dynamic values are never lost.

---

## 8. End-to-End Workflow

### Scenario: "Welcome to Paid" email

This is the canonical example from the assignment brief.

#### Step 1 — Create the template

- Name: `Welcome to Paid`
- Subject: `Welcome to {{plan_name}}, {{name}}! 🎉`
- HTML body:

```html
<h1>Welcome, {{name}}!</h1>
<p>You're now on the <strong>{{plan_name}}</strong> plan. Here's what's unlocked:</p>
<ul>
  <li>Unlimited projects</li>
  <li>Priority support</li>
  <li>Advanced analytics</li>
</ul>
<p>Questions? Reply to this email anytime.</p>
```

#### Step 2 — Create the trigger

- Name: `Upgrade → Welcome to Paid`
- Event Name: `user.plan_upgraded`
- Template: `Welcome to Paid`
- Conditions:
  - `plan` not equals `free`
  - `user.unsubscribed_product` equals `false`
- Send only once per user: ✅
- Active: ✅

#### Step 3 — Fire the event from your application

```bash
curl -X POST https://your-app.com/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "user.plan_upgraded",
    "user_id": "abc-123",
    "payload": {
      "plan": "pro",
      "plan_name": "Pro",
      "name": "Alex",
      "email": "alex@example.com"
    }
  }'
```

#### Step 4 — Engine processes the event

```
✅ Event logged          → events table
✅ Trigger found         → "Upgrade → Welcome to Paid"
✅ Conditions evaluated  → plan != free ✓, unsubscribed_product == false ✓
✅ Dedup check           → no prior send for user abc-123 on this trigger
✅ Template rendered     → {{name}} → "Alex", {{plan_name}} → "Pro"
✅ Email sent            → via Resend to alex@example.com
✅ Send logged           → send_log table, status: "sent"
```

#### Step 5 — Fire the same event again

```
✅ Event logged
✅ Trigger found
✅ Conditions pass
⏭  Dedup check          → already sent to abc-123 → SKIPPED
```

The user never receives a duplicate.

---

## 9. API Reference

### `POST /api/events`

Ingest an event and trigger the rule engine.

**Request body:**

```json
{
  "event_name": "string",
  "user_id": "uuid",
  "payload": { "key": "value" }
}
```

**Response:**

```json
{
  "event_id": "uuid",
  "results": [
    {
      "trigger_id": "uuid",
      "status": "sent | skipped | failed",
      "reason": "conditions_not_met | already_sent | unsubscribed",
      "provider_id": "resend_message_id"
    }
  ]
}
```

---

### `GET /api/templates`

List all templates. Supports search.

```
GET /api/templates?search=welcome
```

---

### `POST /api/templates`

Create a new template.

```json
{
  "name": "string",
  "subject": "string",
  "html_body": "string",
  "description": "string",
  "tags": ["string"],
  "placeholders": ["string"]
}
```

---

### `PUT /api/templates/:id`

Update a template by ID. Accepts any subset of template fields.

---

### `DELETE /api/templates/:id`

Delete a template. Also cascades to any triggers referencing it.

---

### `GET /api/triggers`

List all triggers with their linked template name and subject.

---

### `POST /api/triggers`

Create a new trigger.

```json
{
  "name": "string",
  "event_name": "string",
  "template_id": "uuid",
  "conditions": [
    { "field": "plan", "operator": "neq", "value": "free" }
  ],
  "once_per_user": true,
  "active": true
}
```

---

### `PUT /api/triggers/:id`

Update a trigger. Commonly used to toggle `active`:

```json
{ "active": false }
```

---

### `DELETE /api/triggers/:id`

Delete a trigger.

---

### `POST /api/test-send`

Send a test email for a template without going through the trigger engine.

```json
{
  "template_id": "uuid",
  "to": "recipient@example.com",
  "sample_data": { "name": "Test User", "plan": "Pro" }
}
```

---

### `POST /api/ai`

Generate AI-assisted email content.

```json
{
  "action": "improve | rewrite | draft | subject_variants",
  "content": "current HTML or subject string",
  "extra": "optional tone or description"
}
```

**Response for `subject_variants`:**

```json
{ "variants": ["Subject 1", "Subject 2", "Subject 3", "Subject 4", "Subject 5"] }
```

**Response for all other actions:**

```json
{ "result": "<p>Generated HTML...</p>" }
```

---

## 10. Database Schema

```
┌─────────────────┐       ┌─────────────────┐
│   templates     │◄──────│    triggers     │
│─────────────────│       │─────────────────│
│ id (uuid)       │       │ id (uuid)       │
│ name            │       │ name            │
│ subject         │       │ event_name      │
│ html_body       │       │ template_id ────┘
│ placeholders[]  │       │ conditions jsonb│
│ tags[]          │       │ once_per_user   │
│ description     │       │ active          │
└─────────────────┘       └────────┬────────┘
                                   │
┌─────────────────┐       ┌────────▼────────┐
│  user_profiles  │       │    send_log     │
│─────────────────│       │─────────────────│
│ id (uuid)       │       │ id (uuid)       │
│ email           │       │ trigger_id      │
│ metadata jsonb  │       │ template_id     │
│ unsubscribed_   │       │ event_id        │
│   product bool  │       │ user_id         │
└─────────────────┘       │ recipient_email │
                          │ status          │
┌─────────────────┐       │ provider_id     │
│    events       │       │ error           │
│─────────────────│       │ sent_at         │
│ id (uuid)       │       └─────────────────┘
│ event_name      │
│ user_id         │
│ payload jsonb   │
│ processed bool  │
└─────────────────┘
```

### Key Indexes

| Index | Purpose |
|-------|---------|
| `idx_triggers_event_name` | Fast lookup of active triggers by event name — critical at scale |
| `idx_send_log_user_trigger` | Fast deduplication check per user per trigger |
| `idx_events_name_processed` | Efficient event queue queries |

---

## 11. How the Rule Engine Works

The engine lives in `src/app/api/events/route.ts` and `src/lib/rule-engine.ts`. Here is the exact sequence for every incoming event:

```
POST /api/events
│
├─ 1. Validate request (event_name + user_id required)
│
├─ 2. INSERT into events table → get event.id
│
├─ 3. SELECT triggers WHERE event_name = ? AND active = true
│      (uses idx_triggers_event_name — O(log n) even with thousands of triggers)
│
├─ 4. For each matching trigger:
│   │
│   ├─ 4a. Fetch user_profile for user_id
│   │
│   ├─ 4b. evaluateConditions(trigger.conditions, { ...payload, user: profile })
│   │       → All conditions must pass (AND logic)
│   │       → Supports dot notation: "user.unsubscribed_product"
│   │       → Skip if any condition fails
│   │
│   ├─ 4c. Check user.unsubscribed_product → skip if true
│   │
│   ├─ 4d. If once_per_user:
│   │       SELECT from send_log WHERE trigger_id = ? AND user_id = ? AND status = 'sent'
│   │       → Skip if a prior send exists
│   │
│   ├─ 4e. renderTemplate(html_body, subject, payload)
│   │       → Replace {{field}} tokens with payload values
│   │
│   ├─ 4f. resend.emails.send(...)
│   │
│   └─ 4g. INSERT into send_log (status: sent | failed)
│
└─ 5. UPDATE events SET processed = true
       Return { event_id, results[] }
```

### Condition Evaluation

```typescript
// All conditions must pass — AND logic
conditions.every((c) => evaluate(c, payload))

// Dot notation field access
"user.unsubscribed_product" → payload["user"]["unsubscribed_product"]
```

### Template Rendering

```typescript
// Simple token replacement — no templating engine dependency
subject.replace(/\{\{(\w+)\}\}/g, (_, key) => payload[key] ?? `{{${key}}}`)
```

Unresolved placeholders are left as-is (e.g. `{{missing_field}}`) rather than silently dropping content.

---

## 12. Scaling Considerations

### From 200 to 10,000 templates

- Templates are stored in Postgres — no in-memory limit
- The library search uses `ilike` + array containment — add a full-text index (`tsvector`) when the library exceeds ~5,000 templates
- Trigger lookup is indexed by `event_name` — adding more templates does not slow down event processing

### From 100 to 100,000 events/day

The current implementation processes events **synchronously** in the API route. For higher throughput:

1. Move event processing to a **background queue** (e.g. Supabase Edge Functions + pg_cron, or an external queue like BullMQ / SQS)
2. The API route inserts the event and returns immediately
3. A worker picks up unprocessed events and runs the engine

The engine itself is stateless — it can run in parallel workers without coordination.

### Deduplication at scale

The `send_log` table with `idx_send_log_user_trigger` handles deduplication efficiently. For very high volume, consider a Redis SET as a fast pre-check before hitting Postgres.

### Adding more condition operators

Add a new case to the `switch` in `src/lib/rule-engine.ts` — no schema changes required since conditions are stored as `jsonb`.

---

*Built with Next.js 14, Supabase, OpenAI, and Resend.*
