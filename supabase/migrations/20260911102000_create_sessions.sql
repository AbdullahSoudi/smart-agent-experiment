-- Migration: Create sessions table
-- Task: T21 — Create sessions table
-- Source of Truth: PROJECT.md Section 6

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  student_code text not null,
  status text not null,
  current_node text not null,
  scenario_version text not null,
  prompt_version text not null,
  provider text not null,
  model_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null
);

-- Enable Row Level Security
alter table public.sessions enable row level security;

-- Revoke direct access from anon and authenticated roles
revoke all on table public.sessions from anon, authenticated;
