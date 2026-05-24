-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User profiles (mirrors auth.users, adds unsubscribe flag)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  metadata jsonb default '{}',
  unsubscribed_product boolean default false,
  created_at timestamptz default now()
);

-- Email templates
create table if not exists public.templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  subject text not null,
  html_body text not null,
  placeholders text[] default '{}',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Triggers: event name + condition rules + linked template
create table if not exists public.triggers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  event_name text not null,
  template_id uuid references public.templates(id) on delete cascade,
  conditions jsonb default '[]',
  once_per_user boolean default true,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Incoming events log
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  event_name text not null,
  user_id uuid,
  payload jsonb default '{}',
  processed boolean default false,
  created_at timestamptz default now()
);

-- Send log — deduplication + audit trail
create table if not exists public.send_log (
  id uuid primary key default uuid_generate_v4(),
  trigger_id uuid references public.triggers(id),
  template_id uuid references public.templates(id),
  event_id uuid references public.events(id),
  user_id uuid,
  recipient_email text not null,
  status text default 'sent',
  provider_id text,
  error text,
  sent_at timestamptz default now()
);

-- Indexes for performance at scale
create index if not exists idx_triggers_event_name on public.triggers(event_name) where active = true;
create index if not exists idx_send_log_user_trigger on public.send_log(user_id, trigger_id);
create index if not exists idx_events_name_processed on public.events(event_name, processed);

-- RLS
alter table public.templates enable row level security;
alter table public.triggers enable row level security;
alter table public.events enable row level security;
alter table public.send_log enable row level security;
alter table public.user_profiles enable row level security;

create policy "auth_all_templates" on public.templates for all using (auth.role() = 'authenticated');
create policy "auth_all_triggers" on public.triggers for all using (auth.role() = 'authenticated');
create policy "auth_all_events" on public.events for all using (auth.role() = 'authenticated');
create policy "auth_all_send_log" on public.send_log for all using (auth.role() = 'authenticated');
create policy "auth_all_profiles" on public.user_profiles for all using (auth.role() = 'authenticated');

create policy "service_all_templates" on public.templates for all using (auth.role() = 'service_role');
create policy "service_all_triggers" on public.triggers for all using (auth.role() = 'service_role');
create policy "service_all_events" on public.events for all using (auth.role() = 'service_role');
create policy "service_all_send_log" on public.send_log for all using (auth.role() = 'service_role');
create policy "service_all_profiles" on public.user_profiles for all using (auth.role() = 'service_role');
