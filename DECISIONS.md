# Architecture Decisions

## Stack choices

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | Server components for data fetching, API routes for backend, single deploy |
| Database | Supabase (Postgres) | Structured data, RLS, no extra infra |
| Auth | Supabase Auth | Built-in, integrates with RLS |
| Email delivery | Resend | Clean API, generous free tier, good deliverability |
| LLM | OpenAI gpt-4o-mini | Cost-effective, fast, sufficient for copy tasks |

---

## Rule engine design

Conditions are stored as a **JSON array of `{field, operator, value}` objects** on the `triggers` table.

```json
[
  { "field": "plan", "operator": "eq", "value": "pro" },
  { "field": "user.days_on_free", "operator": "gte", "value": 14 }
]
```

**Why this shape:**
- Portable — no custom DSL to parse, just JSON
- Queryable — Postgres JSONB operators can filter triggers by condition content
- Extensible — add new operators without schema changes
- UI-friendly — maps directly to the condition builder rows

All conditions are AND-joined. OR logic can be added later by wrapping groups in an `any` array — the engine already isolates evaluation in `evaluateConditions()`.

**Scaling to thousands of triggers:**
- `idx_triggers_event_name` partial index (only active triggers) means the lookup is O(active triggers for that event), not O(all triggers)
- Conditions are evaluated in-process (no extra DB round-trips per condition)
- If volume grows, the event ingestion endpoint can be moved to a queue worker (e.g. SQS + Lambda) with the same engine logic

---

## Deduplication

`once_per_user` on a trigger checks `send_log` for an existing `(trigger_id, user_id, status=sent)` row before sending. This is a simple, auditable approach. At higher scale, a Redis SET per `(trigger_id, user_id)` would be faster.

---

## Unsubscribe

`user_profiles.unsubscribed_product` is checked at send time. The engine skips and logs a `skipped/unsubscribed` row. This is intentionally simple — a real system would have per-category unsubscribe flags.

---

## Template placeholders

`{{placeholder}}` syntax, replaced at render time with payload data. No template engine dependency — the renderer is 10 lines. Mustache or Handlebars could be swapped in if logic (loops, conditionals) is needed.

---

## AI helper

Four actions exposed via `/api/ai`:
- `draft` — generate a full HTML email from a description
- `rewrite` — change tone of existing HTML
- `subject_variants` — 5 subject line options
- `improve` — general copy/conversion improvements

All run against `gpt-4o-mini`. The system prompt enforces SaaS email conventions and instructs the model to preserve `{{placeholders}}`.

---

## What I'd add next

- Supabase Auth login page (currently API routes use service role — fine for internal admin)
- Per-category unsubscribe (transactional vs marketing)
- Trigger scheduling (send at time T after event, not immediately)
- OR condition groups in the rule engine
- Send log UI page with filtering by status/trigger/user
- Webhook endpoint for external event sources (Stripe, etc.)
