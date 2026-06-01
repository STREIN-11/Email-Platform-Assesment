# Codebase Documentation

A deep-dive into every file, function, and concept in EmailPlatform. Read this to understand how the system works from scratch.

---

## Table of Contents

1. [How the System Works (Big Picture)](#1-how-the-system-works-big-picture)
2. [Project Structure](#2-project-structure)
3. [Database Schema](#3-database-schema)
4. [Core Libraries](#4-core-libraries)
5. [API Routes](#5-api-routes)
6. [UI Pages & Components](#6-ui-pages--components)
7. [Types](#7-types)
8. [Data Flow: End to End](#8-data-flow-end-to-end)
9. [Key Concepts Explained](#9-key-concepts-explained)

---

## 1. How the System Works (Big Picture)

```
Your App                EmailPlatform                    Gmail
   │                         │                             │
   │  POST /api/events        │                             │
   │ ─────────────────────►  │                             │
   │  { event_name,          │  1. Log event to DB         │
   │    user_id,             │  2. Find matching triggers  │
   │    payload }            │  3. Evaluate conditions     │
   │                         │  4. Check deduplication     │
   │                         │  5. Render template         │
   │                         │  6. Send or schedule        │
   │                         │ ──────────────────────────► │
   │                         │                          Send email
```

The core loop is:
- **Event in** → find triggers → check conditions → render template → **email out**

---

## 2. Project Structure

```
email-platform/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/                # All backend API endpoints
│   │   │   ├── events/         # Core event ingestion endpoint
│   │   │   ├── triggers/       # CRUD for triggers
│   │   │   ├── templates/      # CRUD for templates
│   │   │   ├── scheduled-sends/# Scheduled email queue management
│   │   │   ├── cron/           # Processes due scheduled sends
│   │   │   ├── upload/         # File upload for email attachments
│   │   │   ├── ai/             # OpenAI-powered email copy generation
│   │   │   └── test-send/      # Send a test email directly
│   │   ├── triggers/           # Triggers list, new, edit pages
│   │   ├── templates/          # Templates list, new, edit pages
│   │   ├── scheduled/          # Scheduled email queue UI
│   │   ├── playground/         # Fire test events from the browser
│   │   ├── layout.tsx          # Root layout with sidebar
│   │   └── page.tsx            # Home/overview page
│   ├── components/             # Reusable React components
│   │   ├── TriggerForm.tsx     # Full trigger editor
│   │   ├── TemplateForm.tsx    # Template editor with AI helper
│   │   ├── ConditionBuilder.tsx# Visual condition builder
│   │   ├── EmailBodyEditor.tsx # CodeMirror HTML editor
│   │   ├── AiHelper.tsx        # AI copy generation panel
│   │   └── Sidebar.tsx         # Navigation sidebar
│   ├── lib/                    # Core business logic
│   │   ├── rule-engine.ts      # Condition evaluation logic
│   │   ├── template-renderer.ts# Placeholder substitution
│   │   ├── mailer.ts           # Gmail SMTP email sending
│   │   ├── supabase-admin.ts   # Supabase server client
│   │   └── supabase-browser.ts # Supabase browser client
│   └── types/
│       └── index.ts            # All TypeScript type definitions
├── supabase/
│   └── migrations/             # SQL migration files
│       ├── 001_initial_schema.sql
│       ├── 002_user_id_text.sql
│       ├── 003_scheduled_sends.sql
│       └── 004_idempotency_key.sql
├── .github/
│   └── workflows/
│       └── cron.yml            # GitHub Actions cron every 5 minutes
└── vercel.json                 # Vercel deployment config
```

---

## 3. Database Schema

### `templates` table
Stores email templates with HTML body and subject.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Internal label |
| `description` | text | Optional description |
| `subject` | text | Email subject line (supports `{{placeholders}}`) |
| `html_body` | text | Full HTML email body (supports `{{placeholders}}`) |
| `placeholders` | text[] | List of placeholder names found in the template |
| `tags` | text[] | Optional tags for organisation |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

### `triggers` table
Defines when and to whom an email should be sent.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Internal label |
| `event_name` | text | The event that activates this trigger (e.g. `user.signed_up`) |
| `template_id` | uuid | Foreign key → templates |
| `conditions` | jsonb | Array of condition objects (see Condition type) |
| `once_per_user` | boolean | If true, only send once per user ever |
| `active` | boolean | If false, trigger is ignored |
| `scheduled_for` | timestamptz | If set, queue email instead of sending immediately |
| `schedule_timezone` | text | Timezone for the scheduled time (e.g. `Asia/Kolkata`) |

### `events` table
Log of every event received by the system.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `event_name` | text | Name of the event (e.g. `user.signed_up`) |
| `user_id` | text | ID of the user who triggered the event |
| `payload` | jsonb | Full event payload data |
| `processed` | boolean | Whether triggers have been evaluated |
| `idempotency_key` | text | Unique key to prevent duplicate processing |
| `created_at` | timestamptz | When the event was received |

### `send_log` table
Audit trail of every email sent or attempted.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `trigger_id` | uuid | Which trigger fired |
| `template_id` | uuid | Which template was used |
| `event_id` | uuid | Which event caused this |
| `user_id` | text | Who received it |
| `recipient_email` | text | Email address sent to |
| `status` | text | `sent`, `failed`, or `skipped` |
| `provider_id` | text | Message ID returned by Gmail |
| `error` | text | Error message if failed |
| `sent_at` | timestamptz | When it was sent |

### `scheduled_sends` table
Queue of emails waiting to be sent at a future time.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `trigger_id` | uuid | Which trigger created this |
| `template_id` | uuid | Which template to use |
| `event_id` | uuid | Which event caused this |
| `user_id` | text | Who to send to |
| `recipient_email` | text | Email address |
| `rendered_subject` | text | Pre-rendered subject (placeholders already filled) |
| `rendered_html` | text | Pre-rendered HTML (placeholders already filled) |
| `send_at` | timestamptz | When to send |
| `status` | text | `pending`, `sent`, `failed`, `cancelled` |
| `error` | text | Error if failed |
| `sent_at` | timestamptz | When it was actually sent |

### `user_profiles` table
Optional user data used for condition evaluation and email personalisation.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Matches auth.users id |
| `email` | text | User's email address |
| `metadata` | jsonb | Any extra user data |
| `unsubscribed_product` | boolean | If true, skip all emails for this user |

---

## 4. Core Libraries

### `src/lib/rule-engine.ts`

The brain of the system. Evaluates whether a trigger's conditions match the incoming event payload.

#### `getValue(payload, field)`
```ts
getValue({ user: { plan: "pro" } }, "user.plan") // → "pro"
```
Supports dot notation for nested fields. Walks the object path step by step. Used internally by `evaluate()`.

#### `toDate(val)`
Converts any value to a JavaScript `Date` object. Returns `null` if the value is not a valid date. Used for date-based condition operators.

#### `evaluate(condition, payload)` → `EvalResult`
Evaluates a single condition against the payload. Returns `{ pass: true }` or `{ pass: false, reason: "..." }`.

Supported operators:
| Operator | Meaning | Example |
|---|---|---|
| `eq` | equals | `plan = "pro"` |
| `neq` | not equals | `plan ≠ "free"` |
| `gt` | greater than | `team_size > 5` |
| `gte` | greater than or equal | `days_on_free >= 14` |
| `lt` | less than | `storage_hits < 3` |
| `lte` | less than or equal | `amount <= 100` |
| `contains` | string contains | `email contains "@company.com"` |
| `not_contains` | string does not contain | `email not contains "test"` |
| `date_after` | date is after a specific date | `created_at after 2024-01-01` |
| `date_before` | date is before a specific date | `trial_ended_at before 2024-06-01` |
| `date_after_days` | date was more than N days ago | `last_active_at more than 14 days ago` |
| `date_before_days` | date was less than N days ago | `trial_started_at within last 7 days` |

#### `evaluateConditions(conditions, payload)` → `boolean`
Runs `evaluate()` on every condition. Returns `true` only if ALL conditions pass (AND logic). Used in the events route to decide whether to send.

#### `getFailureReason(conditions, payload)` → `string | null`
Returns the human-readable reason why the first failing condition failed. Used to show in the Playground UI why a trigger was skipped.

---

### `src/lib/template-renderer.ts`

#### `renderTemplate(html, subject, data)` → `{ html, subject }`
Replaces `{{placeholder}}` tokens in both the HTML body and subject line with values from the data object.

```ts
renderTemplate(
  "<p>Hello {{first_name}}</p>",
  "Welcome {{first_name}}",
  { first_name: "Jane" }
)
// → { html: "<p>Hello Jane</p>", subject: "Welcome Jane" }
```

If a placeholder key is not found in data, it is left as-is (e.g. `{{first_name}}` stays unchanged rather than becoming empty). This makes missing placeholders visible in the email rather than silently disappearing.

---

### `src/lib/mailer.ts`

#### `sendEmail({ to, subject, html, attachments? })` → `messageId`
Sends an email via Gmail SMTP using Nodemailer. Uses port 465 with SSL (`secure: true`).

The `attachments` parameter is optional. Each attachment is:
```ts
{
  filename: string;    // e.g. "report.pdf"
  content: Buffer;     // file content as a Buffer
  contentType: string; // e.g. "application/pdf"
}
```

Credentials come from environment variables:
- `GMAIL_USER` — your Gmail address
- `GMAIL_APP_PASSWORD` — Gmail App Password (not your regular password)
- `GMAIL_FROM_NAME` — display name in the From field

---

### `src/lib/supabase-admin.ts`

Creates a Supabase client using the **service role key**. This bypasses Row Level Security (RLS) and has full database access. Used only in server-side API routes — never exposed to the browser.

```ts
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

---

### `src/lib/supabase-browser.ts`

Creates a Supabase client using the **anon key**. Respects RLS policies. Used in client-side code if needed.

---

## 5. API Routes

### `POST /api/events` — Core event ingestion

The most important endpoint. Everything flows through here.

**What it does step by step:**

1. **Parse request** — reads `event_name`, `user_id`, `payload`, `idempotency_key`, `attachments`, `recipients`
2. **Idempotency check** — if `idempotency_key` is provided, checks if this exact event was already processed. If yes, returns early with `{ deduplicated: true }` — no duplicate emails
3. **Log event** — inserts a row into the `events` table
4. **Find triggers** — queries all active triggers where `event_name` matches
5. **Process recipients** — for each recipient, calls `processRecipient()`
6. **Mark processed** — updates the event row with `processed: true`

**`processRecipient()` function:**

For each trigger:
1. Merges payload with user profile data
2. Runs `evaluateConditions()` — if fails, skips with reason
3. Checks `unsubscribed_product` — if true, skips
4. Checks `once_per_user` deduplication via `send_log`
5. If `scheduled_for` is set → inserts into `scheduled_sends` table
6. Otherwise → calls `renderTemplate()` then `sendEmail()`
7. Logs result to `send_log`

**Request body:**
```json
{
  "event_name": "user.signed_up",
  "user_id": "user_123",
  "payload": { "plan": "pro", "email": "user@example.com" },
  "idempotency_key": "signup-user_123",
  "attachments": []
}
```

---

### `GET /api/cron` and `POST /api/cron`

Processes all scheduled sends that are due.

- `GET` — no auth required, used for manual testing from browser
- `POST` — requires `Authorization: Bearer <CRON_SECRET>` header, used by GitHub Actions

**What it does:**
1. Queries `scheduled_sends` where `status = pending` AND `send_at <= now()`
2. For each due send, calls `sendEmail()` with the pre-rendered subject and HTML
3. Updates status to `sent` or `failed`
4. Writes to `send_log` for audit trail

Called automatically every 5 minutes by GitHub Actions.

---

### `POST /api/upload`

Accepts multipart form data with files. Returns base64-encoded file content to be passed along with events.

- Max file size: 10MB per file
- Allowed types: PDF, CSV, JPEG, PNG, GIF, WEBP

**Response:**
```json
{
  "attachments": [
    {
      "filename": "report.pdf",
      "content": "<base64 string>",
      "contentType": "application/pdf"
    }
  ]
}
```

---

### `POST /api/ai`

Calls OpenAI GPT-4o-mini to generate or improve email copy.

**Actions:**
| Action | What it does |
|---|---|
| `draft` | Writes a full HTML email from a description |
| `rewrite` | Rewrites existing HTML in a different tone |
| `subject_variants` | Generates 5 subject line alternatives |
| `improve` | Improves existing HTML for clarity and conversion |

Input is sanitized (control characters stripped, max 10,000 chars) and `max_tokens: 2000` is enforced to prevent unbounded API usage.

---

### `GET /api/triggers` and `POST /api/triggers`

- `GET` — returns all triggers with their linked template name
- `POST` — creates a new trigger

### `PUT /api/triggers/[id]` and `DELETE /api/triggers/[id]`

- `PUT` — updates an existing trigger (strips read-only fields before updating)
- `DELETE` — deletes a trigger

### `GET /api/templates` and `POST /api/templates`

- `GET` — returns all templates
- `POST` — creates a new template

### `PUT /api/templates/[id]` and `DELETE /api/templates/[id]`

- `PUT` — updates a template
- `DELETE` — deletes a template

### `GET /api/scheduled-sends`

Returns all scheduled sends with their linked trigger name, ordered by `send_at`.

### `DELETE /api/scheduled-sends/[id]`

- If status is `pending` → sets status to `cancelled`
- If status is `sent`, `failed`, or `cancelled` → hard deletes the row

### `POST /api/test-send`

Sends a test email for a specific template without firing any triggers. Used in the template editor to preview how an email looks.

---

## 6. UI Pages & Components

### `src/app/layout.tsx`

Root layout. Wraps every page with the `Sidebar` component and sets up the main content area with left margin to account for the fixed sidebar width (220px).

---

### `src/app/page.tsx` — Home

Overview page with cards linking to Templates, Triggers, and Playground. Shows a "How it works" diagram explaining the 3-step flow.

---

### `src/app/triggers/page.tsx` — Triggers List

Fetches all triggers from `/api/triggers` and displays them in a table. Each row shows:
- Trigger name and condition count
- Event name (in a code badge)
- Linked template name
- Active/Paused toggle (calls `PUT /api/triggers/[id]` on click)
- Edit and Delete buttons

---

### `src/app/triggers/new/page.tsx` and `src/app/triggers/[id]/page.tsx`

- `new` — renders `TriggerForm` with no initial data
- `[id]` — server component that fetches the trigger from Supabase and passes it to `TriggerForm` as `initial` prop

---

### `src/components/TriggerForm.tsx`

The main trigger editor. Contains 4 sections:

**1. Trigger Identity**
- Trigger name input
- `EventPicker` — shows all known event options as clickable cards. Selecting "Custom event…" shows a text input for a custom event name
- Template selector dropdown

**2. Conditions**
- Renders `ConditionBuilder`

**3. Schedule (Optional)**
- `ScheduleSection` — client-only component (avoids hydration mismatch)
- `SchedulePicker` — toggle to enable scheduling, date/time input, timezone selector
- `toUTC(localDt, tz)` — converts a local datetime string to UTC ISO string accounting for the selected timezone
- `safeFromUTC(utcIso, tz)` — converts a UTC ISO string back to local datetime string for display in the input

**4. Delivery Rules**
- `once_per_user` toggle
- `active` toggle

**`save()` function:**
Sends `POST` (new) or `PUT` (edit) to the triggers API. Converts `scheduled_for` from local time to UTC before saving.

---

### `src/components/ConditionBuilder.tsx`

Visual condition builder that lets non-engineers create conditions in plain English.

**Key sub-components:**

**`FieldPicker`** — dropdown showing fields grouped by category (Plan & Billing, Activity, Trial, Account, Custom). Clicking a field updates the condition.

**`OpPicker`** — shows operator options appropriate for the field type. Number fields get `is more than`, `is at most` etc. Date fields get `is after`, `was more than X days ago` etc. Boolean fields have no separate operator (it's baked into the label).

**`ValueInput`** — renders the right input type for the field:
- Text → text input
- Number → number input
- Boolean → Yes/No select
- Date → datetime-local input or number input (for "days ago" operators)

**`toSentence(condition)`** — converts a condition object to a human-readable sentence for the preview. Example: `"their plan is pro"`.

**`update(i, patch)`** — when a field changes, automatically resets the operator to the first valid one for the new field type and clears the value.

---

### `src/app/playground/page.tsx` — Event Playground

Lets you simulate events from the browser without writing any code.

**3-step form:**
1. **What happened?** — pick an event from active triggers or type a custom one
2. **Who did it?** — enter a user ID
3. **Event details** — key/value pairs that become the payload

**Attachments section** — file upload button that calls `/api/upload`, stores base64 results in state, and includes them in the event payload when firing.

**`fire()` function** — builds the payload from the form fields and POSTs to `/api/events`. Shows results on the right panel.

**Results panel** — shows each trigger that was evaluated with its status (sent, scheduled, skipped, failed) and a human-readable explanation. "Show technical details" expands the raw JSON response.

---

### `src/app/scheduled/page.tsx` — Scheduled Emails

Shows two sections:
- **Pending** — emails queued but not yet sent. Shows "overdue" badge if `send_at` is in the past. Has Cancel button
- **History** — sent, failed, and cancelled emails. Has Delete button

**`runCron()`** — calls `GET /api/cron` to manually process due sends. Used for testing without waiting for the GitHub Actions schedule.

**`cancel(id)`** — calls `DELETE /api/scheduled-sends/[id]`, updates status to `cancelled` in local state.

**`remove(id)`** — calls `DELETE /api/scheduled-sends/[id]`, removes the row from local state entirely.

---

### `src/components/Sidebar.tsx`

Fixed left navigation with links to Templates, Triggers, Scheduled, and Playground. Uses `usePathname()` to highlight the active route.

---

## 7. Types

Defined in `src/types/index.ts`:

### `Template`
Represents an email template with `id`, `name`, `subject`, `html_body`, `placeholders`, `tags`.

### `Condition`
A single condition rule:
```ts
{
  field: string;       // e.g. "plan" or "user.metadata.source"
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" |
            "contains" | "not_contains" |
            "date_after" | "date_before" |
            "date_after_days" | "date_before_days";
  value: string | number | boolean;
}
```

### `Trigger`
A trigger rule with `event_name`, `template_id`, `conditions[]`, `once_per_user`, `active`, `scheduled_for`, `schedule_timezone`.

### `ScheduledSend`
A queued email with pre-rendered subject and HTML, `send_at` timestamp, and `status`.

### `SendLog`
An audit record of a sent or failed email attempt.

---

## 8. Data Flow: End to End

### Immediate send flow

```
POST /api/events
  │
  ├─ Idempotency check (events table)
  ├─ Insert event row
  ├─ Query triggers WHERE event_name = ? AND active = true
  │
  └─ For each trigger:
       ├─ evaluateConditions(trigger.conditions, payload + user_profile)
       │    └─ If fails → log "skipped" with reason, continue
       ├─ Check unsubscribed_product
       │    └─ If true → log "skipped: unsubscribed", continue
       ├─ Check send_log for once_per_user
       │    └─ If already sent → log "skipped: already_sent", continue
       ├─ renderTemplate(html_body, subject, payload)
       └─ sendEmail(to, subject, html)
            └─ Insert send_log row (status: sent or failed)
```

### Scheduled send flow

```
POST /api/events (trigger has scheduled_for set)
  │
  └─ Same checks as above, but instead of sendEmail():
       └─ Insert scheduled_sends row (status: pending, send_at: future)

GitHub Actions (every 5 min) → GET /api/cron
  │
  └─ Query scheduled_sends WHERE status=pending AND send_at <= now()
       └─ For each row:
            ├─ sendEmail(recipient_email, rendered_subject, rendered_html)
            ├─ Update scheduled_sends status → sent
            └─ Insert send_log row
```

---

## 9. Key Concepts Explained

### Why Supabase service role key?
The service role key bypasses RLS policies. This is intentional — the API routes run server-side and need full database access. The anon key would be blocked by RLS. The service role key is never sent to the browser.

### Why pre-render templates for scheduled sends?
When an event fires, the payload data is available right then. If we stored the raw template and rendered it later at send time, the payload data would be gone. So we render the subject and HTML immediately when the event fires and store the rendered output in `scheduled_sends`.

### Why idempotency keys?
If your app retries a failed HTTP request, the same event could be processed twice, sending duplicate emails. By passing a unique `idempotency_key` (e.g. `signup-user_123`), the second request is detected and returned immediately without re-processing.

### Why GitHub Actions instead of Vercel cron?
Vercel Hobby plan only allows one cron job per day. GitHub Actions free tier allows scheduled workflows every 5 minutes with no restrictions.

### Why nodemailer instead of Resend/SendGrid?
Nodemailer with Gmail SMTP requires no paid account or domain verification — just a Gmail App Password. For a v1 assessment this removes external dependencies. The `sendEmail` function is abstracted so swapping to Resend would only require changing `mailer.ts`.

### What is `once_per_user`?
A flag on triggers that prevents the same email being sent to the same user more than once. Checked by querying `send_log` for an existing `sent` row with the same `trigger_id` and `user_id`. Useful for welcome emails, onboarding sequences etc.

### What are placeholders?
`{{variable}}` tokens in template subject and HTML body that get replaced with real values at send time. Example: `Hello {{first_name}}` becomes `Hello Jane` when the payload contains `{ first_name: "Jane" }`. If a placeholder key is missing from the payload, it stays as `{{first_name}}` rather than becoming empty.
