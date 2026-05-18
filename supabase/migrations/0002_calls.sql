-- Add phone_number to agents
alter table agents add column if not exists phone_number text;
create unique index if not exists agents_phone_number_idx on agents(phone_number) where phone_number is not null;

-- Calls table — one row per call attempt
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  status text not null default 'initiated'
    check (status in ('initiated', 'ringing', 'in_progress', 'completed', 'failed', 'busy', 'no_answer')),
  from_number text not null,
  to_number text not null,
  twilio_call_sid text,
  transcript jsonb not null default '[]',
  captured_data jsonb not null default '{}',
  duration_seconds integer,
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists calls_agent_id_idx on calls(agent_id);
create index if not exists calls_started_at_idx on calls(started_at desc);

-- RLS
alter table calls enable row level security;

create policy "Users can view their agent calls"
  on calls for select
  using (
    agent_id in (
      select a.id from agents a
      join organizations o on o.id = a.org_id
      where o.owner_id = auth.uid()
    )
  );

create policy "Service role can manage calls"
  on calls for all
  using (true)
  with check (true);
