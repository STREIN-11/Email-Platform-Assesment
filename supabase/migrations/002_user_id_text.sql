-- Allow any string as user_id, not just UUIDs
ALTER TABLE public.events ALTER COLUMN user_id TYPE text;
ALTER TABLE public.send_log ALTER COLUMN user_id TYPE text;
