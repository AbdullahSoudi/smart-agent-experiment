-- Migration: Create interactions table
-- Task: T22 — Create interactions table
-- Source of Truth: PROJECT.md Section 6 & SCENARIO_SPEC.md

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id),
  node_id text not null,
  student_answer text,
  classification text,
  agent_feedback text,
  next_node text,
  decision_time_ms integer,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (browser cannot directly access research interactions)
alter table public.interactions enable row level security;

-- Revoke direct application access from public/browser roles
revoke all on table public.interactions from anon, authenticated;
