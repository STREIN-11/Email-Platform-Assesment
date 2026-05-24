# Email Platform

A non-engineer-friendly email template and trigger management system. Built with Next.js 14, Supabase, OpenAI, and Resend.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` via the SQL editor
3. Copy your project URL and keys

### 2. Resend

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add and verify your sending domain (or use `onboarding@resend.dev` for testing)

### 3. OpenAI

1. Get an API key from [platform.openai.com](https://platform.openai.com)

### 4. Environment

Copy `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

### 5. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## End-to-end demo

1. Go to **Templates** → create a template with subject `Welcome to {{plan}}, {{name}}!` and an HTML body
2. Go to **Triggers** → create a trigger on event `user.plan_upgraded`, link the template, add condition `plan eq pro`, check "once per user"
3. Go to **Event Playground** → fire the example event
4. Watch the engine output — the email is sent via Resend

---

## Architecture

See [DECISIONS.md](./DECISIONS.md) for all design decisions.
