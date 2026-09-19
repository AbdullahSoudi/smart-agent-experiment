-- Migration: Add student_name and current_scenario to sessions, and scenario_id to interactions
-- Task: T54.2 — Add student identity + sequential journey foundation
-- Source of Truth: PROJECT.md & research/scenarios/JOURNEY.md

alter table public.sessions
  add column if not exists student_name text null;

alter table public.sessions
  add column if not exists current_scenario integer null;

alter table public.interactions
  add column if not exists scenario_id integer null;