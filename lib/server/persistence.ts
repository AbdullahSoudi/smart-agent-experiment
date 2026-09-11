/**
 * Server-only persistence layer for research experiment sessions and interactions.
 *
 * Source of Truth: PROJECT.md Section 6 & SCENARIO_SPEC.md
 * Architecture Invariant:
 *   - AI evaluates classification + feedback
 *   - Application code deterministically calculates transitions and next_node
 *   - Persistence stores already-decided values
 */

import type { NodeId } from "../scenario";
import type { Classification } from "../transitions";
import { getSupabaseServerClient } from "./supabase";

export interface SessionRecord {
  id: string;
  student_code: string;
  status: string;
  current_node: NodeId;
  scenario_version: string;
  prompt_version: string;
  provider: string;
  model_id: string;
  started_at: string;
  finished_at: string | null;
}

export interface InteractionRecord {
  id: string;
  session_id: string;
  node_id: NodeId;
  student_answer: string | null;
  classification: Classification | null;
  agent_feedback: string | null;
  next_node: NodeId | null;
  decision_time_ms: number | null;
  created_at: string;
}

export interface CreateSessionInput {
  studentCode: string;
  status: string;
  currentNode: NodeId;
  scenarioVersion: string;
  promptVersion: string;
  provider: string;
  modelId: string;
}

export interface RecordInteractionInput {
  sessionId: string;
  nodeId: NodeId;
  studentAnswer?: string | null;
  classification?: Classification | null;
  agentFeedback?: string | null;
  nextNode?: NodeId | null;
  decisionTimeMs?: number | null;
}

export interface UpdateSessionStateInput {
  sessionId: string;
  currentNode?: NodeId;
  status?: string;
  finishedAt?: string | null;
}

/**
 * Creates a new research session row in public.sessions.
 * Database generates id and started_at, leaving finished_at as null.
 */
export async function createSession(
  input: CreateSessionInput
): Promise<SessionRecord> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      student_code: input.studentCode,
      status: input.status,
      current_node: input.currentNode,
      scenario_version: input.scenarioVersion,
      prompt_version: input.promptVersion,
      provider: input.provider,
      model_id: input.modelId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to create session", { cause: error });
  }

  return data as SessionRecord;
}

/**
 * Persists an interaction turn in public.interactions.
 * Supports evaluated turns as well as unconditional and non-evaluated turns.
 */
export async function recordInteraction(
  input: RecordInteractionInput
): Promise<InteractionRecord> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("interactions")
    .insert({
      session_id: input.sessionId,
      node_id: input.nodeId,
      student_answer: input.studentAnswer ?? null,
      classification: input.classification ?? null,
      agent_feedback: input.agentFeedback ?? null,
      next_node: input.nextNode ?? null,
      decision_time_ms: input.decisionTimeMs ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to record interaction", { cause: error });
  }

  return data as InteractionRecord;
}

/**
 * Updates an existing session's current_node, status, and/or finished_at
 * in public.sessions based on already-decided application state.
 */
export async function updateSessionState(
  input: UpdateSessionStateInput
): Promise<SessionRecord> {
  const supabase = getSupabaseServerClient();

  const updatePayload: Record<string, unknown> = {};

  if (input.currentNode !== undefined) {
    updatePayload.current_node = input.currentNode;
  }
  if (input.status !== undefined) {
    updatePayload.status = input.status;
  }
  if (input.finishedAt !== undefined) {
    updatePayload.finished_at = input.finishedAt;
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(updatePayload)
    .eq("id", input.sessionId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to update session state", { cause: error });
  }

  return data as SessionRecord;
}

/**
 * Loads an existing session record by its primary ID.
 * Returns null if the session does not exist.
 */
export async function getSessionById(
  sessionId: string
): Promise<SessionRecord | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load session", { cause: error });
  }

  return data as SessionRecord | null;
}
