# EmailPlatform

An event-driven email automation platform built with Next.js, Supabase, and Gmail SMTP. Define triggers, set conditions, attach email templates, and send emails automatically when events fire — with support for scheduled delivery.

**Live Demo:** https://email-platform-assesment.vercel.app

---

## What I Built

EmailPlatform lets you automate transactional and lifecycle emails based on events your app sends. The core idea:

1. You define an **email template** with HTML and placeholders like `{{first_name}}`
2. You create a **trigger** — attach it to an event name (e.g. `user.signed_up`), add conditions (e.g. only fire if `plan = pro`), and pick a template
3. Your app fires a **POST /api/events** with the event name and user data
4. The platform evaluates all matching triggers, checks conditions, deduplicates, and sends the email — or queues it for scheduled delivery

### Key Features

- **Template Library** — Create and edit HTML email templates with a live preview. AI-assisted drafting, rewriting, tone adjustment, and subject line generation
- **Trigger Rules** — Event-based triggers with a visual condition builder (plain English: "the user's plan is pro"). Supports 10+ operators across text, number, date, and boolean field types
- **Scheduled Delivery** — Set a future date/time and timezone on any trigger. Emails are queued and delivered automatically via cron
- **Event Playground** — Fire test events from the UI and see real-time results — which triggers matched, which were skipped and why, whether the email was sent or queued
- **Scheduled Emails Page** — View all pending and historical scheduled sends. Cancel pending emails or delete history entries
- **Deduplication** — `once_per_user` flag prevents sending the same email twice to the same user
- **Idempotency** — Pass an `idempotency_key` with events to prevent duplicate processing if the same event is sent twice
- **Unsubscribe support** — Users with `unsubscribed_product = true` are automatically skipped

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL + RLS) |
| Email | Gmail SMTP via Nodemailer |
| AI | OpenAI GPT-4o-mini |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel |
| Cron | GitHub Actions (every 5 minutes) |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── events/        # POST — ingest events, evaluate triggers, send emails
│   │   ├── cron/          # POST/GET — process due scheduled sends
│   │   ├── triggers/      # CRUD for triggers
│   │   ├── templates/     # CRUD for templates
│   │   ├── scheduled-sends/ # List + cancel/delete scheduled sends
│   │   ├── ai/            # OpenAI-powered email copy generation
│   │   └── test-send/     # Send a test email directly
│   ├── triggers/          # Triggers list + create/edit pages
│   ├── templates/         # Templates list + create/edit pages
│   ├── scheduled/         # Scheduled emails queue + history
│   └── playground/        # Fire test events from the UI
├── components/
│   ├── TriggerForm.tsx    # Full trigger editor with condition builder + schedule picker
│   ├── TemplateForm.tsx   # Template editor with AI helper
│   ├── ConditionBuilder.tsx # Visual condition builder
│   └── Sidebar.tsx        # Navigation
└── lib/
    ├── supabase-admin.ts  # Supabase service role client
    ├── rule-engine.ts     # Condition evaluation logic
    ├── template-renderer.ts # Placeholder substitution
    └── mailer.ts          # Gmail SMTP via Nodemailer
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) enabled
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Clone the repo

```bash
git clone https://github.com/STREIN-11/Email-Platform-Assesment.git
cd Email-Platform-Assesment/email-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the `email-platform` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

OPENAI_API_KEY=your_openai_api_key

GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
GMAIL_FROM_NAME=EmailPlatform

CRON_SECRET=any_random_secret_string
```

### 4. Run database migrations

Go to your **Supabase dashboard → SQL Editor** and run each migration file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_user_id_text.sql
supabase/migrations/003_scheduled_sends.sql
supabase/migrations/004_idempotency_key.sql
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to Use

### Create a Template

1. Go to **Templates → New Template**
2. Write your HTML email body — use `{{placeholder}}` syntax for dynamic values (e.g. `{{first_name}}`, `{{plan}}`)
3. Use the AI helper to draft, rewrite, or improve your copy
4. Save the template

### Create a Trigger

1. Go to **Triggers → New Trigger**
2. Choose the event that fires this trigger (e.g. `user.signed_up`)
3. Add conditions if needed (e.g. only send if `plan = pro`)
4. Select the template to send
5. Optionally set a scheduled date/time and timezone
6. Save the trigger

### Fire an Event

Send a POST request to your app:

```bash
curl -X POST https://your-app.vercel.app/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "user.signed_up",
    "user_id": "user_123",
    "payload": {
      "first_name": "John",
      "plan": "pro",
      "email": "john@example.com"
    },
    "idempotency_key": "signup-user_123"
  }'
```

Or use the **Playground** in the UI to fire test events without writing any code.

### Scheduled Emails

- Set a `scheduled_for` date/time on a trigger
- When the event fires, the email is queued instead of sent immediately
- View the queue at **/scheduled**
- Emails are processed automatically every 5 minutes via GitHub Actions
- Click **"Process now"** to trigger delivery manually

---

## API Reference

### POST /api/events

Ingest an event and trigger matching email sends.

**Body:**
```json
{
  "event_name": "user.signed_up",
  "user_id": "user_123",
  "payload": { "plan": "pro", "email": "user@example.com" },
  "idempotency_key": "optional-unique-key"
}
```

**Response:**
```json
{
  "event_id": "uuid",
  "results": [
    { "trigger_id": "uuid", "trigger": "Welcome Email", "status": "sent" },
    { "trigger_id": "uuid", "trigger": "Pro Upgrade", "status": "skipped", "reason": "conditions_not_met" }
  ]
}
```

### GET /api/cron

Manually trigger processing of due scheduled sends (no auth required — for testing).

### POST /api/cron

Same as GET but requires `Authorization: Bearer <CRON_SECRET>` header (used by GitHub Actions).

---

## Deployment

### Vercel

1. Push to GitHub — Vercel auto-deploys on every push to `main`
2. Add all environment variables in **Vercel → Settings → Environment Variables**
3. The `vercel.json` includes a daily cron job as a fallback

### GitHub Actions Cron (every 5 minutes)

Add these secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `APP_URL` | `https://your-app.vercel.app` |
| `CRON_SECRET` | Same value as your Vercel `CRON_SECRET` env var |

---

## Known Limitations & Trade-offs

These are conscious v1 trade-offs, not oversights:

- **No pagination** — trigger and template lists fetch all rows. Would add cursor-based pagination at scale
- **No retry logic** — failed sends stay failed. Next step would be exponential backoff with a `retry_count` column
- **No missing placeholder warnings** — if a template uses `{{first_name}}` but the payload omits it, it renders as an empty string silently
- **No rate limiting** on `/api/events` — would add API key authentication per customer in production
- **Vercel Hobby cron** — limited to once per day, worked around using GitHub Actions every 5 minutes
