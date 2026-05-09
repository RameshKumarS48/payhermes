-- PayHermes Phase 0 — core schema
-- Run this in the Supabase SQL editor for your project

-- organizations: one per user (owner model)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

-- agents: workflow stored as JSON spec interpreted at call time
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations not null,
  name text not null,
  workflow jsonb not null default '{}',
  voice_id text not null default 'emily-en-us',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists organizations_owner_id_idx on organizations(owner_id);
create index if not exists agents_org_id_idx on agents(org_id);

-- Row Level Security
alter table organizations enable row level security;
alter table agents enable row level security;

-- Organization policies
create policy "Users can view their own org"
  on organizations for select
  using (owner_id = auth.uid());

create policy "Users can insert their own org"
  on organizations for insert
  with check (owner_id = auth.uid());

create policy "Users can update their own org"
  on organizations for update
  using (owner_id = auth.uid());

-- Agent policies
create policy "Users can view their org agents"
  on agents for select
  using (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

create policy "Users can manage their org agents"
  on agents for all
  using (
    org_id in (select id from organizations where owner_id = auth.uid())
  )
  with check (
    org_id in (select id from organizations where owner_id = auth.uid())
  );

-- updated_at trigger for agents
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger agents_updated_at
  before update on agents
  for each row execute function update_updated_at_column();
