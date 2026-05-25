-- Add idempotency key to prevent duplicate event processing
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_events_idempotency_key
  ON public.events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
