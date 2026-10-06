-- Clean provider-neutral PostgreSQL bootstrap schema for research experiment
-- Target: Neon PostgreSQL (server-side Next.js persistence)
-- Tables: sessions, interactions

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  student_name text null,
  student_code text not null,
  status text not null,
  current_scenario integer null,
  current_node text not null,
  scenario_version text not null,
  prompt_version text not null,
  provider text not null,
  model_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null
);

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  scenario_id integer null,
  node_id text not null,
  student_answer text null,
  classification text null,
  agent_feedback text null,
  next_node text null,
  decision_time_ms integer null,
  turn_kind text null,
  created_at timestamptz not null default now()
);

-- Performance indexes for application query patterns
create index if not exists idx_sessions_student_code on sessions(student_code);
create index if not exists idx_interactions_session_id on interactions(session_id);
