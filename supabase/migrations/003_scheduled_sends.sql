-- Run this in Supabase SQL Editor

-- Add schedule fields to triggers
alter table public.triggers
  add column if not exists scheduled_for timestamptz,
  add column if not exists schedule_timezone text default 'UTC';

-- Queue table for scheduled emails
create table if not exists public.scheduled_sends (
  id uuid primary key default uuid_generate_v4(),
  trigger_id uuid references public.triggers(id) on delete cascade,
  template_id uuid references public.templates(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  user_id text not null,
  recipient_email text not null,
  rendered_subject text not null,
  rendered_html text not null,
  send_at timestamptz not null,
  status text not null default 'pending',
  error text,
  created_at timestamptz default now(),
  sent_at timestamptz
);

create index if not exists idx_scheduled_sends_due
  on public.scheduled_sends(send_at)
  where status = 'pending';

alter table public.scheduled_sends enable row level security;

create policy "service_all_scheduled_sends"
  on public.scheduled_sends for all
  using (auth.role() = 'service_role');
