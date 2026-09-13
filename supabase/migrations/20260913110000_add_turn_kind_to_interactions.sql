-- Migration: Add turn_kind to interactions
-- Task: T54 — Fix only approved pilot issues
-- Source of Truth: PROJECT.md Section 6 & PILOT_ISSUES.md

alter table public.interactions
  add column if not exists turn_kind text null;
