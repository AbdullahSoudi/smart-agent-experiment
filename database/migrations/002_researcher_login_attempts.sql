-- Migration 002: Researcher Login Rate Limiting Table
-- Purpose: Serverless-compatible, distributed protection against repeated failed login attempts
-- Target: Neon PostgreSQL (Isolated QA first; Production in rollout order)
-- Invariant: Additive only, no impact on sessions or interactions tables

CREATE TABLE IF NOT EXISTS researcher_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Compound index for fast client-specific time-window queries and pruning
CREATE INDEX IF NOT EXISTS idx_researcher_login_attempts_client_time
  ON researcher_login_attempts (client_hash, attempted_at DESC);
